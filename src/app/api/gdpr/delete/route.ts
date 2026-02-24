/**
 * GDPR Right to Erasure — Anonymize client data
 * POST /api/gdpr/delete { clientId }
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { practices, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { anonymizeClientData } from "@/server/services/gdpr-consent";
import { logDataDeletion } from "@/server/services/audit-logger";

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId } = await req.json();
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const practice = await db.query.practices.findFirst({
    where: eq(practices.clerkOrgId, orgId),
  });
  if (!practice) {
    return NextResponse.json({ error: "Practice not found" }, { status: 404 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  const result = await anonymizeClientData(clientId, practice.id);

  await logDataDeletion({
    practiceId: practice.id,
    clientId,
    userId: user?.id ?? "",
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ success: true, ...result });
}
