import type { Credentials } from "google-auth-library";
import { google } from "googleapis";

import { prisma } from "../db/prisma.js";
import { createGoogleOAuthClient } from "../lib/google.js";

const buildTokenUpdate = (
  existing: {
    accessToken: string;
    refreshToken: string | null;
    scope: string | null;
    tokenType: string | null;
    expiryDate: Date | null;
  } | null,
  tokens: Credentials
) => {
  const accessToken = tokens.access_token ?? existing?.accessToken;
  if (!accessToken) {
    throw new Error("Missing access token from Google");
  }

  return {
    accessToken,
    refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
    scope: tokens.scope ?? existing?.scope ?? null,
    tokenType: tokens.token_type ?? existing?.tokenType ?? null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : existing?.expiryDate ?? null,
  };
};

const upsertGoogleTokens = async (userId: string, tokens: Credentials) => {
  const existing = await prisma.googleCalendarToken.findUnique({ where: { userId } });
  const update = buildTokenUpdate(existing, tokens);

  return prisma.googleCalendarToken.upsert({
    where: { userId },
    create: {
      userId,
      ...update,
    },
    update,
  });
};

const getAuthorizedGoogleClient = async (userId: string) => {
  const token = await prisma.googleCalendarToken.findUnique({ where: { userId } });
  if (!token) {
    return null;
  }

  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken ?? undefined,
    expiry_date: token.expiryDate?.getTime(),
    scope: token.scope ?? undefined,
    token_type: token.tokenType ?? undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token || tokens.refresh_token) {
      await upsertGoogleTokens(userId, tokens);
    }
  });

  return oauth2Client;
};

const getCalendarClient = async (userId: string) => {
  const auth = await getAuthorizedGoogleClient(userId);
  if (!auth) {
    return null;
  }

  return google.calendar({ version: "v3", auth });
};

export { getCalendarClient, getAuthorizedGoogleClient, upsertGoogleTokens };
