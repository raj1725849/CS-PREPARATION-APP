import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyUserAuth } from "@/lib/firebase-server";
import { adminDb } from "@/lib/firebase-admin";

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
    const plan = bodyPlan || "monthly";

    // 2. Verify Razorpay Signature
    const secret = process.env.RAZORPAY_SECRET_LIVE_KEY || "";
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 3. Update Firestore using Admin SDK
    const durationMonths = plan === "monthly" ? 1 : plan === "quarterly" ? 6 : 12;
    const expiresAtDate = new Date();
    expiresAtDate.setMonth(expiresAtDate.getMonth() + durationMonths);
    const expiresAt = expiresAtDate.toISOString();

    const now = new Date().toISOString();

    try {
      const userDocRef = adminDb.collection("users").doc(uid);
      await userDocRef.set({
        plan,
        subscriptionStatus: "active",
        expiresAt,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        upgradedAt: now,
        updatedAt: now
      }, { merge: true });

      console.log(`[PAYMENT VERIFIED] Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}, UID: ${uid}, Plan: ${plan}, Success: true, Timestamp: ${now}`);

      return NextResponse.json({ success: true, verified: true, upgraded: true });
    } catch (dbErr: any) {
      console.error(`[PAYMENT ERROR] Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}, UID: ${uid}, Plan: ${plan}, Success: false, Timestamp: ${now}`);
      console.error("Firestore update failed:", dbErr.message);
      return NextResponse.json({ success: false, verified: true, upgraded: false, error: "Firestore update failed" });
    }
  } catch (err: unknown) {
    console.error("Failed to verify Razorpay signature:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
