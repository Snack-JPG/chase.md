import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.text();
  // TODO: verify Stripe signature, handle subscription events
  console.log("Stripe webhook received");
  return NextResponse.json({ received: true });
}
