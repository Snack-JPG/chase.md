import { z } from "zod";
import { orgProcedure, router } from "../init";
import { clientDocuments } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { pushDocumentToXero } from "@/lib/xero-files";

export const documentsRouter = router({
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
