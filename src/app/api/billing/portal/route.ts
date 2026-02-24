import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { practices } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const practice = await db.query.practices.findFirst({
    where: eq(practices.clerkOrgId, orgId),
  });
  if (!practice) {
    return NextResponse.json({ error: "Practice not found" }, { status: 404 });
  }

  if (!practice.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found. Please subscribe first." }, { status: 400 });
  }

  const session = await createBillingPortalSession({
    stripeCustomerId: practice.stripeCustomerId,
  });

  return NextResponse.json({ url: session.url });
}
