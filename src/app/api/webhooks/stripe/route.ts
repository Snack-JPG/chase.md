import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/server/db";
import { practices } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getStripe, PLAN_FROM_PRICE } from "@/lib/stripe";

function planFromPriceId(priceId: string): "starter" | "professional" | "scale" {
  return PLAN_FROM_PRICE[priceId] ?? "starter";
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const practiceId = session.metadata?.practiceId;

        if (session.subscription && session.customer && practiceId) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = sub.items.data[0]?.price?.id ?? "";

          await db.update(practices)
            .set({
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              plan: planFromPriceId(priceId),
              trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
              updatedAt: new Date(),
            })
            .where(eq(practices.id, practiceId));
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id ?? "";

        await db.update(practices)
          .set({
            plan: planFromPriceId(priceId),
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
            updatedAt: new Date(),
          })
          .where(eq(practices.stripeSubscriptionId, sub.id));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.update(practices)
          .set({
            plan: "starter",
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(eq(practices.stripeSubscriptionId, sub.id));
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Fires 3 days before trial ends
        const sub = event.data.object as Stripe.Subscription;
        const practice = await db.query.practices.findFirst({
          where: eq(practices.stripeSubscriptionId, sub.id),
        });

        if (practice) {
          // TODO: Send trial ending email via Resend
          console.log(`Trial ending soon for practice ${practice.id} (${practice.name})`);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Stripe webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
