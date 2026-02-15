import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  // TODO: sync Clerk user/org events to practices + users tables
  console.log("Clerk webhook:", body.type);
  return NextResponse.json({ received: true });
}
