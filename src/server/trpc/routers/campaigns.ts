import { z } from "zod";
import { orgProcedure, router } from "../init";
import { chaseCampaigns } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const campaignsRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.query.chaseCampaigns.findMany({
      where: eq(chaseCampaigns.practiceId, ctx.orgId),
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });
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
      // TODO: resolve createdBy from clerk userId → users table
      const [campaign] = await ctx.db.insert(chaseCampaigns).values({
        ...input,
        practiceId: ctx.orgId,
        createdBy: ctx.userId, // temporary — should be internal user ID
        deadlineDate: new Date(input.deadlineDate),
      }).returning();
      return campaign;
    }),
});
