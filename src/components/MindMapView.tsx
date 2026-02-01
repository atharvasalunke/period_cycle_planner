import React, { useState, useMemo } from 'react';
import { Calendar, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrganizeTask } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CycleSettings } from '@/types';
import { getCyclePhase } from '@/lib/cycle-utils';
import { parseDateInput } from '@/lib/date';

interface MindMapViewProps {
  tasks: OrganizeTask[];
  onUpdateTask: (index: number, task: Partial<OrganizeTask>) => void;
  onDeleteTask: (index: number) => void;
  onMoveTask: (taskIndex: number, newCategory: string | null) => void;
  cycleSettings?: CycleSettings | null;
}

const phaseDots: Record<string, string> = {
  period: 'bg-phase-period',
  follicular: 'bg-phase-follicular',
  ovulation: 'bg-phase-ovulation',
  luteal: 'bg-phase-luteal',
};

const CATEGORIES = [
  { id: 'work', label: 'Work', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'personal', label: 'Personal', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'health', label: 'Health', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'school', label: 'School', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { id: 'shopping', label: 'Shopping', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { id: 'finance', label: 'Finance', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { id: 'social', label: 'Social', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { id: 'creative', label: 'Creative', color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { id: 'other', label: 'Other', color: 'bg-gray-50 border-gray-200 text-gray-700' },
  { id: null, label: 'Uncategorized', color: 'bg-slate-50 border-slate-200 text-slate-700' },
];

export function MindMapView({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
  cycleSettings,
}: MindMapViewProps) {
  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // Group tasks by category
  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, { task: OrganizeTask; index: number }[]> = {
      work: [],
      personal: [],
      health: [],
      school: [],
      shopping: [],
      finance: [],
      social: [],
      creative: [],
      other: [],
      uncategorized: [],
    };

    tasks.forEach((task, index) => {
      const category = task.category || 'uncategorized';
      if (grouped[category]) {
        grouped[category].push({ task, index });
      } else {
        grouped.uncategorized.push({ task, index });
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskIndex: number) => {
    setDraggedTaskIndex(taskIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskIndex.toString());
  };

  const handleDragOver = (e: React.DragEvent, category: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCategory(category);
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = (e: React.DragEvent, category: string | null) => {
    e.preventDefault();
    if (draggedTaskIndex !== null) {
      const currentCategory = tasks[draggedTaskIndex].category;
      if (currentCategory !== category) {
        onMoveTask(draggedTaskIndex, category);
      }
    }
    setDraggedTaskIndex(null);
    setDragOverCategory(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskIndex(null);
    setDragOverCategory(null);
  };

  return (
    <div 
      className="flex gap-4 overflow-x-auto pb-4 w-full" 
      style={{ minHeight: '500px', width: 'max-content' }}
    >
      {CATEGORIES.map((category) => {
        // Always show all categories, even if empty
        const categoryKey = category.id || 'uncategorized';
        const categoryTasks = tasksByCategory[categoryKey] || [];
        const isDraggingOver = dragOverCategory === category.id;

        return (
          <div
            key={category.id || 'uncategorized'}
            className={cn(
              "flex-shrink-0 w-72 rounded-xl border-2 transition-all shadow-sm",
              category.color,
              isDraggingOver && "ring-2 ring-primary ring-offset-2 scale-105 shadow-lg"
            )}
            onDragOver={(e) => handleDragOver(e, category.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, category.id)}
          >
            {/* Category Header */}
            <div className="px-4 py-3 border-b border-current/20 flex items-center justify-between bg-white/30 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{category.label}</h3>
                <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-medium">
                  {categoryTasks.length}
                </span>
              </div>
            </div>

            {/* Tasks Container */}
            <div className="p-3 space-y-2 min-h-[200px]">
              {categoryTasks.map(({ task, index }) => {
                const isDragging = draggedTaskIndex === index;
                return (
                  <div
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "bg-white rounded-lg border border-gray-200 p-3 space-y-2 group cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-gray-300",
                      isDragging && "opacity-50 scale-95 shadow-lg"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <Input
                        value={task.title}
                        onChange={(e) => onUpdateTask(index, { title: e.target.value })}
                        className="flex-1 text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="Task title"
                        onDragStart={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => onDeleteTask(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                    {task.dueDateISO && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <Input
                          type="date"
                          value={task.dueDateISO}
                          onChange={(e) =>
                            onUpdateTask(index, {
                              dueDateISO: e.target.value || null,
                            })
                          }
                          className="text-xs h-7 border-gray-200 bg-white"
                          onDragStart={(e) => e.stopPropagation()}
                        />
                        {cycleSettings && task.dueDateISO && (
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              phaseDots[getCyclePhase(parseDateInput(task.dueDateISO), cycleSettings).phase] || 'bg-muted-foreground'
                            )}
                            title={`${getCyclePhase(parseDateInput(task.dueDateISO), cycleSettings).phase.charAt(0).toUpperCase() + getCyclePhase(parseDateInput(task.dueDateISO), cycleSettings).phase.slice(1)} phase`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty State */}
              {categoryTasks.length === 0 && (
                <div className={cn(
                  "text-center py-8 text-sm rounded-lg border-2 border-dashed transition-all",
                  isDraggingOver ? "border-primary bg-primary/5" : "border-gray-200 text-gray-400"
                )}>
                  <p>{isDraggingOver ? "Drop here" : "Drop tasks here"}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
