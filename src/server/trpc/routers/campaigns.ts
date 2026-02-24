import { z } from "zod";
import { orgProcedure, router } from "../init";
import { chaseCampaigns, auditLog } from "@/server/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const campaignsRouter = router({
  list: orgProcedure
    .input(z.object({
      cursor: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const rows = await ctx.db.query.chaseCampaigns.findMany({
        where: input?.cursor
          ? and(
              eq(chaseCampaigns.practiceId, ctx.practiceId),
              gt(chaseCampaigns.id, input.cursor),
            )
          : eq(chaseCampaigns.practiceId, ctx.practiceId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        limit: limit + 1,
      });

      let nextCursor: string | null = null;
      if (rows.length > limit) {
        const next = rows.pop()!;
        nextCursor = next.id;
      }

      return { items: rows, nextCursor };
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.chaseCampaigns.findFirst({
        where: eq(chaseCampaigns.id, input.id),
        with: {
          enrollments: {
            with: { client: true },
          },
        },
      });
    }),

  create: orgProcedure
    .input(z.object({
      name: z.string().min(1),
      taxYear: z.string(),
      taxObligation: z.enum([
        "self_assessment", "corporation_tax", "vat", "paye",
        "mtd_itsa", "confirmation_statement", "annual_accounts",
      ]),
      deadlineDate: z.string().datetime(),
      documentTemplateIds: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.db.insert(chaseCampaigns).values({
        ...input,
        practiceId: ctx.practiceId,
        createdBy: ctx.internalUserId,
        deadlineDate: new Date(input.deadlineDate),
      }).returning();

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "create",
        entityType: "campaign",
        entityId: campaign.id,
        userId: ctx.internalUserId,
        changes: input,
      });

      return campaign;
    }),

  xpmAutoEnroll: orgProcedure
    .input(z.object({
      campaignId: z.string().uuid(),
      enabled: z.boolean(),
      jobCategoryMappings: z.record(z.string(), z.boolean()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.query.chaseCampaigns.findFirst({
        where: and(
          eq(chaseCampaigns.id, input.campaignId),
          eq(chaseCampaigns.practiceId, ctx.practiceId),
        ),
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const [updated] = await ctx.db
        .update(chaseCampaigns)
        .set({
          xpmAutoEnroll: input.enabled,
          ...(input.jobCategoryMappings !== undefined
            ? { xpmJobCategoryMappings: input.jobCategoryMappings }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(chaseCampaigns.id, input.campaignId))
        .returning();

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "update",
        entityType: "campaign",
        entityId: input.campaignId,
        userId: ctx.internalUserId,
        changes: { xpmAutoEnroll: input.enabled, jobCategoryMappings: input.jobCategoryMappings },
      });

      return updated;
    }),
});
