import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Heart, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CycleSettings } from '@/types';

interface OnboardingModalProps {
  open: boolean;
  onComplete: (settings: CycleSettings) => void;
}

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [lastPeriodStart, setLastPeriodStart] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);

  const handleSubmit = () => {
    onComplete({
      lastPeriodStart: new Date(lastPeriodStart),
      cycleLength,
      periodLength,
    });
  };

  const steps = [
    {
      title: 'Welcome to CycleSync',
      description:
        'Your personal cycle-aware planning companion. We help you plan your life in harmony with your natural rhythm.',
      icon: <Sparkles className="h-12 w-12 text-primary" />,
    },
    {
      title: 'Your Health Data Stays Private',
      description:
        'All your cycle data is stored locally on your device. We never share or upload your personal health information.',
      icon: <Heart className="h-12 w-12 text-phase-period" />,
    },
    {
      title: "Let's Get Started",
      description:
        'Tell us a bit about your cycle so we can provide personalized insights.',
      icon: <Calendar className="h-12 w-12 text-accent" />,
    },
  ];

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md border-none shadow-elevated">
        <div className="animate-fade-in">
          {step < 2 ? (
            <>
              <div className="flex flex-col items-center text-center py-6">
                <div className="mb-6 p-4 rounded-full bg-primary-light">
                  {steps[step].icon}
                </div>
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-semibold">
                    {steps[step].title}
                  </DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground">
                    {steps[step].description}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="flex justify-between items-center mt-6">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-8 rounded-full transition-colors ${
                        i <= step ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <Button onClick={() => setStep(step + 1)}>Continue</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center text-center pt-6 pb-4">
                <div className="mb-4 p-4 rounded-full bg-accent-light">
                  {steps[2].icon}
                </div>
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-2xl font-semibold">
                    {steps[2].title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {steps[2].description}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label htmlFor="lastPeriod" className="text-sm font-medium">
                    When did your last period start?
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
                  <p className="text-xs text-muted-foreground">
                    Typically 21-35 days. Average is 28 days.
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Typically 2-7 days. Average is 5 days.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleSubmit}>Get Started</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
