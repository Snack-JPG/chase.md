import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { practices, xeroConnections } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { revokeToken, deleteTenantConnection } from "@/lib/xero";

export async function POST() {
  const session = await auth();
  if (!session.userId || !session.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const practice = await db.query.practices.findFirst({
    where: eq(practices.clerkOrgId, session.orgId),
  });
  if (!practice) {
    return NextResponse.json({ error: "Practice not found" }, { status: 404 });
  }

  const connection = await db.query.xeroConnections.findFirst({
    where: eq(xeroConnections.practiceId, practice.id),
  });
  if (!connection) {
    return NextResponse.json({ error: "No Xero connection found" }, { status: 404 });
  }

  try {
    // Revoke the refresh token at Xero
    await revokeToken(connection.refreshToken);

    // Also delete the tenant connection
    try {
      await deleteTenantConnection(connection.accessToken, connection.connectionId);
    } catch {
      // Best effort — token may already be expired
    }
  } catch {
    // Best effort — still mark as disconnected locally
  }

  // Mark as revoked
  await db.update(xeroConnections)
    .set({
      status: "revoked",
      disconnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(xeroConnections.id, connection.id));

  return NextResponse.json({ success: true });
}
