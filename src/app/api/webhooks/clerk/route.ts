import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/server/db";
import { practices, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

interface ClerkWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Verify Svix signature
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "organization.created": {
      const data = event.data as {
        id: string;
        name: string;
        slug: string;
      };
      // Create practice record for the new Clerk org
      await db.insert(practices).values({
        clerkOrgId: data.id,
        name: data.name,
        slug: data.slug || data.id,
        email: "", // Will be updated via settings
      }).onConflictDoNothing();
      break;
    }

    case "user.created": {
      const data = event.data as {
        id: string;
        email_addresses: { email_address: string }[];
        first_name: string | null;
        last_name: string | null;
        image_url: string | null;
        organization_memberships?: { organization: { id: string } }[];
      };

      const email = data.email_addresses?.[0]?.email_address;
      if (!email) break;

      // If user belongs to an org, link them to the practice
      const orgId = data.organization_memberships?.[0]?.organization?.id;
      if (orgId) {
        const practice = await db.query.practices.findFirst({
          where: eq(practices.clerkOrgId, orgId),
        });
        if (practice) {
          await db.insert(users).values({
            practiceId: practice.id,
            clerkUserId: data.id,
            email,
            firstName: data.first_name,
            lastName: data.last_name,
            avatarUrl: data.image_url,
            role: "owner",
          }).onConflictDoNothing();
        }
      }
      break;
    }

    case "organizationMembership.created": {
      const data = event.data as {
        organization: { id: string };
        public_user_data: {
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          image_url: string | null;
        };
        role: string;
      };

      const practice = await db.query.practices.findFirst({
        where: eq(practices.clerkOrgId, data.organization.id),
      });
      if (!practice) break;

      // Check if user already exists
      const existing = await db.query.users.findFirst({
        where: eq(users.clerkUserId, data.public_user_data.user_id),
      });
      if (existing) break;

      // We need the user's email — fetch from Clerk or use a placeholder
      // For now, create with the data we have
      await db.insert(users).values({
        practiceId: practice.id,
        clerkUserId: data.public_user_data.user_id,
        email: "", // Will be populated on first login or via user.updated
        firstName: data.public_user_data.first_name,
        lastName: data.public_user_data.last_name,
        avatarUrl: data.public_user_data.image_url,
        role: data.role === "admin" ? "admin" : "staff",
      }).onConflictDoNothing();
      break;
    }

    default:
      console.log("Unhandled Clerk webhook event:", event.type);
  }

  return NextResponse.json({ received: true });
}
