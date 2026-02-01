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

googleCalendarRouter.post("/events", async (req, res) => {
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

    const { title, description, startDate, endDate, allDay } = req.body ?? {};
    
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Missing event title." });
    }

    if (!startDate) {
      return res.status(400).json({ error: "Missing start date." });
    }

    let start: { dateTime?: string; date?: string; timeZone?: string };
    let end: { dateTime?: string; date?: string; timeZone?: string };

    if (allDay) {
      // All-day event uses date format (YYYY-MM-DD)
      start = { date: startDate };
      end = { date: endDate || startDate };
    } else {
      // Timed event uses dateTime format
      start = { dateTime: new Date(startDate).toISOString(), timeZone: "UTC" };
      const endDateTime = endDate 
        ? new Date(endDate) 
        : new Date(new Date(startDate).getTime() + 60 * 60 * 1000); // Default 1 hour
      end = { dateTime: endDateTime.toISOString(), timeZone: "UTC" };
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: title.trim(),
        description: description || "",
        start,
        end,
      },
    });

    return res.status(201).json({ item: response.data });
  } catch (error) {
    console.error("Failed to create Google Calendar event", error);
    return res.status(500).json({ error: "Failed to create event." });
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

googleCalendarRouter.post("/tasks", async (req, res) => {
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

    const { title, due, tasklist } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Missing task title." });
    }

    const targetTasklist =
      typeof tasklist === "string" && tasklist.trim() ? tasklist : "@default";

    let dueIso: string | undefined;
    if (typeof due === "string" && due.trim()) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
        dueIso = `${due}T00:00:00.000Z`;
      } else {
        const parsed = new Date(due);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ error: "Invalid due date." });
        }
        dueIso = parsed.toISOString();
      }
    }

    const response = await tasksClient.tasks.insert({
      tasklist: targetTasklist,
      requestBody: {
        title: title.trim(),
        due: dueIso,
        status: "needsAction",
      },
    });

    return res.status(201).json({ item: response.data });
  } catch (error) {
    console.error("Failed to create Google Task", error);
    return res.status(500).json({ error: "Failed to create task." });
  }
});

googleCalendarRouter.patch("/tasks/:taskId", async (req, res) => {
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

    const taskId = req.params.taskId;
    const { status, tasklist } = req.body ?? {};
    const normalizedStatus = status === "completed" ? "completed" : "needsAction";
    const targetTasklist =
      typeof tasklist === "string" && tasklist.trim() ? tasklist : "@default";

    const requestBody =
      normalizedStatus === "completed"
        ? { status: "completed", completed: new Date().toISOString() }
        : { status: "needsAction", completed: null };

    const response = await tasksClient.tasks.patch({
      tasklist: targetTasklist,
      task: taskId,
      requestBody,
    });

    return res.json({ item: response.data });
  } catch (error) {
    console.error("Failed to update Google Task", error);
    return res.status(500).json({ error: "Failed to update task." });
  }
});

googleCalendarRouter.delete("/tasks/:taskId", async (req, res) => {
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

    const taskId = req.params.taskId;
    const tasklist =
      typeof req.query.tasklist === "string" && req.query.tasklist.trim()
        ? req.query.tasklist
        : "@default";

    await tasksClient.tasks.delete({
      tasklist,
      task: taskId,
    });

    return res.json({ status: "deleted" });
  } catch (error) {
    console.error("Failed to delete Google Task", error);
    return res.status(500).json({ error: "Failed to delete task." });
  }
});

export { googleCalendarRouter };
