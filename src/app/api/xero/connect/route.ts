import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getXeroClient } from "@/lib/xero";

export async function GET() {
  const session = await auth();
  if (!session.userId || !session.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const xero = getXeroClient();
  const consentUrl = await xero.buildConsentUrl();

  return NextResponse.redirect(consentUrl);
}
