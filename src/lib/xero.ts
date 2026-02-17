import { XeroClient } from "xero-node";

const SCOPES = "openid profile email accounting.contacts.read accounting.settings.read files offline_access";

let _xeroClient: XeroClient | null = null;

export function getXeroClient(): XeroClient {
  if (!_xeroClient) {
    _xeroClient = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
      redirectUris: [process.env.XERO_REDIRECT_URI!],
      scopes: SCOPES.split(" "),
    });
  }
  return _xeroClient;
}

export { SCOPES };

/**
 * Refresh an access token using a single-use refresh token.
 * Returns a new token set — the old refresh token is invalidated immediately.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const clientId = process.env.XERO_CLIENT_ID!;
  const clientSecret = process.env.XERO_CLIENT_SECRET!;

  const response = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Fetch connected tenants using an access token.
 */
export async function getConnectedTenants(accessToken: string): Promise<
  Array<{ id: string; tenantId: string; tenantName: string; tenantType: string }>
> {
  const response = await fetch("https://api.xero.com/connections", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tenants: ${response.status}`);
  }

  return response.json();
}

/**
 * Revoke a refresh token (disconnect).
 */
export async function revokeToken(refreshToken: string): Promise<void> {
  const clientId = process.env.XERO_CLIENT_ID!;
  const clientSecret = process.env.XERO_CLIENT_SECRET!;

  await fetch("https://identity.xero.com/connect/revocation", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      token: refreshToken,
    }),
  });
}

/**
 * Delete a specific tenant connection.
 */
export async function deleteTenantConnection(
  accessToken: string,
  connectionId: string,
): Promise<void> {
  await fetch(`https://api.xero.com/connections/${connectionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
