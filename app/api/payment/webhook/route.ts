import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { PLAN_PRICES } from "@/lib/payment-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.warn("[WEBHOOK] Signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      console.warn("[WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not configured. Skipping signature verification in development.");
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const notes = payment.notes || {};
      const uid = notes.userId;
      
      const razorpayPaymentId = payment.id;
      const razorpayOrderId = payment.order_id;
      const amount = payment.amount;

      if (!uid) {
        console.warn(`[WEBHOOK] payment.captured received without notes.userId. Order ID: ${razorpayOrderId}`);
        return NextResponse.json({ received: true, status: "ignored_missing_user_id" });
      }

      let plan: "monthly" | "quarterly" | "yearly" | "free" = "free";
      let durationDays = 0;

      if (amount === PLAN_PRICES.monthly) {
        plan = "monthly";
        durationDays = 30;
      } else if (amount === PLAN_PRICES.quarterly) {
        plan = "quarterly";
        durationDays = 180;
      } else if (amount === PLAN_PRICES.yearly) {
        plan = "yearly";
        durationDays = 365;
      }

      if (plan === "free") {
        console.warn(`[WEBHOOK] Unrecognized payment amount: ${amount}`);
        return NextResponse.json({ error: "Invalid payment amount mapped to plan" }, { status: 400 });
      }

      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // Update Firestore using Admin SDK
      const adminDb = getAdminDb();
      const userDocRef = adminDb.collection("users").doc(uid);
      await userDocRef.set({
        plan,
        subscriptionStatus: "active",
        expiresAt,
        razorpayPaymentId,
        razorpayOrderId,
        upgradedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`[WEBHOOK] Successfully processed payment.captured for user ${uid} and upgraded to ${plan}.`);
      return NextResponse.json({ received: true, status: "upgraded", plan });
    }

    return NextResponse.json({ received: true, event: event.event });
  } catch (err: any) {
    console.error("[WEBHOOK] Error handling Razorpay webhook:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
