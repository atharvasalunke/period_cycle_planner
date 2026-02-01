import { Router } from "express";
import jwt from "jsonwebtoken";

import { getCalendarClient, getTasksClient } from "../services/google.js";

const googleCalendarRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

const resolveUserId = (req: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
    if (decoded?.userId) {
      return decoded.userId;
    }
  }

  return typeof req.query.userId === "string" ? req.query.userId : undefined;
};

googleCalendarRouter.get("/events", async (req, res) => {
  try {
    let userId: string | undefined;
    try {
      userId = resolveUserId(req);
    } catch {
      return res.status(401).json({ error: "Invalid token." });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId." });
    }

    const calendar = await getCalendarClient(userId);
    if (!calendar) {
      return res.status(401).json({ error: "Google account not connected." });
    }

    const maxResultsRaw = typeof req.query.maxResults === "string" ? req.query.maxResults : "10";
    const maxResults = Number.parseInt(maxResultsRaw, 10) || 10;
    const timeMin =
      typeof req.query.timeMin === "string" ? req.query.timeMin : new Date().toISOString();
    const timeMax = typeof req.query.timeMax === "string" ? req.query.timeMax : undefined;

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return res.json({ items: response.data.items ?? [] });
  } catch (error) {
    console.error("Failed to fetch Google Calendar events", error);
    return res.status(500).json({ error: "Failed to fetch events." });
  }
});

googleCalendarRouter.get("/calendars", async (req, res) => {
  try {
    let userId: string | undefined;
    try {
      userId = resolveUserId(req);
    } catch {
      return res.status(401).json({ error: "Invalid token." });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId." });
    }

    const calendar = await getCalendarClient(userId);
    if (!calendar) {
      return res.status(401).json({ error: "Google account not connected." });
    }

    const response = await calendar.calendarList.list();
    return res.json({ items: response.data.items ?? [] });
  } catch (error) {
    console.error("Failed to fetch Google Calendar list", error);
    return res.status(500).json({ error: "Failed to fetch calendars." });
  }
});

googleCalendarRouter.get("/tasks", async (req, res) => {
  try {
    let userId: string | undefined;
    try {
      userId = resolveUserId(req);
    } catch {
      return res.status(401).json({ error: "Invalid token." });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId." });
    }

    const tasksClient = await getTasksClient(userId);
    if (!tasksClient) {
      return res.status(401).json({ error: "Google account not connected." });
    }

    const tasklist = typeof req.query.tasklist === "string" ? req.query.tasklist : "@default";
    const dueMin = typeof req.query.dueMin === "string" ? req.query.dueMin : undefined;
    const dueMax = typeof req.query.dueMax === "string" ? req.query.dueMax : undefined;
    const showCompleted = req.query.showCompleted !== "false";

    const response = await tasksClient.tasks.list({
      tasklist,
      dueMin,
      dueMax,
      showCompleted,
      showHidden: false,
    });

    return res.json({ items: response.data.items ?? [] });
  } catch (error) {
    console.error("Failed to fetch Google Tasks", error);
    return res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

export { googleCalendarRouter };
