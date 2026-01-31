import { Router } from "express";
import { google } from "googleapis";

import { prisma } from "../db/prisma.js";
import {
  createGoogleOAuthClient,
  decodeGoogleState,
  getGoogleAuthUrl,
} from "../lib/google.js";
import { upsertGoogleTokens } from "../services/google.js";

const googleAuthRouter = Router();

const resolveUser = async (userId?: string, email?: string) => {
  if (userId) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
  if (!email) {
    return null;
  }
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });
};

googleAuthRouter.get("/start", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;

    // We can pass state to Google to remember where we came from or if we're linking
    const state: Record<string, string> = {};
    if (userId) {
      state.userId = userId;
    }

    const url = getGoogleAuthUrl(state);
    return res.redirect(url);
  } catch (error) {
    console.error("Google OAuth start failed", error);
    return res.status(500).json({ error: "Failed to start Google OAuth." });
  }
});

import jwt from "jsonwebtoken";

googleAuthRouter.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;

    if (typeof code !== "string") {
      return res.status(400).json({ error: "Missing OAuth code." });
    }

    const oauth2Client = createGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token && !tokens.id_token) {
      return res.status(400).json({
        error:
          "Google did not return an access token. Check OAuth client type, redirect URI, and scopes, then retry.",
      });
    }

    let email: string | undefined;
    let firstName: string | undefined;
    let lastName: string | undefined;

    if (tokens.id_token) {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email ?? undefined;
      firstName = payload?.given_name ?? undefined;
      lastName = payload?.family_name ?? undefined;
    }

    if (!email && tokens.access_token) {
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();
      email = userInfo.email ?? undefined;
      firstName = userInfo.given_name ?? undefined;
      lastName = userInfo.family_name ?? undefined;
    }

    if (!email) {
      return res.status(400).json({ error: "Could not retrieve email from Google." });
    }

    const name =
      [firstName, lastName].filter((part) => Boolean(part && part.trim())).join(" ") ||
      undefined;

    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        email,
        name,
      },
    });

    // Save tokens if we have them (for calendar access later)
    await upsertGoogleTokens(user.id, tokens);

    const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    // Redirect back to the frontend with the token.
    const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:8080").split(",");
    const frontendUrl = allowedOrigins[0].trim();
    return res.redirect(`${frontendUrl}/login?token=${token}`);
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return res.status(500).json({ error: "Failed to complete Google OAuth." });
  }
});

googleAuthRouter.get("/status", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId." });
    }

    const token = await prisma.googleCalendarToken.findUnique({ where: { userId } });
    return res.json({ connected: Boolean(token) });
  } catch (error) {
    console.error("Google OAuth status failed", error);
    return res.status(500).json({ error: "Failed to check connection." });
  }
});

export { googleAuthRouter };
