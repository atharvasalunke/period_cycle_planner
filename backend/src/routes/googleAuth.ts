import { Router } from "express";

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

googleAuthRouter.post("/start", async (req, res) => {
  try {
    const { email, userId } = req.body ?? {};
    const user = await resolveUser(
      typeof userId === "string" ? userId : undefined,
      typeof email === "string" ? email : undefined
    );

    if (!user) {
      return res.status(400).json({ error: "Provide a valid userId or email." });
    }

    const url = getGoogleAuthUrl({ userId: user.id });
    return res.json({ url, userId: user.id });
  } catch (error) {
    console.error("Google OAuth start failed", error);
    return res.status(500).json({ error: "Failed to start Google OAuth." });
  }
});

googleAuthRouter.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;

    if (typeof code !== "string") {
      return res.status(400).json({ error: "Missing OAuth code." });
    }

    const decoded = decodeGoogleState(state);
    const userId = decoded?.userId;
    if (!userId) {
      return res.status(400).json({ error: "Missing user state." });
    }

    const oauth2Client = createGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    await upsertGoogleTokens(userId, tokens);

    return res.json({ status: "connected" });
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
