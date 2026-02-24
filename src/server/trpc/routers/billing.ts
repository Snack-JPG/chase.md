import { z } from "zod";
import { orgProcedure, router } from "../init";
import { practices, clients, users } from "@/server/db/schema";
import { eq, count } from "drizzle-orm";
import { getPlanFeatures, type PlanName } from "@/server/services/plan-limits";

export const billingRouter = router({
  /** Get current plan, usage stats, and trial info */
  usage: orgProcedure.query(async ({ ctx }) => {
    const practice = await ctx.db.query.practices.findFirst({
      where: eq(practices.id, ctx.practiceId),
    });
    if (!practice) throw new Error("Practice not found");

    const plan = (practice.plan ?? "starter") as PlanName;
    const features = getPlanFeatures(plan);

    const [clientCount] = await ctx.db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.practiceId, ctx.practiceId));

    const [userCount] = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.practiceId, ctx.practiceId));

    const trialEndsAt = practice.trialEndsAt;
    const isOnTrial = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;
    const trialDaysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      plan,
      features,
      usage: {
        clients: clientCount?.count ?? 0,
        users: userCount?.count ?? 0,
      },
      hasSubscription: !!practice.stripeSubscriptionId,
      hasStripeCustomer: !!practice.stripeCustomerId,
      isOnTrial,
      trialDaysRemaining,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
    };
  }),
});
