import { z } from "zod";
import { orgProcedure, router } from "../init";
import { clientDocuments } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const documentsRouter = router({
  listByClient: orgProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.clientDocuments.findMany({
        where: and(
          eq(clientDocuments.clientId, input.clientId),
          eq(clientDocuments.practiceId, ctx.orgId),
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
          eq(clientDocuments.practiceId, ctx.orgId),
        ),
        with: { client: true, template: true },
        orderBy: (d, { desc }) => [desc(d.createdAt)],
      });
    }),
});
