import { NextResponse } from "next/server";

export async function GET() {
  const key = (process.env.RAZORPAY_LIVE_KEY || "").trim();
  return NextResponse.json({ key });
}
