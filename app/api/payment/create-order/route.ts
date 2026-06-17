import { NextRequest, NextResponse } from "next/server";

const PLAN_PRICES: Record<string, number> = {
  monthly: 69900,     // ₹699 in paise
  quarterly: 319900,   // ₹3,199 in paise (6-Month Plan)
  yearly: 649900      // ₹6,499 in paise (Annual Plan)
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ error: "Invalid plan type specified" }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];
    const keyId = (process.env.RAZORPAY_LIVE_KEY || "").trim();
    const keySecret = (process.env.RAZORPAY_SECRET_LIVE_KEY || "").trim();

    if (!keyId || !keySecret) {
      console.error("Razorpay keys are missing from environment");
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Razorpay Order API failed:", errorText);
      return NextResponse.json({ error: "Failed to create order with payment gateway" }, { status: 502 });
    }

    const order = await response.json();
    return NextResponse.json({ order });
  } catch (err: unknown) {
    console.error("Failed to create Razorpay order:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
