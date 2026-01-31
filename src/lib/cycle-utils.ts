import { CycleSettings, CyclePhase, CycleDay } from '@/types';
import { addDays, differenceInDays, startOfDay, isSameDay } from 'date-fns';

export function getCyclePhase(
  date: Date,
  settings: CycleSettings
): { phase: CyclePhase; dayOfCycle: number } {
  const { lastPeriodStart, cycleLength, periodLength } = settings;
  const targetDate = startOfDay(date);
  const cycleStart = startOfDay(lastPeriodStart);

  // Calculate days since last period start
  let daysSincePeriod = differenceInDays(targetDate, cycleStart);

  // Handle dates before the last period start (go back in cycles)
  while (daysSincePeriod < 0) {
    daysSincePeriod += cycleLength;
  }

  // Get day within current cycle (1-indexed)
  const dayOfCycle = (daysSincePeriod % cycleLength) + 1;

  // Determine phase based on day of cycle
  // Period: days 1 to periodLength
  // Follicular: periodLength+1 to ovulation-1
  // Ovulation: around day 14 (typically 3 days)
  // Luteal: after ovulation until end of cycle

  const ovulationDay = Math.round(cycleLength - 14); // Typically 14 days before next period
  const ovulationStart = ovulationDay - 1;
  const ovulationEnd = ovulationDay + 1;

  let phase: CyclePhase;

  if (dayOfCycle <= periodLength) {
    phase = 'period';
  } else if (dayOfCycle >= ovulationStart && dayOfCycle <= ovulationEnd) {
    phase = 'ovulation';
  } else if (dayOfCycle < ovulationStart) {
    phase = 'follicular';
  } else {
    phase = 'luteal';
  }

  return { phase, dayOfCycle };
}

export function getCycleDaysForMonth(
  year: number,
  month: number,
  settings: CycleSettings
): CycleDay[] {
  const days: CycleDay[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let currentDate = firstDay;
  while (currentDate <= lastDay) {
    const { phase, dayOfCycle } = getCyclePhase(currentDate, settings);
    days.push({
      date: new Date(currentDate),
      phase,
      dayOfCycle,
    });
    currentDate = addDays(currentDate, 1);
  }

  return days;
}

export function getPhaseInfo(phase: CyclePhase): {
  name: string;
  description: string;
  energyLevel: 'low' | 'rising' | 'high' | 'declining';
  suggestion: string;
} {
  const phaseInfo = {
    period: {
      name: 'Menstrual Phase',
      description: 'Time for rest and reflection',
      energyLevel: 'low' as const,
      suggestion: 'Consider lighter tasks and self-care activities',
    },
    follicular: {
      name: 'Follicular Phase',
      description: 'Energy is building',
      energyLevel: 'rising' as const,
      suggestion: 'Great time to start new projects and plan ahead',
    },
    ovulation: {
      name: 'Ovulation Window',
      description: 'Peak energy and focus',
      energyLevel: 'high' as const,
      suggestion: 'Ideal for important meetings and challenging tasks',
    },
    luteal: {
      name: 'Luteal Phase',
      description: 'Time to wrap up and prepare',
      energyLevel: 'declining' as const,
      suggestion: 'Focus on completing tasks and preparing for rest',
    },
  };

  return phaseInfo[phase];
}

export function getNextPeriodStart(settings: CycleSettings): Date {
  const today = startOfDay(new Date());
  const { phase, dayOfCycle } = getCyclePhase(today, settings);
  const daysUntilNextPeriod = settings.cycleLength - dayOfCycle + 1;
  return addDays(today, daysUntilNextPeriod);
}

export function isPeriodDay(date: Date, settings: CycleSettings): boolean {
  const { phase } = getCyclePhase(date, settings);
  return phase === 'period';
}

export function isFertileWindow(date: Date, settings: CycleSettings): boolean {
  const { phase } = getCyclePhase(date, settings);
  return phase === 'ovulation';
}
