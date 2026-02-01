// API client for Brain Dump Organizer backend

export interface OrganizeTask {
  title: string;
  dueDateISO: string | null;
  confidence: number;
  category: string | null;
  sourceSpan: string | null;
}

export interface OrganizeResponse {
  tasks: OrganizeTask[];
  notes: string[];
  followUps: string[];
  suggestions: string[];
}

export interface CyclePhaseDate {
  date: string; // YYYY-MM-DD
  phase: string; // 'period' | 'follicular' | 'ovulation' | 'luteal'
  dayOfCycle: number;
}

export interface OrganizeRequest {
  text: string;
  todayISO: string; // YYYY-MM-DD
  timezone?: string;
  cyclePhaseCalendar?: CyclePhaseDate[]; // Calendar of cycle phases for upcoming dates
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function organizeText(
  text: string,
  todayISO: string,
  timezone: string = 'UTC',
  cyclePhaseCalendar?: CyclePhaseDate[]
): Promise<OrganizeResponse> {
  // Only send text to Gemini, images are for visualization only
  const response = await fetch(`${API_BASE_URL}/organize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      todayISO,
      timezone,
      cyclePhaseCalendar,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface ChatWithTasksRequest {
  message: string;
  tasks: OrganizeTask[];
  todayISO: string;
  timezone?: string;
}

export interface ChatWithTasksResponse {
  response: string;
  newTasks?: OrganizeTask[];
  updatedTasks?: Array<{ index: number; updates: Partial<OrganizeTask> }>;
}

export async function chatWithTasks(
  message: string,
  tasks: OrganizeTask[],
  todayISO: string,
  timezone: string = 'UTC'
): Promise<ChatWithTasksResponse> {
  const response = await fetch(`${API_BASE_URL}/chat-tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      tasks,
      todayISO,
      timezone,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');

  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/transcribe`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Transcription timeout. Please try with a shorter recording.');
      }
      throw error;
    }
    throw new Error('Failed to transcribe audio');
  }
}

export async function getWelcomeMessage(cyclePhase?: string, dayOfCycle?: number): Promise<Blob> {
  const params = new URLSearchParams();
  if (cyclePhase) {
    params.append('cycle_phase', cyclePhase);
  }
  if (dayOfCycle) {
    params.append('day_of_cycle', dayOfCycle.toString());
  }
  // Add cache-busting timestamp to ensure fresh response
  params.append('_t', Date.now().toString());
  
  const url = `${API_BASE_URL}/welcome-message?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store', // Prevent browser caching
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.blob();
}

