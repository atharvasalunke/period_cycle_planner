import { Router } from "express";

import { getCalendarClient } from "../services/google.js";

const googleCalendarRouter = Router();

googleCalendarRouter.get("/events", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
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

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
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
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
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

export { googleCalendarRouter };
