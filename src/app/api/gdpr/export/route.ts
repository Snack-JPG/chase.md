/**
 * GDPR Data Export (Subject Access Request)
 * POST /api/gdpr/export { clientId }
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { practices, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { exportClientData } from "@/server/services/gdpr-consent";
import { logDataExport } from "@/server/services/audit-logger";

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

  const data = await exportClientData(clientId, practice.id);
  if (!data) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await logDataExport({
    practiceId: practice.id,
    clientId,
    userId: user?.id ?? "",
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gdpr-export-${clientId.slice(0, 8)}-${Date.now()}.json"`,
    },
  });
}
