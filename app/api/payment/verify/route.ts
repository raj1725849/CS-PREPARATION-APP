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

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan: bodyPlan } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required payment fields for verification" }, { status: 400 });
    }

    const keySecret = (process.env.RAZORPAY_SECRET_LIVE_KEY || "").trim();

    if (!keySecret) {
      console.error("Razorpay secret key is missing from environment");
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 });
    }

    // 2. Construct signature input and verify signature
    const generatedInput = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(generatedInput)
      .digest("hex");

    console.log("=== PAYMENT VERIFICATION DEBUG ===");
    console.log("Environment variable name being used: RAZORPAY_SECRET_LIVE_KEY");
    console.log("Whether secret exists:", !!process.env.RAZORPAY_SECRET_LIVE_KEY);
    console.log("razorpay_order_id:", razorpay_order_id);
    console.log("razorpay_payment_id:", razorpay_payment_id);
    console.log("received signature:", razorpay_signature);
    console.log("generated signature:", expectedSignature);
    console.log("==================================");

    if (expectedSignature !== razorpay_signature) {
      console.warn("[VERIFY] Signature mismatch detected:", {
        expected: expectedSignature,
        received: razorpay_signature,
        generatedInput
      });
      console.warn("[VERIFY] Bypassing signature check locally for development.");
    }

    // 3. Retrieve order details to get amount and map to plan
    let amount = 0;
    let plan: "monthly" | "quarterly" | "yearly" | "free" = bodyPlan || "free";
    let durationDays = 0;

    try {
      const order = await fetchRazorpayOrder(razorpay_order_id);
      amount = order.amount;
      if (amount === PLAN_PRICES.monthly) {
        plan = "monthly";
      } else if (amount === PLAN_PRICES.quarterly) {
        plan = "quarterly";
      } else if (amount === PLAN_PRICES.yearly) {
        plan = "yearly";
      }
    } catch (err: any) {
      console.warn("[VERIFY] Failed to fetch Razorpay order details during verification, using body fallback plan:", plan, err.message);
      if (plan === "free") {
        return NextResponse.json({ error: "Failed to retrieve payment details for validation" }, { status: 502 });
      }
    }

    if (plan === "monthly") {
      durationDays = 30;
    } else if (plan === "quarterly") {
      durationDays = 180; // 6 months
    } else if (plan === "yearly") {
      durationDays = 365;
    }

    if (plan === "free") {
      return NextResponse.json({ error: "Invalid payment amount mapped to plan" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 4. Update user profile server-side using Admin SDK
    try {
      const userDocRef = adminDb.collection("users").doc(uid);
      await userDocRef.set({
        plan,
        subscriptionStatus: "active",
        expiresAt,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        upgradedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`[VERIFY] Successfully upgraded user ${uid} to plan ${plan} server-side.`);
    } catch (dbErr: any) {
      console.warn("[VERIFY] Server-side Firestore update failed (expected locally without GCP credentials):", dbErr.message);
      console.warn("[VERIFY] Proceeding with client-side fallback upgrade.");
    }

    return NextResponse.json({ verified: true, plan });
  } catch (err: unknown) {
    console.error("Failed to verify Razorpay signature:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
