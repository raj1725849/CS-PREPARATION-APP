import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required payment fields for verification" }, { status: 400 });
    }

    const keySecret = (process.env.RAZORPAY_SECRET_LIVE_KEY || "").trim();

    if (!keySecret) {
      console.error("Razorpay secret key is missing from environment");
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 });
    }

    // Construct signature input: order_id + "|" + payment_id
    const generatedInput = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    // Hash using HMAC-SHA256 with secret key
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(generatedInput)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      return NextResponse.json({ verified: true });
    } else {
      console.warn("Payment verification failed: signature mismatch");
      return NextResponse.json({ verified: false, error: "Invalid signature" }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("Failed to verify Razorpay signature:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
