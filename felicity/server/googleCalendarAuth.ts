import { OAuth2Client } from "google-auth-library";
import { storage } from "./storage";

// Full calendar scope (not just calendar.events) so the settings UI can also
// list the user's calendars to pick which one to sync — a narrower
// calendar.events-only scope can't call calendarList.list.
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Google Calendar sync needs GOOGLE_CLIENT_ID, ` +
        `GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI configured as secrets.`,
    );
  }
  return value;
}

function getOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI"),
  );
}

// state carries the Replit Auth user id through the redirect round-trip so
// the callback knows which account to attach the Google tokens to.
export function getGoogleAuthUrl(userId: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    // Forces Google to resend a refresh_token even if this user already
    // granted access before (Google only sends it on the first consent
    // otherwise) — without this, reconnecting after a revoke would silently
    // fail to get a usable token.
    prompt: "consent",
    scope: SCOPES,
    state: userId,
  });
}

export async function exchangeGoogleAuthCode(
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error(
      "Google didn't return a full token set (missing refresh_token — " +
        "usually means consent wasn't re-prompted).",
    );
  }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Math.floor(tokens.expiry_date / 1000),
  };
}

// Returns a currently-valid access token for this user's connection,
// refreshing and persisting it first if it has expired (or is about to).
// Throws if there's no connection — callers should check
// storage.getGoogleCalendarConnection first when the absence of a
// connection is a normal, expected case.
export async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await storage.getGoogleCalendarConnection(userId);
  if (!connection) {
    throw new Error(`No Google Calendar connection for user ${userId}`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (connection.expiresAt > now + 60) {
    return connection.accessToken;
  }

  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: connection.refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token || !credentials.expiry_date) {
    throw new Error("Failed to refresh Google Calendar access token");
  }

  await storage.updateGoogleCalendarConnection(userId, {
    accessToken: credentials.access_token,
    expiresAt: Math.floor(credentials.expiry_date / 1000),
  });

  return credentials.access_token;
}
