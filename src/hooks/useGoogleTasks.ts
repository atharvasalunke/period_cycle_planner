import { useCallback, useEffect, useState } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { Task, TaskStatus } from '@/types';
import { BACKEND_BASE_URL } from '@/lib/backend';
import { useAuth } from './useAuth';

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeTaskDue = (value: string) => {
  if (/T00:00:00(?:\.000)?Z$/.test(value)) {
    return value.slice(0, 10);
  }
  return value;
};

const parseTaskDueDate = (value: string) => {
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

const mapGoogleTaskToTask = (task: any, tasklist: string): Task | null => {
  if (!task?.id) return null;

  const dueValue: string | undefined = task?.due;
  const dueDate = dueValue ? parseTaskDueDate(dueValue).start : undefined;
  const status: TaskStatus = task.status === 'completed' ? 'done' : 'todo';
  const createdAt = task.updated
    ? new Date(task.updated)
    : task.created
      ? new Date(task.created)
      : new Date();

  return {
    id: `g-task-${task.id}`,
    title: task.title || '(Untitled task)',
    status,
    dueDate,
    createdAt,
    source: 'google-task',
    externalId: task.id,
    externalListId: tasklist,
  };
};

export const useGoogleTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus, tasklist: string = '@default') => {
      if (!user?.id) return;

      const token = localStorage.getItem('auth-token');
      const response = await fetch(
        `${BACKEND_BASE_URL}/google/calendar/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            tasklist,
            status: status === 'done' ? 'completed' : 'needsAction',
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update Google Task');
      }

      refresh();
    },
    [refresh, user?.id]
  );

  const createTask = useCallback(
    async (input: { title: string; dueDate?: Date; tasklist?: string }) => {
      if (!user?.id) return;

      const { title, dueDate, tasklist } = input;
      const token = localStorage.getItem('auth-token');

      const response = await fetch(`${BACKEND_BASE_URL}/google/calendar/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          due: dueDate ? dueDate.toISOString() : undefined,
          tasklist,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create Google Task');
      }

      refresh();
    },
    [refresh, user?.id]
  );

  const deleteTask = useCallback(
    async (taskId: string, tasklist: string = '@default') => {
      if (!user?.id) return;

      const token = localStorage.getItem('auth-token');
      const response = await fetch(
        `${BACKEND_BASE_URL}/google/calendar/tasks/${taskId}?${new URLSearchParams({
          tasklist,
        }).toString()}`,
        {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete Google Task');
      }

      refresh();
    },
    [refresh, user?.id]
  );

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.id) {
        setTasks([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          userId: user.id,
          showCompleted: 'true',
          tasklist: '@default',
        });

        const token = localStorage.getItem('auth-token');
        const response = await fetch(
          `${BACKEND_BASE_URL}/google/calendar/tasks?${params.toString()}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch Google Tasks');
        }

        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        const mapped = items
          .map((task: any) => mapGoogleTaskToTask(task, '@default'))
          .filter((task): task is Task => Boolean(task));

        setTasks(mapped);
      } catch (err: any) {
        setTasks([]);
        setError(err?.message || 'Failed to fetch Google Tasks');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTasks();
  }, [user?.id, refreshKey]);

  return { tasks, isLoading, error, refresh, updateTaskStatus, deleteTask, createTask };
};
