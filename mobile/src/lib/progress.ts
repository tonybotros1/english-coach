import { api } from './api';
import type { Section, SkillResult } from './placement';

export type ProgressView = {
  today: string;
  streak: number;
  todayMinutes: number;
  weeks: { label: string; start: string; minutes: number; target: number | null; current: boolean }[];
  history: { testId: string; date: string; kind: 'placement' | 'checkpoint'; overall: { score: number; label: string }; skills: Record<Section, SkillResult> }[];
  cards: { total: number; new: number; learned: number; learning: number; reviews30: number; recall30: number | null };
  plan: { done: number; total: number; week: number; weeks: number } | null;
};

export type WeeklyQuestion = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  skill: string;
  missed: boolean;
  passage: { title: string; text: string } | null;
  lines: { speaker: 'A' | 'B'; text: string }[] | null;
};
export type WeeklyView = {
  id: string;
  taskId: string;
  week: number;
  questions: WeeklyQuestion[];
  lessonsDone: number;
  status: 'ready' | 'completed';
  result: { correct: number; total: number; seconds: number; cardsAdded: number } | null;
};

export const progressApi = {
  get: (token: string) => api<ProgressView>('/api/progress', { token }),
  openWeekly: (token: string, taskId: string) => api<{ weekly: WeeklyView }>('/api/weekly/open', { method: 'POST', body: { taskId }, token }),
  completeWeekly: (token: string, taskId: string, answers: number[], seconds: number) =>
    api<{ weekly: WeeklyView }>('/api/weekly/complete', { method: 'POST', body: { taskId, answers, seconds }, token }),
};
