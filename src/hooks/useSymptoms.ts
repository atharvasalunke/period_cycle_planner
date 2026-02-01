import { useMemo } from 'react';
import { format } from 'date-fns';
import { useLocalStorage } from './useLocalStorage';

export type SymptomType = 
  | 'cramps'
  | 'bloating'
  | 'headache'
  | 'fatigue'
  | 'mood_swings'
  | 'anxiety'
  | 'irritability'
  | 'back_pain'
  | 'breast_tenderness'
  | 'nausea'
  | 'acne'
  | 'insomnia'
  | 'food_cravings'
  | 'constipation'
  | 'diarrhea'
  | 'dizziness'
  | 'happy'
  | 'anxious'
  | 'calm'
  | 'stressed'
  | 'energetic'
  | 'sad'
  | 'excited'
  | 'overwhelmed';

export interface SymptomEntry {
  date: string; // YYYY-MM-DD
  symptoms: SymptomType[];
}

interface SymptomsData {
  entries: SymptomEntry[];
}

const DEFAULT_SYMPTOMS: SymptomsData = {
  entries: [],
};

export function useSymptoms() {
  const [symptomsData, setSymptomsData] = useLocalStorage<SymptomsData>(
    'symptoms',
    DEFAULT_SYMPTOMS
  );

  const getSymptomsForDate = (date: Date): SymptomType[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const entry = symptomsData.entries.find((e) => e.date === dateKey);
    return entry?.symptoms || [];
  };

  const addSymptom = (date: Date, symptom: SymptomType) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setSymptomsData((prev) => {
      const existingEntry = prev.entries.find((e) => e.date === dateKey);
      if (existingEntry) {
        if (!existingEntry.symptoms.includes(symptom)) {
          return {
            entries: prev.entries.map((e) =>
              e.date === dateKey
                ? { ...e, symptoms: [...e.symptoms, symptom] }
                : e
            ),
          };
        }
        return prev; // Symptom already exists
      }
      return {
        entries: [...prev.entries, { date: dateKey, symptoms: [symptom] }],
      };
    });
  };

  const removeSymptom = (date: Date, symptom: SymptomType) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setSymptomsData((prev) => {
      const existingEntry = prev.entries.find((e) => e.date === dateKey);
      if (!existingEntry) return prev;

      const updatedSymptoms = existingEntry.symptoms.filter((s) => s !== symptom);
      if (updatedSymptoms.length === 0) {
        // Remove entry if no symptoms left
        return {
          entries: prev.entries.filter((e) => e.date !== dateKey),
        };
      }
      return {
        entries: prev.entries.map((e) =>
          e.date === dateKey ? { ...e, symptoms: updatedSymptoms } : e
        ),
      };
    });
  };

  const toggleSymptom = (date: Date, symptom: SymptomType) => {
    const currentSymptoms = getSymptomsForDate(date);
    if (currentSymptoms.includes(symptom)) {
      removeSymptom(date, symptom);
    } else {
      addSymptom(date, symptom);
    }
  };

  const getAllEntries = () => {
    return symptomsData.entries;
  };

  return {
    getSymptomsForDate,
    addSymptom,
    removeSymptom,
    toggleSymptom,
    getAllEntries,
  };
}

