import { z } from "zod";
import { orgProcedure, router } from "../init";
import { clientDocuments, documentTemplates } from "@/server/db/schema";
import { eq, and, or } from "drizzle-orm";
import { pushDocumentToXero } from "@/lib/xero-files";

export const documentsRouter = router({
  listTemplates: orgProcedure
    .input(z.object({
      taxObligation: z.string().optional(),
      clientType: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.documentTemplates.findMany({
        where: or(
          eq(documentTemplates.practiceId, ctx.practiceId),
          eq(documentTemplates.isSystem, true),
        ),
        orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
      });

      return rows.filter((t) => {
        if (input?.taxObligation) {
          const obligations = t.applicableTaxObligations as string[] | null;
          if (obligations && obligations.length > 0 && !obligations.includes(input.taxObligation)) {
            return false;
          }
        }
        if (input?.clientType) {
          const types = t.applicableClientTypes as string[] | null;
          if (types && types.length > 0 && !types.includes(input.clientType)) {
            return false;
          }
        }
        return true;
      });
    }),

  listByClient: orgProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.clientDocuments.findMany({
        where: and(
          eq(clientDocuments.clientId, input.clientId),
          eq(clientDocuments.practiceId, ctx.practiceId),
        ),
        with: { template: true },
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });
    }),

  listByCampaign: orgProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.clientDocuments.findMany({
        where: and(
          eq(clientDocuments.campaignId, input.campaignId),
          eq(clientDocuments.practiceId, ctx.practiceId),
        ),
        with: { client: true, template: true },
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });
    }),

  pushToXero: orgProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify document belongs to this practice
      const doc = await ctx.db.query.clientDocuments.findFirst({
        where: and(
          eq(clientDocuments.id, input.documentId),
          eq(clientDocuments.practiceId, ctx.practiceId),
        ),
      });

      if (!doc) throw new Error("Document not found");

      await pushDocumentToXero(input.documentId);
      return { success: true };
    }),

  retryXeroPush: orgProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.query.clientDocuments.findFirst({
        where: and(
          eq(clientDocuments.id, input.documentId),
          eq(clientDocuments.practiceId, ctx.practiceId),
        ),
      });

      if (!doc) throw new Error("Document not found");

      // Reset status to pending so push runs fresh
      await ctx.db
        .update(clientDocuments)
        .set({
          xeroPushStatus: "pending",
          xeroPushError: null,
          updatedAt: new Date(),
        })
        .where(eq(clientDocuments.id, input.documentId));

      await pushDocumentToXero(input.documentId);
      return { success: true };
    }),
});
