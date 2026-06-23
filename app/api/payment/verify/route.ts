import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyUserAuth } from "@/lib/firebase-server";
import { adminDb } from "@/lib/firebase-admin";

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

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

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

    if (expectedSignature !== razorpay_signature) {
      console.warn("Payment verification failed: signature mismatch");
      return NextResponse.json({ verified: false, error: "Invalid signature" }, { status: 400 });
    }

    // 3. Retrieve order details to get amount and map to plan
    let amount = 0;
    try {
      const order = await fetchRazorpayOrder(razorpay_order_id);
      amount = order.amount;
    } catch (err: any) {
      console.error("Failed to fetch Razorpay order details during verification:", err);
      return NextResponse.json({ error: "Failed to retrieve payment details for validation" }, { status: 502 });
    }

    let plan: "monthly" | "quarterly" | "yearly" | "free" = "free";
    let durationDays = 0;

    if (amount === 69900) {
      plan = "monthly";
      durationDays = 30;
    } else if (amount === 319900) {
      plan = "quarterly";
      durationDays = 180; // 6 months
    } else if (amount === 649900) {
      plan = "yearly";
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
      return NextResponse.json({ verified: true, plan });
    } catch (dbErr: any) {
      console.error("Server-side Firestore update failed during payment verification:", dbErr);
      return NextResponse.json({ error: "Payment verified but profile upgrade failed. Please contact support." }, { status: 500 });
    }
  } catch (err: unknown) {
    console.error("Failed to verify Razorpay signature:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
