import React, { useState } from 'react';
import { Plus, Check, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuickTodo } from '@/types';
import { cn } from '@/lib/utils';

interface QuickTodoListProps {
  todos: QuickTodo[];
  onAddTodo: (title: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onClearCompleted: () => void;
}

export function QuickTodoList({
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onClearCompleted,
}: QuickTodoListProps) {
  const [newTodo, setNewTodo] = useState('');

  const handleAdd = () => {
    if (!newTodo.trim()) return;
    onAddTodo(newTodo);
    setNewTodo('');
  };

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Quick To-Dos</h2>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {activeTodos.length} active
        </span>
      </div>

      <div className="p-4">
        {/* Add new todo */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Add a quick task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1"
          />
          <Button size="icon" onClick={handleAdd} disabled={!newTodo.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Active todos */}
        <div className="space-y-2 mb-4">
          {activeTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <button
                onClick={() => onToggleTodo(todo.id)}
                className="flex-shrink-0 h-5 w-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary transition-colors flex items-center justify-center"
              >
                <Check className="h-3 w-3 text-transparent" />
              </button>
              <span className="flex-1 text-sm text-foreground">{todo.title}</span>
              <button
                onClick={() => onDeleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>

        {/* Completed todos */}
        {completedTodos.length > 0 && (
          <>
            <div className="flex items-center justify-between py-2 mb-2">
              <span className="text-xs text-muted-foreground font-medium">
                Completed ({completedTodos.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCompleted}
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                Clear all
              </Button>
            </div>
            <div className="space-y-2">
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 group"
                >
                  <button
                    onClick={() => onToggleTodo(todo.id)}
                    className="flex-shrink-0 h-5 w-5 rounded-full bg-accent border-2 border-accent flex items-center justify-center"
                  >
                    <Check className="h-3 w-3 text-accent-foreground" />
                  </button>
                  <span className="flex-1 text-sm text-muted-foreground line-through">
                    {todo.title}
                  </span>
                  <button
                    onClick={() => onDeleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {todos.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No tasks yet. Add your first quick to-do!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
