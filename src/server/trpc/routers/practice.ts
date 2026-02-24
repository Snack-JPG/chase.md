import { z } from "zod";
import { orgProcedure, router } from "../init";
import { practices, auditLog, xeroConnections } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const practiceRouter = router({
  get: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.query.practices.findFirst({
      where: eq(practices.id, ctx.practiceId),
    });
  }),

  update: orgProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      defaultChaseChannel: z.enum(["email", "whatsapp", "sms"]).optional(),
      timezone: z.string().optional(),
      businessHoursStart: z.string().optional(),
      businessHoursEnd: z.string().optional(),
      primaryColor: z.string().optional(),
      fromEmailName: z.string().optional(),
      twilioWhatsappNumber: z.string().optional(),
      whatsappOptInMessage: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db.update(practices)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(practices.id, ctx.practiceId))
        .returning();

      // Audit log
      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "update",
        entityType: "practice",
        entityId: ctx.practiceId,
        userId: ctx.internalUserId,
        changes: input,
      });

      return updated;
    }),

  xeroStatus: orgProcedure.query(async ({ ctx }) => {
    const connection = await ctx.db.query.xeroConnections.findFirst({
      where: and(
        eq(xeroConnections.practiceId, ctx.practiceId),
        eq(xeroConnections.status, "active"),
      ),
    });

    if (!connection) {
      return { connected: false as const };
    }

    return {
      connected: true as const,
      tenantName: connection.xeroTenantName,
      connectedAt: connection.connectedAt,
      webhookKeySet: !!connection.xeroWebhookKey,
    };
  }),

  saveWebhookKey: orgProcedure
    .input(z.object({ webhookKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(xeroConnections)
        .set({
          xeroWebhookKey: input.webhookKey,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(xeroConnections.practiceId, ctx.practiceId),
            eq(xeroConnections.status, "active"),
          ),
        )
        .returning();

      if (!updated) throw new Error("No active Xero connection found");

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "update",
        entityType: "xero_connection",
        entityId: updated.id,
        userId: ctx.internalUserId,
        changes: { webhookKeySet: true },
      });

      return { success: true };
    }),
});
