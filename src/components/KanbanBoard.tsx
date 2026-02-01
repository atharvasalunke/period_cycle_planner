import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, GripVertical, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, TaskStatus, TaskPriority, CycleSettings } from '@/types';
import { cn } from '@/lib/utils';
import { getCyclePhase } from '@/lib/cycle-utils';

interface KanbanBoardProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  cycleSettings?: CycleSettings | null;
}

const columns: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'todo', title: 'To Do', color: 'border-t-muted-foreground' },
  { status: 'inProgress', title: 'In Progress', color: 'border-t-primary' },
  { status: 'done', title: 'Done', color: 'border-t-accent' },
];

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-task-low/20 text-task-low',
  medium: 'bg-task-medium/20 text-task-medium',
  high: 'bg-task-high/20 text-task-high',
};

const phaseDots: Record<string, string> = {
  period: 'bg-phase-period',
  follicular: 'bg-phase-follicular',
  ovulation: 'bg-phase-ovulation',
  luteal: 'bg-phase-luteal',
};

export function KanbanBoard({
  tasks,
  onAddTask,
  onMoveTask,
  onDeleteTask,
  cycleSettings,
}: KanbanBoardProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    onAddTask({
      title: newTaskTitle,
      status: 'todo',
      priority: newTaskPriority,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate) : undefined,
    });
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setIsAddingTask(false);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTaskId) {
      onMoveTask(draggedTaskId, status);
      setDraggedTaskId(null);
    }
  };

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status);

  return (
    <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Task Board</h2>
        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTaskPriority}
                  onValueChange={(v) => setNewTaskPriority(v as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAddingTask(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTask}>Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {columns.map((column) => (
          <div
            key={column.status}
            className={cn(
              'bg-muted/30 rounded-xl p-3 min-h-[300px] border-t-4',
              column.color
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-foreground">
                {column.title}
              </h3>
              <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                {getTasksByStatus(column.status).length}
              </span>
            </div>

            <div className="space-y-2">
              {getTasksByStatus(column.status).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className={cn(
                    'bg-card rounded-lg p-3 shadow-soft border cursor-grab active:cursor-grabbing transition-all hover:shadow-card group',
                    draggedTaskId === task.id && 'opacity-50'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium text-foreground',
                          task.status === 'done' && 'line-through text-muted-foreground'
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {task.priority && (
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                              priorityColors[task.priority]
                            )}
                          >
                            {task.priority}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(task.dueDate, 'MMM d')}
                            {cycleSettings && (
                              <span
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  phaseDots[getCyclePhase(task.dueDate, cycleSettings).phase] || 'bg-muted-foreground'
                                )}
                                title={`${getCyclePhase(task.dueDate, cycleSettings).phase.charAt(0).toUpperCase() + getCyclePhase(task.dueDate, cycleSettings).phase.slice(1)} phase`}
                              />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
