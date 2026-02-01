import React, { useState } from 'react';
import { format } from 'date-fns';
import { useSymptoms, SymptomType } from '@/hooks/useSymptoms';
import { 
  X, 
  Plus, 
  Activity, 
  Zap, 
  Circle, 
  Brain, 
  Moon, 
  TrendingUp, 
  Heart, 
  Flame, 
  AlertCircle, 
  Droplet, 
  Utensils, 
  RotateCw,
  Smile,
  AlertTriangle,
  Waves,
  Battery,
  Frown,
  Sparkles,
  Layers,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SYMPTOM_LABELS: Record<SymptomType, { label: string; icon: LucideIcon; category: 'physical' | 'emotional' }> = {
  cramps: { label: 'Cramps', icon: Zap, category: 'physical' },
  bloating: { label: 'Bloating', icon: Circle, category: 'physical' },
  headache: { label: 'Headache', icon: Brain, category: 'physical' },
  fatigue: { label: 'Fatigue', icon: Moon, category: 'physical' },
  mood_swings: { label: 'Mood Swings', icon: TrendingUp, category: 'emotional' },
  anxiety: { label: 'Anxiety', icon: Heart, category: 'emotional' },
  irritability: { label: 'Irritability', icon: Flame, category: 'emotional' },
  back_pain: { label: 'Back Pain', icon: AlertCircle, category: 'physical' },
  breast_tenderness: { label: 'Breast Tenderness', icon: Heart, category: 'physical' },
  nausea: { label: 'Nausea', icon: AlertCircle, category: 'physical' },
  acne: { label: 'Acne', icon: Circle, category: 'physical' },
  insomnia: { label: 'Insomnia', icon: Moon, category: 'physical' },
  food_cravings: { label: 'Food Cravings', icon: Utensils, category: 'physical' },
  constipation: { label: 'Constipation', icon: Circle, category: 'physical' },
  diarrhea: { label: 'Diarrhea', icon: Droplet, category: 'physical' },
  dizziness: { label: 'Dizziness', icon: RotateCw, category: 'physical' },
  happy: { label: 'Happy', icon: Smile, category: 'emotional' },
  anxious: { label: 'Anxious', icon: AlertTriangle, category: 'emotional' },
  calm: { label: 'Calm', icon: Waves, category: 'emotional' },
  stressed: { label: 'Stressed', icon: AlertTriangle, category: 'emotional' },
  energetic: { label: 'Energetic', icon: Battery, category: 'emotional' },
  sad: { label: 'Sad', icon: Frown, category: 'emotional' },
  excited: { label: 'Excited', icon: Sparkles, category: 'emotional' },
  overwhelmed: { label: 'Overwhelmed', icon: Layers, category: 'emotional' },
};

const COMMON_SYMPTOMS: SymptomType[] = [
  'happy',
  'anxious',
  'calm',
  'stressed',
  'energetic',
  'sad',
  'excited',
  'overwhelmed',
  'cramps',
  'bloating',
  'headache',
  'fatigue',
];

interface SymptomTaggingProps {
  date?: Date;
}

export function SymptomTagging({ date = new Date() }: SymptomTaggingProps) {
  const { getSymptomsForDate, toggleSymptom } = useSymptoms();
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);

  const currentSymptoms = getSymptomsForDate(date);
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const availableSymptoms = showAllSymptoms
    ? (Object.keys(SYMPTOM_LABELS) as SymptomType[])
    : COMMON_SYMPTOMS;

  const handleSymptomClick = (symptom: SymptomType) => {
    toggleSymptom(date, symptom);
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">
            {isToday ? 'Vibe Check' : `Symptoms - ${format(date, 'MMM d')}`}
          </h3>
        </div>
        {currentSymptoms.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {currentSymptoms.length} tagged
          </span>
        )}
      </div>

      {/* Display current symptoms as tags */}
      {currentSymptoms.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {currentSymptoms.map((symptom) => {
            const info = SYMPTOM_LABELS[symptom];
            const IconComponent = info.icon;
            return (
              <button
                key={symptom}
                onClick={() => handleSymptomClick(symptom)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                  'bg-primary/10 text-primary border border-primary/20',
                  'hover:bg-primary/20 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50'
                )}
              >
                <IconComponent className="h-3.5 w-3.5" />
                <span className="font-medium">{info.label}</span>
                <X className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-4">
          {isToday 
            ? "How are you feeling today? Tap to log your vibe and any symptoms."
            : "No symptoms logged for this day. Tap to add symptoms you're experiencing."}
        </p>
      )}

      {/* Quick add buttons */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {availableSymptoms.map((symptom) => {
            const info = SYMPTOM_LABELS[symptom];
            const IconComponent = info.icon;
            const isSelected = currentSymptoms.includes(symptom);
            return (
              <button
                key={symptom}
                onClick={() => handleSymptomClick(symptom)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
                  'border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50',
                  isSelected
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/30 text-muted-foreground border-muted/40 hover:bg-muted/50'
                )}
              >
                <IconComponent className="h-3.5 w-3.5" />
                <span>{info.label}</span>
                {isSelected && <X className="h-3 w-3 ml-1" />}
              </button>
            );
          })}
        </div>

        {!showAllSymptoms && (
          <button
            onClick={() => setShowAllSymptoms(true)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>Show more symptoms</span>
          </button>
        )}

        {showAllSymptoms && (
          <button
            onClick={() => setShowAllSymptoms(false)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            <span>Show less</span>
          </button>
        )}
      </div>

      {currentSymptoms.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-muted/40">
          Tracking symptoms helps identify patterns and can be useful for health discussions with your doctor.
        </p>
      )}
    </div>
  );
}

