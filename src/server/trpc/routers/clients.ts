import { z } from "zod";
import { orgProcedure, router } from "../init";
import { clients, auditLog, xeroConnections, xpmJobs } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { syncContacts } from "@/lib/xero-sync";

export const clientsRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.db.query.clients.findMany({
      where: eq(clients.practiceId, ctx.practiceId),
      orderBy: (clients, { asc }) => [asc(clients.lastName)],
    });
  }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.clients.findFirst({
        where: and(
          eq(clients.id, input.id),
          eq(clients.practiceId, ctx.practiceId),
        ),
        with: {
          documents: true,
          enrollments: true,
        },
      });
    }),

  create: orgProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      whatsappPhone: z.string().optional(),
      companyName: z.string().optional(),
      clientType: z.enum(["sole_trader", "limited_company", "partnership", "llp", "trust", "individual"]),
      utr: z.string().max(10).optional(),
      companyNumber: z.string().max(8).optional(),
      vatNumber: z.string().max(12).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [client] = await ctx.db.insert(clients).values({
        ...input,
        practiceId: ctx.practiceId,
      }).returning();

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "create",
        entityType: "client",
        entityId: client.id,
        userId: ctx.internalUserId,
        changes: input,
      });

      return client;
    }),

  syncFromXero: orgProcedure.mutation(async ({ ctx }) => {
    const stats = await syncContacts(ctx.practiceId);

    await ctx.db.insert(auditLog).values({
      practiceId: ctx.practiceId,
      action: "bulk_action",
      entityType: "client",
      userId: ctx.internalUserId,
      changes: { type: "xero_sync", ...stats },
    });

    return stats;
  }),

  lastSyncStatus: orgProcedure.query(async ({ ctx }) => {
    const connection = await ctx.db.query.xeroConnections.findFirst({
      where: and(
        eq(xeroConnections.practiceId, ctx.practiceId),
        eq(xeroConnections.status, "active"),
      ),
    });

    if (!connection) return null;

    // Get last sync audit log entry
    const lastSync = await ctx.db.query.auditLog.findFirst({
      where: and(
        eq(auditLog.practiceId, ctx.practiceId),
        eq(auditLog.entityType, "client"),
        eq(auditLog.action, "bulk_action"),
      ),
      orderBy: (log, { desc }) => [desc(log.createdAt)],
    });

    return {
      connected: true,
      orgName: connection.xeroTenantName,
      lastSyncAt: lastSync?.createdAt ?? null,
      lastSyncStats: lastSync?.changes ?? null,
    };
  }),

  bulkCreate: orgProcedure
    .input(z.object({
      clients: z.array(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        companyName: z.string().optional(),
        clientType: z.enum(["sole_trader", "limited_company", "partnership", "llp", "trust", "individual"]).default("individual"),
      })).min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Get existing emails for dedup
      const existing = await ctx.db.query.clients.findMany({
        where: eq(clients.practiceId, ctx.practiceId),
        columns: { email: true },
      });
      const existingEmails = new Set(
        existing.map((c) => c.email?.toLowerCase()).filter(Boolean)
      );

      const toInsert = [];
      for (const client of input.clients) {
        const email = client.email?.toLowerCase();
        if (email && existingEmails.has(email)) {
          skipped++;
          continue;
        }
        if (email) existingEmails.add(email);
        toInsert.push({
          ...client,
          email: email || null,
          practiceId: ctx.practiceId,
        });
      }

      if (toInsert.length > 0) {
        await ctx.db.insert(clients).values(toInsert);
        created = toInsert.length;
      }

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "bulk_action",
        entityType: "client",
        userId: ctx.internalUserId,
        changes: { type: "csv_import", created, skipped },
      });

      return { created, skipped, errors };
    }),

  xpmJobs: orgProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify client belongs to practice
      const client = await ctx.db.query.clients.findFirst({
        where: and(
          eq(clients.id, input.clientId),
          eq(clients.practiceId, ctx.practiceId),
        ),
      });

      if (!client) return [];

      return ctx.db.query.xpmJobs.findMany({
        where: and(
          eq(xpmJobs.clientId, input.clientId),
          eq(xpmJobs.practiceId, ctx.practiceId),
        ),
        orderBy: (j, { desc }) => [desc(j.updatedAt)],
      });
    }),
});
