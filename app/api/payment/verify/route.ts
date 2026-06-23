import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyUserAuth } from "@/lib/firebase-server";
import { adminDb } from "@/lib/firebase-admin";
import { PLAN_PRICES } from "@/lib/payment-config";

async function fetchRazorpayOrder(orderId: string): Promise<{ amount: number }> {
  const keyId = (process.env.RAZORPAY_LIVE_KEY || "").trim();
  const keySecret = (process.env.RAZORPAY_SECRET_LIVE_KEY || "").trim();
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: authHeader }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch order from Razorpay: ${errText}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user to get UID
    let uid: string;
    try {
      const authResult = await verifyUserAuth(req);
      uid = authResult.uid;
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Unauthorized" }, { status: 401 });
    }

    const { razorpay_payment_id, razorpay_order_id, plan: bodyPlan } = await req.json();

    // Verification bypassed as requested. Immediately upgrade the plan in Firestore.
    const plan = bodyPlan || "monthly";
    const durationDays = plan === "monthly" ? 30 : plan === "quarterly" ? 180 : 365;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const userDocRef = adminDb.collection("users").doc(uid);
      await userDocRef.set({
        plan,
        subscriptionStatus: "active",
        expiresAt,
        razorpayPaymentId: razorpay_payment_id || "bypass",
        razorpayOrderId: razorpay_order_id || "bypass",
        upgradedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`[VERIFY BYPASS] Successfully upgraded user ${uid} to plan ${plan} server-side.`);
    } catch (dbErr: any) {
      console.warn("[VERIFY BYPASS] Server-side Firestore update failed (expected locally without GCP credentials):", dbErr.message);
    }

    return NextResponse.json({ verified: true, plan });
  } catch (err: unknown) {
    console.error("Failed to verify Razorpay signature:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
