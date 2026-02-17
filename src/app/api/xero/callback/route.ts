import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { practices, xeroConnections } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getXeroClient, getConnectedTenants } from "@/lib/xero";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session.userId || !session.orgId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const practice = await db.query.practices.findFirst({
    where: eq(practices.clerkOrgId, session.orgId),
  });
  if (!practice) {
    return NextResponse.redirect(new URL("/dashboard/settings?xero=error&reason=no_practice", request.url));
  }

  try {
    const xero = getXeroClient();
    const tokenSet = await xero.apiCallback(request.url);

    const accessToken = tokenSet.access_token!;
    const refreshToken = tokenSet.refresh_token!;
    const expiresAt = new Date(Date.now() + (tokenSet.expires_in ?? 1800) * 1000);
    const scopes = Array.isArray(tokenSet.scope) ? tokenSet.scope.join(" ") : (tokenSet.scope ?? "");

    // Get connected tenants
    const tenants = await getConnectedTenants(accessToken);
    if (tenants.length === 0) {
      return NextResponse.redirect(new URL("/dashboard/settings?xero=error&reason=no_tenants", request.url));
    }

    // Use the first tenant (most common case for practices)
    const tenant = tenants[0]!;

    // Upsert connection
    const existing = await db.query.xeroConnections.findFirst({
      where: eq(xeroConnections.practiceId, practice.id),
    });

    if (existing) {
      await db.update(xeroConnections)
        .set({
          xeroTenantId: tenant.tenantId,
          xeroTenantName: tenant.tenantName,
          connectionId: tenant.id,
          accessToken,
          refreshToken,
          tokenExpiresAt: expiresAt,
          scopes,
          status: "active",
          disconnectedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(xeroConnections.id, existing.id));
    } else {
      await db.insert(xeroConnections).values({
        practiceId: practice.id,
        xeroTenantId: tenant.tenantId,
        xeroTenantName: tenant.tenantName,
        connectionId: tenant.id,
        accessToken,
        refreshToken,
        tokenExpiresAt: expiresAt,
        scopes,
        status: "active",
      });
    }

    return NextResponse.redirect(new URL("/dashboard/settings?xero=connected", request.url));
  } catch (error) {
    console.error("Xero callback error:", error);
    return NextResponse.redirect(new URL("/dashboard/settings?xero=error&reason=callback_failed", request.url));
  }
}
