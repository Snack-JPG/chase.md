import { orgProcedure, router } from "../init";
import { chaseCampaigns, clientDocuments, chaseMessages, chaseEnrollments, clients } from "@/server/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { subDays } from "date-fns";

export const dashboardRouter = router({
  stats: orgProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const [activeCampaigns] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(chaseCampaigns)
      .where(and(
        eq(chaseCampaigns.practiceId, ctx.practiceId),
        eq(chaseCampaigns.status, "active"),
      ));

    const [docsReceived] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(clientDocuments)
      .where(and(
        eq(clientDocuments.practiceId, ctx.practiceId),
        eq(clientDocuments.status, "uploaded"),
      ));

    const [chasesSent] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(chaseMessages)
      .where(and(
        eq(chaseMessages.practiceId, ctx.practiceId),
        gte(chaseMessages.createdAt, thirtyDaysAgo),
      ));

    const [avgCompletion] = await ctx.db
      .select({ avg: sql<number>`coalesce(avg(${chaseEnrollments.completionPercent}), 0)::int` })
      .from(chaseEnrollments)
      .where(eq(chaseEnrollments.practiceId, ctx.practiceId));

    return {
      activeCampaigns: activeCampaigns?.count ?? 0,
      docsReceived: docsReceived?.count ?? 0,
      chasesSent30d: chasesSent?.count ?? 0,
      avgCompletionRate: avgCompletion?.avg ?? 0,
    };
  }),

  recentCampaigns: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.query.chaseCampaigns.findMany({
      where: eq(chaseCampaigns.practiceId, ctx.practiceId),
      orderBy: desc(chaseCampaigns.createdAt),
      limit: 5,
    });
  }),

  recentActivity: orgProcedure.query(async ({ ctx }) => {
    // Recent messages (last 10)
    const messages = await ctx.db.query.chaseMessages.findMany({
      where: eq(chaseMessages.practiceId, ctx.practiceId),
      orderBy: desc(chaseMessages.createdAt),
      limit: 10,
      with: { client: true },
    });

    // Recent uploads (last 10)
    const uploads = await ctx.db.query.clientDocuments.findMany({
      where: and(
        eq(clientDocuments.practiceId, ctx.practiceId),
        eq(clientDocuments.status, "uploaded"),
      ),
      orderBy: desc(clientDocuments.createdAt),
      limit: 10,
      with: { client: true },
    });

    const activity = [
      ...messages.map((m) => ({
        type: "chase_sent" as const,
        clientName: `${m.client.firstName} ${m.client.lastName}`,
        description: `Chase sent via ${m.channel}`,
        time: m.createdAt,
      })),
      ...uploads.map((d) => ({
        type: "doc_uploaded" as const,
        clientName: `${d.client.firstName} ${d.client.lastName}`,
        description: `Uploaded ${d.fileName}`,
        time: d.createdAt,
      })),
    ];

    activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return activity.slice(0, 10);
  }),

  clientsNeedingAttention: orgProcedure.query(async ({ ctx }) => {
    // Enrollments with 3+ chases that are still active
    const enrollments = await ctx.db.query.chaseEnrollments.findMany({
      where: and(
        eq(chaseEnrollments.practiceId, ctx.practiceId),
        eq(chaseEnrollments.status, "active"),
        gte(chaseEnrollments.chasesDelivered, 3),
      ),
      with: { client: true, campaign: true },
      orderBy: desc(chaseEnrollments.chasesDelivered),
      limit: 10,
    });

    return enrollments.map((e) => ({
      clientId: e.clientId,
      clientName: `${e.client.firstName} ${e.client.lastName}`,
      campaignName: e.campaign.name,
      chasesDelivered: e.chasesDelivered,
      escalationLevel: e.currentEscalationLevel,
    }));
  }),
});
