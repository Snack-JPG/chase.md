import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.formData();
  const messageSid = body.get("MessageSid");
  const messageStatus = body.get("MessageStatus");

  // TODO: update chase_messages status based on webhook
  console.log(`Twilio webhook: ${messageSid} → ${messageStatus}`);

  return NextResponse.json({ received: true });
}
