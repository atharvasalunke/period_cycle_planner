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

export interface OrganizeRequest {
  text: string;
  todayISO: string; // YYYY-MM-DD
  timezone?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function organizeText(
  text: string,
  todayISO: string,
  timezone: string = 'UTC'
): Promise<OrganizeResponse> {
  const response = await fetch(`${API_BASE_URL}/organize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
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

