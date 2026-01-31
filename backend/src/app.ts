import cors from "cors";
import express from "express";

import { googleAuthRouter } from "./routes/googleAuth.js";
import { googleCalendarRouter } from "./routes/googleCalendar.js";
import { healthRouter } from "./routes/health.js";

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  })
);
app.use(express.json());

app.use("/health", healthRouter);
app.use("/auth/google", googleAuthRouter);
app.use("/google/calendar", googleCalendarRouter);

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "period-cycle-planner-backend",
  });
});

export { app };
