import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { orgProcedure, router } from "../init";
import { chaseCampaigns, chaseEnrollments, auditLog } from "@/server/db/schema";
import { eq, and, gt, inArray } from "drizzle-orm";
import { calculateNextChaseDate, getOrCreateMagicLink } from "@/server/services/chase-engine";

const campaignInput = z.object({
  name: z.string().min(1),
  taxYear: z.string(),
  taxObligation: z.enum([
    "self_assessment", "corporation_tax", "vat", "paye",
    "mtd_itsa", "confirmation_statement", "annual_accounts",
  ]),
  deadlineDate: z.string().datetime(),
  description: z.string().optional(),
  documentTemplateIds: z.array(z.string().uuid()).optional(),
  maxChases: z.number().int().min(1).max(20).optional(),
  chaseDaysBetween: z.number().int().min(1).max(90).optional(),
  escalateAfterChase: z.number().int().min(1).max(20).optional(),
  channels: z.array(z.enum(["email", "whatsapp", "sms"])).min(1).optional(),
  gracePeriodDays: z.number().int().min(0).max(90).optional(),
  skipWeekends: z.boolean().optional(),
  skipBankHolidays: z.boolean().optional(),
  clientIds: z.array(z.string().uuid()).optional(),
  status: z.enum(["draft", "active"]).optional(),
});

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
      const campaign = await ctx.db.query.chaseCampaigns.findFirst({
        where: and(
          eq(chaseCampaigns.id, input.id),
          eq(chaseCampaigns.practiceId, ctx.practiceId),
        ),
        with: {
          enrollments: {
            with: { client: true },
            orderBy: (e, { asc }) => [asc(e.createdAt)],
          },
        },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      return campaign;
    }),

  create: orgProcedure
    .input(campaignInput)
    .mutation(async ({ ctx, input }) => {
      const { clientIds, status: requestedStatus, ...campaignFields } = input;
      const isActive = requestedStatus === "active";

      const [campaign] = await ctx.db.insert(chaseCampaigns).values({
        ...campaignFields,
        practiceId: ctx.practiceId,
        createdBy: ctx.internalUserId,
        deadlineDate: new Date(campaignFields.deadlineDate),
        status: isActive ? "active" : "draft",
        startDate: isActive ? new Date() : null,
        totalEnrollments: clientIds?.length ?? 0,
      }).returning();

      // Enroll clients if provided
      if (clientIds && clientIds.length > 0) {
        const enrollmentValues = clientIds.map((clientId) => ({
          practiceId: ctx.practiceId,
          campaignId: campaign.id,
          clientId,
          status: isActive ? "active" as const : "pending" as const,
          requiredDocumentIds: campaignFields.documentTemplateIds ?? [],
          nextChaseAt: isActive
            ? calculateNextChaseDate(
                new Date(),
                campaignFields.chaseDaysBetween ?? 7,
                campaignFields.skipWeekends ?? true,
                "09:00",
                "17:30",
              )
            : null,
        }));

        await ctx.db.insert(chaseEnrollments).values(enrollmentValues);

        // Create magic links for all enrollments
        const enrollments = await ctx.db.query.chaseEnrollments.findMany({
          where: eq(chaseEnrollments.campaignId, campaign.id),
        });
        for (const enrollment of enrollments) {
          await getOrCreateMagicLink(ctx.practiceId, enrollment.clientId, enrollment.id);
        }
      }

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "create",
        entityType: "campaign",
        entityId: campaign.id,
        userId: ctx.internalUserId,
        changes: { ...input, enrolledClients: clientIds?.length ?? 0 },
      });

      return campaign;
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      deadlineDate: z.string().datetime().optional(),
      maxChases: z.number().int().min(1).max(20).optional(),
      chaseDaysBetween: z.number().int().min(1).max(90).optional(),
      escalateAfterChase: z.number().int().min(1).max(20).optional(),
      channels: z.array(z.enum(["email", "whatsapp", "sms"])).min(1).optional(),
      gracePeriodDays: z.number().int().min(0).max(90).optional(),
      skipWeekends: z.boolean().optional(),
      skipBankHolidays: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const campaign = await ctx.db.query.chaseCampaigns.findFirst({
        where: and(
          eq(chaseCampaigns.id, id),
          eq(chaseCampaigns.practiceId, ctx.practiceId),
        ),
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      if (campaign.status !== "draft" && campaign.status !== "paused") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only draft or paused campaigns can be edited" });
      }

      const setFields: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.name !== undefined) setFields.name = updates.name;
      if (updates.description !== undefined) setFields.description = updates.description;
      if (updates.deadlineDate !== undefined) setFields.deadlineDate = new Date(updates.deadlineDate);
      if (updates.maxChases !== undefined) setFields.maxChases = updates.maxChases;
      if (updates.chaseDaysBetween !== undefined) setFields.chaseDaysBetween = updates.chaseDaysBetween;
      if (updates.escalateAfterChase !== undefined) setFields.escalateAfterChase = updates.escalateAfterChase;
      if (updates.channels !== undefined) setFields.channels = updates.channels;
      if (updates.gracePeriodDays !== undefined) setFields.gracePeriodDays = updates.gracePeriodDays;
      if (updates.skipWeekends !== undefined) setFields.skipWeekends = updates.skipWeekends;
      if (updates.skipBankHolidays !== undefined) setFields.skipBankHolidays = updates.skipBankHolidays;

      const [updated] = await ctx.db.update(chaseCampaigns)
        .set(setFields)
        .where(eq(chaseCampaigns.id, id))
        .returning();

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "update",
        entityType: "campaign",
        entityId: id,
        userId: ctx.internalUserId,
        changes: updates,
      });

      return updated;
    }),

  updateStatus: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "paused", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.query.chaseCampaigns.findFirst({
        where: and(
          eq(chaseCampaigns.id, input.id),
          eq(chaseCampaigns.practiceId, ctx.practiceId),
        ),
        with: { enrollments: true },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      // Validate transitions
      const valid: Record<string, string[]> = {
        draft: ["active"],
        active: ["paused", "cancelled"],
        paused: ["active", "cancelled"],
      };
      if (!valid[campaign.status]?.includes(input.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot transition from ${campaign.status} to ${input.status}`,
        });
      }

      // draft → active: require enrollments
      if (campaign.status === "draft" && input.status === "active") {
        if (!campaign.enrollments || campaign.enrollments.length === 0) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Campaign must have at least one enrolled client to activate" });
        }

        // Activate enrollments and set nextChaseAt
        for (const enrollment of campaign.enrollments) {
          const nextChaseAt = calculateNextChaseDate(
            new Date(),
            campaign.chaseDaysBetween ?? 7,
            campaign.skipWeekends ?? true,
            "09:00",
            "17:30",
          );
          await ctx.db.update(chaseEnrollments)
            .set({ status: "active", nextChaseAt, updatedAt: new Date() })
            .where(eq(chaseEnrollments.id, enrollment.id));
        }

        await ctx.db.update(chaseCampaigns)
          .set({ status: "active", startDate: new Date(), updatedAt: new Date() })
          .where(eq(chaseCampaigns.id, input.id));
      }

      // active → paused: pause enrollments
      if (input.status === "paused") {
        const activeEnrollmentIds = campaign.enrollments
          .filter((e) => e.status === "active")
          .map((e) => e.id);
        if (activeEnrollmentIds.length > 0) {
          await ctx.db.update(chaseEnrollments)
            .set({ status: "paused", nextChaseAt: null, updatedAt: new Date() })
            .where(inArray(chaseEnrollments.id, activeEnrollmentIds));
        }

        await ctx.db.update(chaseCampaigns)
          .set({ status: "paused", updatedAt: new Date() })
          .where(eq(chaseCampaigns.id, input.id));
      }

      // paused → active: resume enrollments
      if (campaign.status === "paused" && input.status === "active") {
        const pausedEnrollments = campaign.enrollments.filter((e) => e.status === "paused");
        for (const enrollment of pausedEnrollments) {
          const nextChaseAt = calculateNextChaseDate(
            new Date(),
            campaign.chaseDaysBetween ?? 7,
            campaign.skipWeekends ?? true,
            "09:00",
            "17:30",
          );
          await ctx.db.update(chaseEnrollments)
            .set({ status: "active", nextChaseAt, updatedAt: new Date() })
            .where(eq(chaseEnrollments.id, enrollment.id));
        }

        await ctx.db.update(chaseCampaigns)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(chaseCampaigns.id, input.id));
      }

      // cancelled: pause all non-completed
      if (input.status === "cancelled") {
        const cancellableIds = campaign.enrollments
          .filter((e) => e.status !== "completed" && e.status !== "opted_out")
          .map((e) => e.id);
        if (cancellableIds.length > 0) {
          await ctx.db.update(chaseEnrollments)
            .set({ status: "paused", nextChaseAt: null, updatedAt: new Date() })
            .where(inArray(chaseEnrollments.id, cancellableIds));
        }

        await ctx.db.update(chaseCampaigns)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(chaseCampaigns.id, input.id));
      }

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "update",
        entityType: "campaign",
        entityId: input.id,
        userId: ctx.internalUserId,
        changes: { from: campaign.status, to: input.status },
      });

      return ctx.db.query.chaseCampaigns.findFirst({
        where: eq(chaseCampaigns.id, input.id),
      });
    }),

  enrollClients: orgProcedure
    .input(z.object({
      campaignId: z.string().uuid(),
      clientIds: z.array(z.string().uuid()).min(1),
      requiredDocumentIds: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.query.chaseCampaigns.findFirst({
        where: and(
          eq(chaseCampaigns.id, input.campaignId),
          eq(chaseCampaigns.practiceId, ctx.practiceId),
        ),
        with: { enrollments: true },
      });

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      // Dedup: filter out clients already enrolled
      const existingClientIds = new Set(campaign.enrollments.map((e) => e.clientId));
      const newClientIds = input.clientIds.filter((id) => !existingClientIds.has(id));

      if (newClientIds.length === 0) {
        return { enrolled: 0 };
      }

      const isActive = campaign.status === "active";
      const enrollmentValues = newClientIds.map((clientId) => ({
        practiceId: ctx.practiceId,
        campaignId: input.campaignId,
        clientId,
        status: isActive ? "active" as const : "pending" as const,
        requiredDocumentIds: input.requiredDocumentIds ?? (campaign.documentTemplateIds as string[]) ?? [],
        nextChaseAt: isActive
          ? calculateNextChaseDate(
              new Date(),
              campaign.chaseDaysBetween ?? 7,
              campaign.skipWeekends ?? true,
              "09:00",
              "17:30",
            )
          : null,
      }));

      await ctx.db.insert(chaseEnrollments).values(enrollmentValues);

      // Update total count
      await ctx.db.update(chaseCampaigns)
        .set({
          totalEnrollments: (campaign.totalEnrollments ?? 0) + newClientIds.length,
          updatedAt: new Date(),
        })
        .where(eq(chaseCampaigns.id, input.campaignId));

      // Create magic links
      const newEnrollments = await ctx.db.query.chaseEnrollments.findMany({
        where: and(
          eq(chaseEnrollments.campaignId, input.campaignId),
          inArray(chaseEnrollments.clientId, newClientIds),
        ),
      });
      for (const enrollment of newEnrollments) {
        await getOrCreateMagicLink(ctx.practiceId, enrollment.clientId, enrollment.id);
      }

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "update",
        entityType: "campaign",
        entityId: input.campaignId,
        userId: ctx.internalUserId,
        changes: { newClientIds, count: newClientIds.length },
      });

      return { enrolled: newClientIds.length };
    }),

  removeEnrollment: orgProcedure
    .input(z.object({
      enrollmentId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const enrollment = await ctx.db.query.chaseEnrollments.findFirst({
        where: and(
          eq(chaseEnrollments.id, input.enrollmentId),
          eq(chaseEnrollments.practiceId, ctx.practiceId),
        ),
      });

      if (!enrollment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment not found" });
      }

      if (enrollment.status !== "pending" && enrollment.status !== "active") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Can only remove pending or active enrollments" });
      }

      await ctx.db.delete(chaseEnrollments).where(eq(chaseEnrollments.id, input.enrollmentId));

      // Decrement total
      await ctx.db.update(chaseCampaigns)
        .set({
          totalEnrollments: Math.max(0, (await ctx.db.query.chaseCampaigns.findFirst({
            where: eq(chaseCampaigns.id, enrollment.campaignId),
          }))!.totalEnrollments! - 1),
          updatedAt: new Date(),
        })
        .where(eq(chaseCampaigns.id, enrollment.campaignId));

      await ctx.db.insert(auditLog).values({
        practiceId: ctx.practiceId,
        action: "delete",
        entityType: "enrollment",
        entityId: input.enrollmentId,
        userId: ctx.internalUserId,
        changes: { campaignId: enrollment.campaignId, clientId: enrollment.clientId },
      });

      return { success: true };
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
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
