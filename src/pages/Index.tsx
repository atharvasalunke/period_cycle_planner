import React, { useMemo, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Header } from '@/components/Header';
import { OnboardingModal } from '@/components/OnboardingModal';
import { SettingsModal } from '@/components/SettingsModal';
import { CycleCalendar } from '@/components/CycleCalendar';
import { CycleInsightCard } from '@/components/CycleInsightCard';
import { KanbanBoard } from '@/components/KanbanBoard';
import { QuickTodoList } from '@/components/QuickTodoList';
import { useCycleData } from '@/hooks/useCycleData';
import { useTasks } from '@/hooks/useTasks';
import { useQuickTodos } from '@/hooks/useQuickTodos';
import { useGoogleCalendarEvents } from '@/hooks/useGoogleCalendarEvents';
import { useGoogleTasks } from '@/hooks/useGoogleTasks';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CycleSettings } from '@/types';
import { toast } from 'sonner';

const Index = () => {
  const {
    cycleSettings,
    setCycleSettings,
    todayPhase,
    nextPeriod,
    hasCompletedSetup,
  } = useCycleData();

  const { tasks, addTask, moveTask, deleteTask } = useTasks();
  const { todos, addTodo, toggleTodo, deleteTodo, clearCompleted } = useQuickTodos();

  const [showCyclePhases, setShowCyclePhases] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [googleTaskOverrides, setGoogleTaskOverrides] = useLocalStorage<
    Record<string, 'todo' | 'inProgress' | 'done'>
  >('google-task-overrides', {});

  const { events: googleEvents, refresh: refreshGoogleEvents } =
    useGoogleCalendarEvents(calendarMonth);
  const { tasks: googleTasks, refresh: refreshGoogleTasks, updateTaskStatus } =
    useGoogleTasks();

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
      toast.message('Google Tasks can be deleted only from Google.');
      return;
    }

    deleteTask(id);
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
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
              cycleSettings={cycleSettings}
            />
          </div>

          {/* Right column - Insight and Quick Todos */}
          <div className="space-y-6">
            {/* Cycle Insight */}
            {hasCompletedSetup && todayPhase && (
              <CycleInsightCard
                phase={todayPhase.phase}
                dayOfCycle={todayPhase.dayOfCycle}
                daysUntilNextPeriod={daysUntilNextPeriod}
              />
            )}

            <QuickTodoList
              todos={todos}
              onAddTodo={addTodo}
              onToggleTodo={toggleTodo}
              onDeleteTodo={deleteTodo}
              onClearCompleted={clearCompleted}
            />


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
