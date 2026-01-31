import React from 'react';
import { Calendar, LayoutGrid, Settings, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  showCyclePhases: boolean;
  onToggleCyclePhases: () => void;
  onOpenSettings?: () => void;
}

export function Header({
  showCyclePhases,
  onToggleCyclePhases,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                CycleSync
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">
                Plan with your rhythm
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showCyclePhases ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleCyclePhases}
            className="gap-1.5 text-xs"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cycle View
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onOpenSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
