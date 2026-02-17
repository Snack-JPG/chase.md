import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { syncAllPractices } from "@/lib/xero-sync";
import { pushPendingDocuments } from "@/lib/xero-files";

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

    return NextResponse.json({
      success: true,
      results,
      xeroPush: pushResults,
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
