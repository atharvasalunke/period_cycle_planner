// Cycle-related types
export interface CycleSettings {
  lastPeriodStart: Date;
  cycleLength: number;
  periodLength: number;
}

export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal';

export interface CycleDay {
  date: Date;
  phase: CyclePhase;
  dayOfCycle: number;
}

// Task-related types
export type TaskStatus = 'todo' | 'inProgress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  color?: string;
  createdAt: Date;
}

// Quick todo (no deadline)
export interface QuickTodo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

// Calendar event (from external sources)
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source: 'google' | 'google-task' | 'outlook' | 'manual';
  color?: string;
  completed?: boolean;
}

// User preferences
export interface UserPreferences {
  cycleSettings: CycleSettings | null;
  showCyclePhases: boolean;
  showExternalEvents: boolean;
  onboardingComplete: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  avatarUrl?: string;
}
