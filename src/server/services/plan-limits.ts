import { db } from "@/server/db";
import { practices, clients, users } from "@/server/db/schema";
import { eq, and, count } from "drizzle-orm";

export type PlanName = "starter" | "professional" | "scale";

export type PlanFeature =
  | "max_users"
  | "max_clients"
  | "channel_whatsapp"
  | "channel_sms"
  | "xero_integration"
  | "api_access"
  | "priority_support";

interface PlanLimits {
  max_users: number;
  max_clients: number;
  channel_whatsapp: boolean;
  channel_sms: boolean;
  xero_integration: boolean;
  api_access: boolean;
  priority_support: boolean;
}

const PLAN_FEATURES: Record<PlanName, PlanLimits> = {
  starter: {
    max_users: 1,
    max_clients: 50,
    channel_whatsapp: false,
    channel_sms: false,
    xero_integration: false,
    api_access: false,
    priority_support: false,
  },
  professional: {
    max_users: 5,
    max_clients: 200,
    channel_whatsapp: true,
    channel_sms: true,
    xero_integration: true,
    api_access: false,
    priority_support: true,
  },
  scale: {
    max_users: Infinity,
    max_clients: Infinity,
    channel_whatsapp: true,
    channel_sms: true,
    xero_integration: true,
    api_access: true,
    priority_support: true,
  },
};

export function getPlanFeatures(plan: PlanName): PlanLimits {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter;
}

export async function checkPlanLimit(
  practiceId: string,
  feature: PlanFeature,
): Promise<{ allowed: boolean; limit: number; current: number; plan: PlanName }> {
  const practice = await db.query.practices.findFirst({
    where: eq(practices.id, practiceId),
  });
  if (!practice) {
    return { allowed: false, limit: 0, current: 0, plan: "starter" };
  }

  const plan = (practice.plan ?? "starter") as PlanName;
  const features = getPlanFeatures(plan);

  // Boolean features
  if (typeof features[feature] === "boolean") {
    return {
      allowed: features[feature] as boolean,
      limit: features[feature] ? 1 : 0,
      current: 0,
      plan,
    };
  }

  // Numeric features
  if (feature === "max_clients") {
    const [result] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.practiceId, practiceId));
    const current = result?.count ?? 0;
    const limit = features.max_clients;
    return { allowed: current < limit, limit, current, plan };
  }

  if (feature === "max_users") {
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.practiceId, practiceId));
    const current = result?.count ?? 0;
    const limit = features.max_users;
    return { allowed: current < limit, limit, current, plan };
  }

  return { allowed: true, limit: Infinity, current: 0, plan };
}

/**
 * Quick boolean check — throws nothing, just returns true/false
 */
export async function canUseFeature(practiceId: string, feature: PlanFeature): Promise<boolean> {
  const result = await checkPlanLimit(practiceId, feature);
  return result.allowed;
}
