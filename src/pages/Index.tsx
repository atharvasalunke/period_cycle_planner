import React, { useState } from 'react';
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
import { CycleSettings } from '@/types';

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

  const handleOnboardingComplete = (settings: CycleSettings) => {
    setCycleSettings(settings);
  };

  const handleResetAll = () => {
    setCycleSettings(null);
    localStorage.removeItem('tasks');
    localStorage.removeItem('quick-todos');
    window.location.reload();
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
          {/* Left column - Calendar and Insight */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cycle Insight */}
            {hasCompletedSetup && todayPhase && (
              <CycleInsightCard
                phase={todayPhase.phase}
                dayOfCycle={todayPhase.dayOfCycle}
                daysUntilNextPeriod={daysUntilNextPeriod}
              />
            )}

            {/* Calendar */}
            <CycleCalendar
              cycleSettings={cycleSettings}
              tasks={tasks}
              showCyclePhases={showCyclePhases && hasCompletedSetup}
            />

            {/* Kanban Board */}
            <KanbanBoard
              tasks={tasks}
              onAddTask={addTask}
              onMoveTask={moveTask}
              onDeleteTask={deleteTask}
            />
          </div>

          {/* Right column - Quick Todos */}
          <div className="space-y-6">
            <QuickTodoList
              todos={todos}
              onAddTodo={addTodo}
              onToggleTodo={toggleTodo}
              onDeleteTodo={deleteTodo}
              onClearCompleted={clearCompleted}
            />

            {/* Privacy notice */}
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">🔒</span>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-foreground mb-1">
                    Your Data, Your Control
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All your health data stays on your device. We never share or
                    upload your personal information.
                  </p>
                </div>
              </div>
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
