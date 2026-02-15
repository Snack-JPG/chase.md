import { NextResponse } from "next/server";
import { runChaseTick } from "@/server/services/chase-engine";
import { dispatchQueuedMessages } from "@/server/services/message-dispatcher";

/**
 * Chase cron endpoint — called by QStash every 15 minutes during business hours.
 *
 * POST /api/cron/chase
 * Authorization: Bearer <QSTASH_CURRENT_SIGNING_KEY>
 */
export async function POST(req: Request) {
  // Verify QStash signature
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.QSTASH_TOKEN;

  if (!authHeader || !expectedToken) {
    // In production, use proper QStash signature verification
    // For now, simple bearer token check
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Step 1: Find due enrollments and create chase messages
    const chaseResult = await runChaseTick();

    // Step 2: Dispatch all queued messages
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
