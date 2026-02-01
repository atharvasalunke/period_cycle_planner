import React, { useState } from 'react';
import { format } from 'date-fns';
import { BrainDumpPanel } from './BrainDumpPanel';
import { AiOrganizerPanel } from './AiOrganizerPanel';
import { MindMapCanvas } from './MindMapCanvas';
import { organizeText, OrganizeTask } from '@/lib/api';
import { Task, CycleSettings } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useCycleData } from '@/hooks/useCycleData';
import { getCyclePhase } from '@/lib/cycle-utils';

interface BrainDumpMindMapProps {
  onAddTasks: (task: Omit<Task, 'id' | 'createdAt'>) => void;
}

export function BrainDumpMindMap({ onAddTasks }: BrainDumpMindMapProps) {
  const { cycleSettings, todayPhase } = useCycleData();
  const [brainDumpText, setBrainDumpText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [organizedTasks, setOrganizedTasks] = useState<OrganizeTask[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [showVisualization, setShowVisualization] = useState(false);

  const handleOrganize = async () => {
    if (!brainDumpText.trim()) return;

    setIsLoading(true);
    try {
      const todayISO = format(new Date(), 'yyyy-MM-dd');
      // Get cycle phase calendar for the next 60 days so Gemini knows what phase each date will be in
      let cyclePhaseCalendar: Array<{ date: string; phase: string; dayOfCycle: number }> | undefined;
      if (cycleSettings) {
        const today = new Date();
        cyclePhaseCalendar = [];
        for (let i = 0; i < 60; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const phaseInfo = getCyclePhase(date, cycleSettings);
          cyclePhaseCalendar.push({
            date: format(date, 'yyyy-MM-dd'),
            phase: phaseInfo.phase,
            dayOfCycle: phaseInfo.dayOfCycle,
          });
        }
      }
      // Only send text to Gemini, images are for visualization only
      const response = await organizeText(brainDumpText, todayISO, 'UTC', cyclePhaseCalendar);

      setOrganizedTasks(response.tasks);
      setNotes(response.notes);
      setSuggestions(response.suggestions);
      setFollowUps(response.followUps);

      toast({
        title: 'Organized!',
        description: `Found ${response.tasks.length} tasks`,
      });
    } catch (error) {
      console.error('Error organizing text:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to organize text',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = (index: number, updates: Partial<OrganizeTask>) => {
    setOrganizedTasks((prev) =>
      prev.map((task, i) => (i === index ? { ...task, ...updates } : task))
    );
  };

  const handleDeleteTask = (index: number) => {
    setOrganizedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReorderTasks = (fromIndex: number, toIndex: number) => {
    setOrganizedTasks((prev) => {
      const newTasks = [...prev];
      const [movedTask] = newTasks.splice(fromIndex, 1);
      newTasks.splice(toIndex, 0, movedTask);
      return newTasks;
    });
  };

  const handleMoveTask = (taskIndex: number, newCategory: string | null) => {
    setOrganizedTasks((prev) =>
      prev.map((task, i) =>
        i === taskIndex ? { ...task, category: newCategory } : task
      )
    );
  };

  const [clearAfterApply, setClearAfterApply] = useState(true);

  const handleApplyToBoard = () => {
    const tasksToAdd = organizedTasks.map((task) => ({
      title: task.title,
      status: 'todo' as const,
      priority: 'medium' as const,
      dueDate: task.dueDateISO ? new Date(task.dueDateISO) : undefined,
    }));

    tasksToAdd.forEach((task) => onAddTasks(task));

    toast({
      title: 'Applied!',
      description: `Added ${tasksToAdd.length} tasks to board`,
    });

    if (clearAfterApply) {
      handleReset();
    }
  };

  const handleApplyToCalendar = () => {
    const tasksWithDates = organizedTasks.filter((task) => task.dueDateISO);
    const tasksToAdd = tasksWithDates.map((task) => ({
      title: task.title,
      status: 'todo' as const,
      priority: 'medium' as const,
      dueDate: new Date(task.dueDateISO!),
    }));

    tasksToAdd.forEach((task) => onAddTasks(task));

    toast({
      title: 'Applied!',
      description: `Added ${tasksToAdd.length} tasks to calendar`,
    });

    if (clearAfterApply) {
      handleReset();
    }
  };

  const handleApplyAll = () => {
    const tasksToAdd = organizedTasks.map((task) => ({
      title: task.title,
      status: 'todo' as const,
      priority: 'medium' as const,
      dueDate: task.dueDateISO ? new Date(task.dueDateISO) : undefined,
    }));

    tasksToAdd.forEach((task) => onAddTasks(task));

    toast({
      title: 'Applied!',
      description: `Added ${tasksToAdd.length} tasks to board and calendar`,
    });

    if (clearAfterApply) {
      handleReset();
    }
  };

  const handleReset = () => {
    setBrainDumpText('');
    setImages([]);
    setOrganizedTasks([]);
    setNotes([]);
    setSuggestions([]);
    setFollowUps([]);
    setShowVisualization(false);
  };

  if (showVisualization) {
    return (
      <div className="w-full h-[calc(100vh-200px)] relative">
        <MindMapCanvas
          tasks={organizedTasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onAddTasks={(newTasks) => setOrganizedTasks((prev) => [...prev, ...newTasks])}
          uploadedImages={images}
          cycleSettings={cycleSettings}
        />
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setShowVisualization(false)}
            className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Mind Map-style horizontal flow */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: Brain Dump Input */}
        <div className="flex-1 min-w-0">
          <BrainDumpPanel
            text={brainDumpText}
            onTextChange={setBrainDumpText}
            onOrganize={handleOrganize}
            onImagesChange={setImages}
            images={images}
            isLoading={isLoading}
            cyclePhase={todayPhase?.phase}
            dayOfCycle={todayPhase?.dayOfCycle}
          />
        </div>

        {/* Arrow indicator (visual flow) */}
        {organizedTasks.length > 0 && (
          <div className="hidden lg:flex items-center justify-center pt-12">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Right: AI Organized Results */}
        <div className="flex-1 min-w-0 max-w-[600px] lg:max-w-[700px]">
          <AiOrganizerPanel
            tasks={organizedTasks}
            notes={notes}
            suggestions={suggestions}
            followUps={followUps}
            onApplyToBoard={handleApplyToBoard}
            onApplyToCalendar={handleApplyToCalendar}
            onApplyAll={handleApplyAll}
            onReset={handleReset}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onReorderTasks={handleReorderTasks}
            onMoveTask={handleMoveTask}
            onVisualize={() => setShowVisualization(true)}
            clearAfterApply={clearAfterApply}
            onClearAfterApplyChange={setClearAfterApply}
            cycleSettings={cycleSettings}
          />
        </div>
      </div>
    </div>
  );
}

