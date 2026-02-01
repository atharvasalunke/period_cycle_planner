import React, { useMemo, useState } from 'react';
import { addDays, differenceInDays, endOfDay, format, isSameDay } from 'date-fns';
import { Header } from '@/components/Header';
import { OnboardingModal } from '@/components/OnboardingModal';
import { SettingsModal } from '@/components/SettingsModal';
import { CycleCalendar } from '@/components/CycleCalendar';
import { CycleInsightCard } from '@/components/CycleInsightCard';
import { KanbanBoard } from '@/components/KanbanBoard';
import { useCycleData } from '@/hooks/useCycleData';
import { useTasks } from '@/hooks/useTasks';
import { useGoogleCalendarEvents } from '@/hooks/useGoogleCalendarEvents';
import { useGoogleTasks } from '@/hooks/useGoogleTasks';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CycleSettings } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Index = () => {
  const {
    cycleSettings,
    setCycleSettings,
    todayPhase,
    nextPeriod,
    hasCompletedSetup,
  } = useCycleData();

  const { tasks, addTask, moveTask, deleteTask } = useTasks();

  const [showCyclePhases, setShowCyclePhases] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [googleTaskOverrides, setGoogleTaskOverrides] = useLocalStorage<
    Record<string, 'todo' | 'inProgress' | 'done'>
  >('google-task-overrides', {});

  const { events: googleEvents, refresh: refreshGoogleEvents } =
    useGoogleCalendarEvents(calendarMonth);
  const {
    tasks: googleTasks,
    refresh: refreshGoogleTasks,
    updateTaskStatus,
    deleteTask: deleteGoogleTask,
    createTask: createGoogleTask,
  } = useGoogleTasks();

  const boardTasks = useMemo(
    () => [
      ...googleTasks.map((task) => ({
        ...task,
        status: googleTaskOverrides[task.id] ?? task.status,
      })),
      ...tasks,
    ],
    [googleTaskOverrides, googleTasks, tasks]
  );

  const upcomingEvents = useMemo(() => {
    const start = new Date();
    const end = endOfDay(addDays(start, 7));

    return googleEvents
      .filter((event) => event.start <= end && event.end >= start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [googleEvents]);

  const handleOnboardingComplete = (settings: CycleSettings) => {
    setCycleSettings(settings);
  };

  const handleResetAll = () => {
    setCycleSettings(null);
    localStorage.removeItem('tasks');
    localStorage.removeItem('quick-todos');
    window.location.reload();
  };

  const handleMoveTask = async (id: string, status: 'todo' | 'inProgress' | 'done') => {
    const target = boardTasks.find((task) => task.id === id);
    if (target?.source === 'google-task') {
      const setOverride = (next?: 'todo' | 'inProgress' | 'done') => {
        setGoogleTaskOverrides((prev) => {
          const updated = { ...prev };
          if (next) {
            updated[target.id] = next;
          } else {
            delete updated[target.id];
          }
          return updated;
        });
      };

      const previousStatus = googleTaskOverrides[target.id] ?? target.status;

      if (status === 'inProgress') {
        setOverride('inProgress');
        try {
          await updateTaskStatus(target.externalId ?? id, 'todo', target.externalListId);
          refreshGoogleTasks();
          refreshGoogleEvents();
        } catch (error: any) {
          setOverride(previousStatus);
          toast.error(error?.message || 'Failed to update Google Task');
        }
        return;
      }

      const taskStatus = status === 'done' ? 'done' : 'todo';
      setOverride(taskStatus);
      try {
        await updateTaskStatus(target.externalId ?? id, taskStatus, target.externalListId);
        refreshGoogleTasks();
        refreshGoogleEvents();
        setOverride(undefined);
      } catch (error: any) {
        setOverride(previousStatus);
        toast.error(error?.message || 'Failed to update Google Task');
      }
      return;
    }

    moveTask(id, status);
  };

  const handleDeleteTask = (id: string) => {
    const target = boardTasks.find((task) => task.id === id);
    if (target?.source === 'google-task') {
      deleteGoogleTask(target.externalId ?? id, target.externalListId)
        .then(() => {
          refreshGoogleTasks();
          refreshGoogleEvents();
        })
        .catch((error: any) => {
          toast.error(error?.message || 'Failed to delete Google Task');
        });
      return;
    }

    deleteTask(id);
  };

  const handleAddGoogleTask = async (task: {
    title: string;
    dueDate?: Date;
  }) => {
    try {
      await createGoogleTask(task);
      refreshGoogleTasks();
      refreshGoogleEvents();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create Google Task');
      throw error;
    }
  };

  const daysUntilNextPeriod = nextPeriod
    ? differenceInDays(nextPeriod, new Date())
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header
        showCyclePhases={showCyclePhases}
        onToggleCyclePhases={() => setShowCyclePhases(!showCyclePhases)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Calendar and Kanban */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar */}
            <CycleCalendar
              cycleSettings={cycleSettings}
              tasks={tasks}
              externalEvents={googleEvents}
              showCyclePhases={showCyclePhases && hasCompletedSetup}
              onMonthChange={setCalendarMonth}
            />

            {/* Kanban Board */}
            <KanbanBoard
              tasks={boardTasks}
              onAddTask={addTask}
              onAddGoogleTask={handleAddGoogleTask}
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
              cycleSettings={cycleSettings}
            />
          </div>

          {/* Right column - Insight and Upcoming Events */}
          <div className="space-y-6">
            {/* Cycle Insight */}
            {hasCompletedSetup && todayPhase && (
              <CycleInsightCard
                phase={todayPhase.phase}
                dayOfCycle={todayPhase.dayOfCycle}
                daysUntilNextPeriod={daysUntilNextPeriod}
              />
            )}

            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Your upcoming events</h3>
                <span className="text-xs text-muted-foreground">
                  {upcomingEvents.length}
                </span>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No upcoming events.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const isTask = event.source === 'google-task';
                    const isAllDay =
                      event.start.getHours() === 0 &&
                      event.start.getMinutes() === 0 &&
                      event.end.getHours() >= 23;

                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 rounded-lg border border-muted/40 bg-muted/20 px-3 py-2"
                      >
                        <span
                          className={cn(
                            'mt-1 h-2.5 w-2.5 rounded-full',
                            isTask ? 'bg-red-500' : 'bg-blue-500'
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'text-sm font-medium text-foreground',
                                isTask && event.completed && 'line-through text-muted-foreground'
                              )}
                            >
                              {event.title}
                            </p>
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {isTask ? 'Task' : 'Event'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(event.start, 'EEE, MMM d')}
                            {isSameDay(event.start, event.end) && isAllDay
                              ? ' • All day'
                              : ` • ${format(event.start, 'h:mm a')}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Onboarding Modal */}
      <OnboardingModal
        open={!hasCompletedSetup}
        onComplete={handleOnboardingComplete}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        cycleSettings={cycleSettings}
        onUpdateSettings={setCycleSettings}
        onResetAll={handleResetAll}
      />
    </div>
  );
};

export default Index;
