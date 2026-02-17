import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { syncAllPractices } from "@/lib/xero-sync";
import { pushPendingDocuments } from "@/lib/xero-files";
import { syncAllXpmJobs } from "@/lib/xero-xpm";
import { processXpmAutoEnrollments } from "@/lib/xpm-campaign-trigger";
import { db } from "@/server/db";
import { xeroConnections } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

function getReceiver() {
  return new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  });
}

/**
 * Xero contact sync cron — called daily by QStash.
 * Syncs all practices with active Xero connections.
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
    const results = await syncAllPractices();

    // Also push any pending documents to Xero (fallback for failed real-time pushes)
    const pushResults = await pushPendingDocuments();

    // XPM job sync (only for practices with xpmEnabled=true)
    let xpmResults: Record<string, unknown> = {};
    const xpmEnrollResults: Record<string, unknown> = {};
    try {
      xpmResults = await syncAllXpmJobs();

      // After syncing jobs, process auto-enrollments
      const xpmConnections = await db.query.xeroConnections.findMany({
        where: and(
          eq(xeroConnections.status, "active"),
          eq(xeroConnections.xpmEnabled, true),
        ),
      });

      for (const conn of xpmConnections) {
        try {
          xpmEnrollResults[conn.practiceId] = await processXpmAutoEnrollments(conn.practiceId);
        } catch (err) {
          xpmEnrollResults[conn.practiceId] = {
            error: err instanceof Error ? err.message : "Unknown",
          };
        }
      }
    } catch (err) {
      xpmResults = { error: err instanceof Error ? err.message : "XPM sync failed" };
    }

    return NextResponse.json({
      success: true,
      results,
      xeroPush: pushResults,
      xpmSync: xpmResults,
      xpmEnrollments: xpmEnrollResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Xero sync cron error:", error);
    return NextResponse.json(
      { error: "Xero sync failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    );
  }
}
