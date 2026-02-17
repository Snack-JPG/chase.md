import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { chaseMessages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import twilio from "twilio";

const authToken = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(req: Request) {
  const body = await req.formData();

  // Validate Twilio signature
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const url = req.url;
  const params: Record<string, string> = {};
  body.forEach((value, key) => {
    params[key] = value.toString();
  });

  const isValid = twilio.validateRequest(authToken, signature, url, params);
  if (!isValid) {
    console.error("Twilio webhook signature validation failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const messageSid = params.MessageSid || params.SmsSid;
  const messageStatus = params.MessageStatus;

  if (!messageSid || !messageStatus) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Map Twilio status to our status
  const statusMap: Record<string, { status: string; field?: string }> = {
    sent: { status: "sent", field: "sentAt" },
    delivered: { status: "delivered", field: "deliveredAt" },
    read: { status: "read", field: "readAt" },
    failed: { status: "failed", field: "failedAt" },
    undelivered: { status: "failed", field: "failedAt" },
  };

  const mapped = statusMap[messageStatus];
  if (mapped) {
    const update: Record<string, unknown> = {
      status: mapped.status,
    };
    if (mapped.field) {
      update[mapped.field] = new Date();
    }
    if (mapped.status === "failed") {
      update.failureReason = params.ErrorMessage || `Twilio status: ${messageStatus}`;
    }

    await db.update(chaseMessages)
      .set(update)
      .where(eq(chaseMessages.externalMessageId, messageSid));
  }

  return NextResponse.json({ received: true });
}
