import React from 'react';
import { CyclePhase } from '@/types';
import { getPhaseInfo } from '@/lib/cycle-utils';
import { cn } from '@/lib/utils';
import { Sparkles, Zap, Sun, Moon } from 'lucide-react';

interface CycleInsightCardProps {
  phase: CyclePhase;
  dayOfCycle: number;
  daysUntilNextPeriod?: number;
}

const phaseIcons = {
  period: Moon,
  follicular: Sparkles,
  ovulation: Sun,
  luteal: Zap,
};

const phaseColors = {
  period: 'bg-phase-period-light border-phase-period text-phase-period',
  follicular: 'bg-phase-follicular-light border-phase-follicular text-phase-follicular',
  ovulation: 'bg-phase-ovulation-light border-phase-ovulation text-phase-ovulation',
  luteal: 'bg-phase-luteal-light border-phase-luteal text-phase-luteal',
};

const phaseIconColors = {
  period: 'text-phase-period',
  follicular: 'text-phase-follicular',
  ovulation: 'text-phase-ovulation',
  luteal: 'text-phase-luteal',
};

export function CycleInsightCard({
  phase,
  dayOfCycle,
  daysUntilNextPeriod,
}: CycleInsightCardProps) {
  const info = getPhaseInfo(phase);
  const Icon = phaseIcons[phase];

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card animate-slide-up">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex-shrink-0 p-3 rounded-xl border',
            phaseColors[phase]
          )}
        >
          <Icon className={cn('h-6 w-6', phaseIconColors[phase])} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{info.name}</h3>
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
              Day {dayOfCycle}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{info.description}</p>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-foreground">💡 {info.suggestion}</p>
          </div>
        </div>
      </div>
      {daysUntilNextPeriod !== undefined && daysUntilNextPeriod > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {daysUntilNextPeriod} days
            </span>{' '}
            until next period
          </p>
        </div>
      )}
    </div>
  );
}
