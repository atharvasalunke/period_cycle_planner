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

