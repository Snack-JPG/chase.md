import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";

export async function createTRPCContext() {
  const session = await auth();

  return {
    db,
    userId: session.userId,
    orgId: session.orgId,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
