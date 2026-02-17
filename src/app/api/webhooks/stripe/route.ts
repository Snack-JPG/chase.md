import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/server/db";
import { practices, auditLog } from "@/server/db/schema";
import { eq } from "drizzle-orm";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
}

const PLAN_MAP: Record<string, "starter" | "professional" | "scale"> = {
  price_starter: "starter",
  price_professional: "professional",
  price_scale: "scale",
};

function planFromPriceId(priceId: string): "starter" | "professional" | "scale" {
  return PLAN_MAP[priceId] ?? "starter";
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
        if (session.subscription && session.customer) {
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
            .where(eq(practices.stripeCustomerId, session.customer as string));
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
    }
  } catch (err) {
    console.error(`Stripe webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
