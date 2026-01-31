import React, { useState } from 'react';
import { Calendar, Trash2, CheckCircle2, FileText, Lightbulb, X, GripVertical, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { OrganizeTask } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MixboardView } from './MixboardView';

interface AiOrganizerPanelProps {
  tasks: OrganizeTask[];
  notes: string[];
  suggestions: string[];
  followUps: string[];
  onApplyToBoard: () => void;
  onApplyToCalendar: () => void;
  onApplyAll: () => void;
  onReset: () => void;
  onUpdateTask: (index: number, task: Partial<OrganizeTask>) => void;
  onDeleteTask: (index: number) => void;
  onReorderTasks: (fromIndex: number, toIndex: number) => void;
  onMoveTask: (taskIndex: number, newCategory: string | null) => void;
  clearAfterApply: boolean;
  onClearAfterApplyChange: (value: boolean) => void;
}

export function AiOrganizerPanel({
  tasks,
  notes,
  suggestions,
  followUps,
  onApplyToBoard,
  onApplyToCalendar,
  onApplyAll,
  onReset,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
  onMoveTask,
  clearAfterApply,
  onClearAfterApplyChange,
}: AiOrganizerPanelProps) {
  const [viewMode, setViewMode] = useState<'mixboard' | 'list'>('mixboard');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const hasTasks = tasks.length > 0;
  const hasContent = hasTasks || notes.length > 0 || suggestions.length > 0;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderTasks(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (!hasContent) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden min-h-[600px] flex items-center justify-center">
        <div className="text-center p-8 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">Organized results will appear here</p>
          <p className="text-xs mt-2 opacity-60">Click "Organize with AI" to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden min-h-[600px] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">AI Organizer</h2>
          {hasTasks && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {tasks.length} tasks
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasTasks && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
              <Button
                variant={viewMode === 'mixboard' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mixboard')}
                className="h-7 px-2"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-7 px-2"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto space-y-6",
        viewMode === 'mixboard' ? "p-0" : "p-6"
      )}>
        {/* Detected Tasks */}
        {hasTasks && viewMode === 'mixboard' && (
          <div className="p-6">
            <MixboardView
              tasks={tasks}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onMoveTask={onMoveTask}
            />
          </div>
        )}
        {hasTasks && viewMode === 'list' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Detected Tasks
            </h3>
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <React.Fragment key={index}>
                  {/* Drop zone indicator above item */}
                  {dragOverIndex === index && draggedIndex !== null && draggedIndex < index && (
                    <div className="h-1 bg-primary rounded-full mx-4" />
                  )}
                  
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3 group hover:bg-gray-50 transition-all cursor-grab active:cursor-grabbing",
                      draggedIndex === index && "opacity-50 scale-95 shadow-lg",
                      dragOverIndex === index && draggedIndex !== index && "border-primary border-2 bg-primary/5"
                    )}
                  >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0 cursor-grab" />
                    <Input
                      value={task.title}
                      onChange={(e) =>
                        onUpdateTask(index, { title: e.target.value })
                      }
                      className="flex-1 text-sm border-gray-200 bg-white"
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
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={task.dueDateISO || ''}
                      onChange={(e) =>
                        onUpdateTask(index, {
                          dueDateISO: e.target.value || null,
                        })
                      }
                      className="text-xs h-8 border-gray-200 bg-white"
                    />
                    {task.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {task.category}
                      </span>
                    )}
                  </div>
                  </div>
                  
                  {/* Drop zone indicator below item */}
                  {dragOverIndex === index && draggedIndex !== null && draggedIndex > index && (
                    <div className="h-1 bg-primary rounded-full mx-4" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-600" />
              Notes
            </h3>
            <div className="space-y-2">
              {notes.map((note, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-gray-50 text-sm text-gray-600 border border-gray-100"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Suggestions
            </h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-amber-50 text-sm text-gray-700 border border-amber-100"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-ups */}
        {followUps.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Follow-up Questions
            </h3>
            <div className="space-y-2">
              {followUps.map((followUp, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground"
                >
                  {followUp}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 space-y-3 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Checkbox
            id="clear-after"
            checked={clearAfterApply}
            onCheckedChange={(checked) => onClearAfterApplyChange(checked === true)}
          />
          <Label
            htmlFor="clear-after"
            className="text-xs text-gray-600 cursor-pointer"
          >
            Clear brain dump after apply
          </Label>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={onApplyToBoard}
            variant="outline"
            size="sm"
            className="w-full border-gray-200 hover:bg-gray-50"
            disabled={!hasTasks}
          >
            Apply to Board
          </Button>
          <Button
            onClick={onApplyToCalendar}
            variant="outline"
            size="sm"
            className="w-full border-gray-200 hover:bg-gray-50"
            disabled={!hasTasks || !tasks.some((t) => t.dueDateISO)}
          >
            Apply to Calendar
          </Button>
          <Button
            onClick={onApplyAll}
            size="sm"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!hasTasks}
          >
            Apply All
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 pt-2 border-t border-gray-100">
          Nothing is added without your approval. Your data stays private.
        </p>
      </div>
    </div>
  );
}

