import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CycleSettings } from '@/types';
import { useTheme } from '@/components/theme-provider';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  cycleSettings: CycleSettings | null;
  onUpdateSettings: (settings: CycleSettings) => void;
  onResetAll: () => void;
}

export function SettingsModal({
  open,
  onClose,
  cycleSettings,
  onUpdateSettings,
  onResetAll,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [lastPeriodStart, setLastPeriodStart] = useState<string>(
    cycleSettings ? format(cycleSettings.lastPeriodStart, 'yyyy-MM-dd') : ''
  );
  const [cycleLength, setCycleLength] = useState(
    cycleSettings?.cycleLength ?? 28
  );
  const [periodLength, setPeriodLength] = useState(
    cycleSettings?.periodLength ?? 5
  );

  const handleSave = () => {
    onUpdateSettings({
      lastPeriodStart: new Date(lastPeriodStart),
      cycleLength,
      periodLength,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Appearance Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Appearance</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="w-full"
              >
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="w-full"
              >
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="w-full"
              >
                System
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastPeriod" className="text-sm font-medium">
              Last period start date
            </Label>
            <Input
              id="lastPeriod"
              type="date"
              value={lastPeriodStart}
              onChange={(e) => setLastPeriodStart(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cycleLength" className="text-sm font-medium">
              Average cycle length (days)
            </Label>
            <Input
              id="cycleLength"
              type="number"
              min={21}
              max={35}
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodLength" className="text-sm font-medium">
              Average period length (days)
            </Label>
            <Input
              id="periodLength"
              type="number"
              min={2}
              max={10}
              value={periodLength}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
              className="h-11"
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Reset All Data</p>
                <p className="text-xs text-muted-foreground">
                  Clear all tasks, todos, and cycle settings
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to reset all data?')) {
                    onResetAll();
                    onClose();
                  }
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
