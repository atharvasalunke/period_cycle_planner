import { useMemo } from 'react';
import { CycleSettings, CyclePhase } from '@/types';
import { getCyclePhase, getPhaseInfo, getNextPeriodStart } from '@/lib/cycle-utils';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_SETTINGS: CycleSettings = {
  lastPeriodStart: new Date(),
  cycleLength: 28,
  periodLength: 5,
};

export function useCycleData() {
  const [cycleSettings, setCycleSettings] = useLocalStorage<CycleSettings | null>(
    'cycle-settings',
    null
  );

  const todayPhase = useMemo(() => {
    if (!cycleSettings) return null;
    return getCyclePhase(new Date(), cycleSettings);
  }, [cycleSettings]);

  const phaseInfo = useMemo(() => {
    if (!todayPhase) return null;
    return getPhaseInfo(todayPhase.phase);
  }, [todayPhase]);

  const nextPeriod = useMemo(() => {
    if (!cycleSettings) return null;
    return getNextPeriodStart(cycleSettings);
  }, [cycleSettings]);

  const getPhaseForDate = (date: Date) => {
    if (!cycleSettings) return null;
    return getCyclePhase(date, cycleSettings);
  };

  return {
    cycleSettings,
    setCycleSettings,
    todayPhase,
    phaseInfo,
    nextPeriod,
    getPhaseForDate,
    hasCompletedSetup: cycleSettings !== null,
  };
}
