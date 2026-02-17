import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type TRPCContext } from "./context";
import { practices, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No practice selected" });
  }

  // Resolve Clerk org ID → internal practice UUID
  const practice = await ctx.db.query.practices.findFirst({
    where: eq(practices.clerkOrgId, ctx.orgId),
  });
  if (!practice) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Practice not found for this organisation" });
  }

  // Resolve Clerk user ID → internal user UUID
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.clerkUserId, ctx.userId),
  });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found. Please complete onboarding." });
  }

  return next({
    ctx: {
      ...ctx,
      orgId: ctx.orgId,
      practiceId: practice.id,
      internalUserId: user.id,
    },
  });
});
