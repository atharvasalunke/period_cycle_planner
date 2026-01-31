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

    // Get user info from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      return res.status(400).json({ error: "Could not retrieve email from Google." });
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: userInfo.email },
      update: { name: userInfo.name },
      create: {
        email: userInfo.email,
        name: userInfo.name,
      },
    });

    // Save tokens if we have them (for calendar access later)
    await upsertGoogleTokens(user.id, tokens);

    const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    // Redirect back to the frontend with the token.
    const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",");
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
