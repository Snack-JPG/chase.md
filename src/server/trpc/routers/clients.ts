import { z } from "zod";
import { orgProcedure, router } from "../init";
import { clients } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

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
      return client;
    }),
});
