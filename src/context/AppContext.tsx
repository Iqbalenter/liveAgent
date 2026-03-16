import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface MealItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  type: 'food' | 'drink';
  description?: string;
}

export interface MealLog {
  id: string;
  timestamp: Date;
  items: MealItem[];
  totalCalories: number;
}

export interface HealthPlan {
  healthSummary: string;
  dietaryNotes: string;
  morningRoutineTitle: string;
  morningRoutineDesc: string;
  lunchRoutineTitle: string;
  lunchRoutineDesc: string;
  nightRoutineTitle: string;
  nightRoutineDesc: string;
  recommendedMedication: string;
}

interface AppState {
  calorieGoal: number;
  caloriesConsumed: number;
  proteinConsumed: number;
  fatConsumed: number;
  carbsConsumed: number;
  logs: MealLog[];
  addLog: (log: MealLog) => void;
  healthPlan: HealthPlan | null;
  setHealthPlan: (plan: HealthPlan) => void;
}

const initialState: AppState = {
  calorieGoal: 2000,
  caloriesConsumed: 0,
  proteinConsumed: 0,
  fatConsumed: 0,
  carbsConsumed: 0,
  logs: [],
  addLog: () => { },
  healthPlan: null,
  setHealthPlan: () => { },
};

const AppContext = createContext<AppState>(initialState);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [healthPlan, setHealthPlan] = useState<HealthPlan | null>(null);

  const addLog = (log: MealLog) => {
    setLogs((prev) => [log, ...prev]);
    setHealthPlan(null); // Clear previous plan so it regenerates based on new logs
  };

  const caloriesConsumed = logs.reduce((sum, log) => sum + log.totalCalories, 0);
  const proteinConsumed = logs.reduce((sum, log) => sum + log.items.reduce((s, i) => s + i.protein, 0), 0);
  const fatConsumed = logs.reduce((sum, log) => sum + log.items.reduce((s, i) => s + i.fat, 0), 0);
  const carbsConsumed = logs.reduce((sum, log) => sum + log.items.reduce((s, i) => s + i.carbs, 0), 0);

  return (
    <AppContext.Provider
      value={{
        calorieGoal: 2000,
        caloriesConsumed,
        proteinConsumed,
        fatConsumed,
        carbsConsumed,
        logs,
        addLog,
        healthPlan,
        setHealthPlan,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
