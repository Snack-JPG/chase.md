import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { runChaseTick } from "@/server/services/chase-engine";
import { dispatchQueuedMessages } from "@/server/services/message-dispatcher";

function getReceiver() {
  return new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  });
}

/**
 * Chase cron endpoint — called by QStash every 15 minutes during business hours.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("upstash-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    await getReceiver().verify({ signature, body });
  } catch {
    return NextResponse.json({ error: "Invalid QStash signature" }, { status: 401 });
  }

  try {
    const chaseResult = await runChaseTick();
    const dispatchResult = await dispatchQueuedMessages();

    return NextResponse.json({
      success: true,
      chases: chaseResult,
      dispatched: dispatchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chase cron error:", error);
    return NextResponse.json(
      { error: "Chase cron failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
