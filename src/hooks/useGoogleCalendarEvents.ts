import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarEvent } from "@/types";
import { BACKEND_BASE_URL } from "@/lib/backend";
import { useAuth } from "./useAuth";

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseGoogleDate = (value: string, isEnd: boolean) => {
  if (isDateOnly(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (isEnd) {
      const adjusted = addDays(date, -1);
      return endOfDay(adjusted);
    }
    return startOfDay(date);
  }
  return new Date(value);
};

const normalizeTaskDue = (value: string) => {
  if (/T00:00:00(?:\.000)?Z$/.test(value)) {
    return value.slice(0, 10);
  }
  return value;
};

const getTaskDateRange = (value: string) => {
  const normalized = normalizeTaskDue(value);
  if (isDateOnly(normalized)) {
    const [year, month, day] = normalized.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  }

  const dateTime = new Date(normalized);
  return { start: dateTime, end: dateTime };
};

const mapGoogleEvent = (event: any): CalendarEvent | null => {
  const startValue: string | undefined =
    event?.start?.dateTime || event?.start?.date;
  if (!startValue) return null;
  const endValue: string | undefined = event?.end?.dateTime || event?.end?.date;

  const start = parseGoogleDate(startValue, false);
  const end = endValue ? parseGoogleDate(endValue, true) : start;

  return {
    id: String(event.id ?? crypto.randomUUID()),
    title: event.summary || "(Untitled event)",
    start,
    end,
    source: "google",
  };
};

const mapGoogleTask = (task: any): CalendarEvent | null => {
  const dueValue: string | undefined = task?.due;
  if (!dueValue) return null;

  const { start, end } = getTaskDateRange(dueValue);

  return {
    id: `task-${task.id ?? crypto.randomUUID()}`,
    title: task.title || "(Untitled task)",
    start,
    end,
    source: "google-task",
    completed: task.status === "completed",
  };
};

const createDedupKey = (event: CalendarEvent) => {
  const dateKey = event.start.toISOString().slice(0, 10);
  const titleKey = event.title.trim().toLowerCase();
  return `${dateKey}::${titleKey}`;
};

const dedupeEvents = (events: CalendarEvent[]) => {
  const taskKeys = new Set<string>();
  for (const event of events) {
    if (event.source === "google-task") {
      taskKeys.add(createDedupKey(event));
    }
  }

  return events.filter((event) => {
    if (event.source === "google-task") return true;
    if (event.source !== "google") return true;
    return !taskKeys.has(createDedupKey(event));
  });
};

export const useGoogleCalendarEvents = (focusMonth: Date) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const range = useMemo(() => {
    const monthStart = startOfMonth(focusMonth);
    const monthEnd = endOfMonth(focusMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return {
      timeMin: calendarStart.toISOString(),
      timeMax: addDays(calendarEnd, 1).toISOString(),
    };
  }, [focusMonth]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.id) {
        setEvents([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          userId: user.id,
          timeMin: range.timeMin,
          timeMax: range.timeMax,
          maxResults: "250",
        });

        const token = localStorage.getItem("auth-token");
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        const [eventsResponse, tasksResponse] = await Promise.all([
          fetch(
            `${BACKEND_BASE_URL}/google/calendar/events?${params.toString()}`,
            {
              headers,
            },
          ),
          fetch(
            `${BACKEND_BASE_URL}/google/calendar/tasks?${new URLSearchParams({
              userId: user.id,
              dueMin: range.timeMin,
              dueMax: range.timeMax,
              showCompleted: "true",
            }).toString()}`,
            { headers },
          ),
        ]);

        if (!eventsResponse.ok) {
          const data = await eventsResponse.json().catch(() => ({}));
          throw new Error(
            data.error || "Failed to fetch Google Calendar events",
          );
        }

        const eventsData = await eventsResponse.json();
        const eventItems = Array.isArray(eventsData.items)
          ? eventsData.items
          : [];
        const mappedEvents = eventItems
          .map(mapGoogleEvent)
          .filter((event): event is CalendarEvent => Boolean(event));

        let mappedTasks: CalendarEvent[] = [];
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          const taskItems = Array.isArray(tasksData.items)
            ? tasksData.items
            : [];
          mappedTasks = taskItems
            .map(mapGoogleTask)
            .filter((event): event is CalendarEvent => Boolean(event));
        }

        setEvents(dedupeEvents([...mappedEvents, ...mappedTasks]));
      } catch (err: any) {
        setEvents([]);
        setError(err?.message || "Failed to fetch Google Calendar events");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchEvents();
  }, [user?.id, range.timeMin, range.timeMax, refreshKey]);

  return { events, isLoading, error, refresh };
};
