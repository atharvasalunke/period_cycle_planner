import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarEvent, CyclePhase, CycleSettings, Task } from '@/types';
import { getCyclePhase } from '@/lib/cycle-utils';
import { cn } from '@/lib/utils';

interface CycleCalendarProps {
  cycleSettings: CycleSettings | null;
  tasks: Task[];
  externalEvents?: CalendarEvent[];
  showCyclePhases?: boolean;
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (month: Date) => void;
}

const phaseBackgrounds: Record<CyclePhase, string> = {
  period: 'bg-phase-period-light',
  follicular: 'bg-phase-follicular-light',
  ovulation: 'bg-phase-ovulation-light',
  luteal: 'bg-phase-luteal-light',
};

const phaseDots: Record<CyclePhase, string> = {
  period: 'bg-phase-period',
  follicular: 'bg-phase-follicular',
  ovulation: 'bg-phase-ovulation',
  luteal: 'bg-phase-luteal',
};

export function CycleCalendar({
  cycleSettings,
  tasks,
  externalEvents = [],
  showCyclePhases = true,
  onDateSelect,
  onMonthChange,
}: CycleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }
    return days;
  }, [calendarStart, calendarEnd]);

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      return isSameDay(task.dueDate, date);
    });
  };

  const getPhaseForDate = (date: Date) => {
    if (!cycleSettings) return null;
    return getCyclePhase(date, cycleSettings);
  };

  const getEventsForDate = (date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    return externalEvents.filter(
      (event) => event.start <= dayEnd && event.end >= dayStart
    );
  };

  React.useEffect(() => {
    onMonthChange?.(currentMonth);
  }, [currentMonth, onMonthChange]);

  return (
    <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="h-8 px-3 text-xs"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const dayTasks = getTasksForDate(day);
          const dayEvents = getEventsForDate(day);
          const phaseInfo = showCyclePhases ? getPhaseForDate(day) : null;

          return (
            <button
              key={index}
              onClick={() => onDateSelect?.(day)}
              className={cn(
                'relative min-h-[80px] p-2 border-b border-r text-left transition-colors hover:bg-muted/50',
                !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                index % 7 === 6 && 'border-r-0'
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                    isToday && 'bg-primary text-primary-foreground pulse-soft',
                    !isToday && isCurrentMonth && 'text-foreground',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Phase background indicator */}
              {phaseInfo && isCurrentMonth && showCyclePhases && (
                <div
                  className={cn(
                    'absolute inset-0 opacity-75 pointer-events-none',
                    phaseBackgrounds[phaseInfo.phase]
                  )}
                />
              )}
              {phaseInfo && isCurrentMonth && (
                <span
                  className={cn(
                    'absolute top-2 right-2 h-2 w-2 rounded-full',
                    phaseDots[phaseInfo.phase]
                  )}
                />
              )}

              {/* Tasks + Google Calendar events */}
              {(dayTasks.length > 0 || dayEvents.length > 0) && isCurrentMonth && (
                <div className="mt-1 space-y-0.5 relative z-10">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'bg-primary/70 text-white font-bold text-xs px-1.5 py-0.5 rounded truncate',
                        task.status === 'done' && 'line-through opacity-50'
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-muted-foreground px-1.5">
                      +{dayTasks.length - 2} more
                    </div>
                  )}
                  {dayEvents.slice(0, 2).map((event) => {
                    const isTask = event.source === 'google-task';
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded truncate',
                          isTask ? 'bg-[#F0527A]/70 text-white font-bold' : 'bg-blue-500/70 text-white font-bold',
                          event.completed && 'line-through opacity-50'
                        )}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground px-1.5">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {showCyclePhases && cycleSettings && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-phase-period-light" />
              <span className="text-muted-foreground">Period</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-phase-follicular-light" />
              <span className="text-muted-foreground">Follicular</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-phase-ovulation-light" />
              <span className="text-muted-foreground">Fertile Window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-phase-luteal-light" />
              <span className="text-muted-foreground">Luteal</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
