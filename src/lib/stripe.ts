import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}

export const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
  scale: process.env.STRIPE_PRICE_SCALE!,
} as const;

export const PLAN_FROM_PRICE: Record<string, "starter" | "professional" | "scale"> = {
  [process.env.STRIPE_PRICE_STARTER!]: "starter",
  [process.env.STRIPE_PRICE_PROFESSIONAL!]: "professional",
  [process.env.STRIPE_PRICE_SCALE!]: "scale",
};

export async function createCheckoutSession({
  priceId,
  practiceId,
  customerEmail,
  stripeCustomerId,
}: {
  priceId: string;
  practiceId: string;
  customerEmail?: string;
  stripeCustomerId?: string | null;
}) {
  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chase.md";

  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { practiceId },
    },
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : { customer_email: customerEmail }),
    metadata: { practiceId },
    success_url: `${baseUrl}/dashboard/settings?billing=success`,
    cancel_url: `${baseUrl}/dashboard/settings?billing=cancelled`,
    allow_promotion_codes: true,
  });
}

export async function createBillingPortalSession({
  stripeCustomerId,
}: {
  stripeCustomerId: string;
}) {
  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chase.md";

  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl}/dashboard/settings`,
  });
}
