import { api } from './api';
import type { Section, SkillResult, Step, Summary } from './placement';

export type Goal = 'work' | 'health' | 'exam' | 'daily';
export type Strand = 'language' | 'input' | 'output' | 'fluency';
export type TaskKind = Section | 'review' | 'weekly' | 'checkpoint';
export type Task = { id: string; kind: TaskKind; minutes: number; title: string; topic: string | null; level: number | null; strand: Strand | null };
export type Day = { date: string; type: 'study' | 'review' | 'checkpoint' | 'rest'; tasks: Task[] };
export type Week = { n: number; focus: string; days: Day[] };
export type Settings = { goal: Goal; target: number; minutes: 15 | 30 | 45 | 60; days: number };

export type PlanView = {
  createdAt: string;
  settings: Settings;
  goalName: string;
  overall: number;
  levels: Record<Section, number>;
  estimate: { hours: number; hoursPerWeek: number; weeks: number; months: number; planHours: number };
  focusSkills: Section[];
  strands: Record<Strand, number>;
  startDate: string;
  endDate: string;
  weeks: Week[];
  today: { date: string; status: 'active' | 'ended' | 'not_started'; weekIndex: number; dayIndex: number };
};

export type SetupDefaults = {
  overall: { score: number; label: string };
  skills: Record<Section, SkillResult>;
  target: number;
  minTarget: number;
  goal: Goal;
  minutes: number;
  days: number;
};

export type CardCounts = { due: number; newToday: number; newWaiting: number; reviewedToday: number; total: number };

export type TodayView = {
  date: string;
  placement: { latest: Summary | null; active: Step | null };
  plan: {
    status: 'active' | 'ended' | 'not_started';
    week: number;
    weeks: number;
    dayOfWeek: number;
    dayType: Day['type'] | null;
    focus: string | null;
    tasks: Task[];
    target: number;
    minutes: number;
  } | null;
  cards: CardCounts;
};

export type ReviewCard = {
  id: string;
  skill: string;
  front: {
    prompt: string;
    passage: { title: string; text: string } | null;
    lines: { speaker: 'A' | 'B'; text: string }[] | null;
    instruction: string | null;
  };
  back: { answer: string; explanation: string; yourAnswer: string | null; transcript: string | null };
  isNew: boolean;
  reps: number;
  intervals: { again: string; hard: string; good: string; easy: string };
};

export const GOAL_INFO: Record<Goal, { name: string; detail: string; icon: 'briefcase-outline' | 'medkit-outline' | 'school-outline' | 'airplane-outline' }> = {
  work: { name: 'Work and career', detail: 'Meetings, emails, presentations', icon: 'briefcase-outline' },
  health: { name: 'Healthcare work', detail: 'Patients, colleagues, clinical English', icon: 'medkit-outline' },
  exam: { name: 'IELTS or another exam', detail: 'Academic topics and exam skills', icon: 'school-outline' },
  daily: { name: 'Daily life and travel', detail: 'Shopping, travel, conversations', icon: 'airplane-outline' },
};

/** Same guideline the server uses: about 200 guided learning hours per CEFR level (Cambridge English). */
export function estimateWeeks(overall: number, target: number, minutes: number, days: number) {
  const hours = Math.max(0, target - overall) * 200;
  const perWeek = (minutes * days) / 60;
  return { hours: Math.round(hours), perWeek, weeks: perWeek ? Math.ceil(hours / perWeek) : 0 };
}

export const planApi = {
  today: (token: string) => api<TodayView>('/api/today', { token }),
  get: (token: string) => api<{ plan: PlanView | null; setup: SetupDefaults | null }>('/api/plan', { token }),
  create: (token: string, settings: Settings) => api<{ plan: PlanView }>('/api/plan', { method: 'POST', body: settings, token }),
  session: (token: string) => api<{ counts: CardCounts; cards: ReviewCard[] }>('/api/cards/session', { token }),
  review: (token: string, cardId: string, rating: 1 | 2 | 3 | 4, reps: number) =>
    api<{ card: ReviewCard; due: string; soon: boolean }>('/api/cards/review', { method: 'POST', body: { cardId, rating, reps }, token }),
};
