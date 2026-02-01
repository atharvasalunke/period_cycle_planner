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
          {/* Left column - Calendar and Kanban */}
          <div className="lg:col-span-2 space-y-6">
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
