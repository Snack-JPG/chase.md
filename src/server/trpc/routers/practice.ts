import { z } from "zod";
import { orgProcedure, router } from "../init";
import { practices, auditLog } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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
});
