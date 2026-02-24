import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { practices } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, PRICE_IDS } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { priceId } = await req.json();

  // Validate price ID
  const validPrices = Object.values(PRICE_IDS);
  if (!priceId || !validPrices.includes(priceId)) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const practice = await db.query.practices.findFirst({
    where: eq(practices.clerkOrgId, orgId),
  });
  if (!practice) {
    return NextResponse.json({ error: "Practice not found" }, { status: 404 });
  }

  // If already subscribed, don't allow new checkout
  if (practice.stripeSubscriptionId) {
    return NextResponse.json({ error: "Already subscribed. Use billing portal to change plan." }, { status: 400 });
  }

  const session = await createCheckoutSession({
    priceId,
    practiceId: practice.id,
    customerEmail: practice.email,
    stripeCustomerId: practice.stripeCustomerId,
  });

  return NextResponse.json({ url: session.url });
}
