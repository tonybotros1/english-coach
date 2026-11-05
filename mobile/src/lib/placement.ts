import { api } from './api';

export type Section = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing' | 'speaking';
export type Method = 'staircase' | 'ai' | 'estimate';
export type SkillResult = { score: number; label: string; method: Method };

export type PublicItem = {
  id: string;
  prompt: string;
  options: string[];
  passage: { title: string; text: string } | null;
  lines: { speaker: 'A' | 'B'; text: string }[] | null;
};

type StepBase = { testId: string; section: Section; sectionIndex: number; sectionCount: number; sectionStart: boolean; progress: number };
export type Step =
  | (StepBase & { kind: 'mcq'; item: PublicItem; questionNumber: number })
  | (StepBase & { kind: 'writing'; prompt: { id: string; text: string }; targetWords: { min: number; max: number }; maxChars: number })
  | (StepBase & { kind: 'speaking'; taskIndex: number; taskCount: number; prompt: { id: string; text: string }; maxSeconds: number })
  | { kind: 'done'; testId: string; progress: 1 };

export type Summary = { testId: string; completedAt: string; overall: { score: number; label: string }; skills: Record<Section, SkillResult> };

export type Mistake = {
  section: Section;
  itemId: string;
  prompt: string;
  chosen: string;
  correct: string;
  explanation: string;
  topic: string | null;
  passageTitle: string | null;
  transcript: string | null;
};

export type Results = {
  testId: string;
  completedAt: string;
  overall: { score: number; label: string };
  skills: Record<Section, SkillResult>;
  weakest: Section[];
  summary: string;
  equivalents: { ielts: string; toeflIbt: string; toeflBand: string; cambridge: string; cambridgeScale: string };
  mistakes: Mistake[];
  minutes: number;
  notes: string[];
  writing: {
    prompt: string;
    text: string | null;
    feedback: {
      summary: string;
      criteria: Record<'content' | 'organisation' | 'range' | 'accuracy', number>;
      strengths: string[];
      improvements: string[];
      corrections: { original: string; corrected: string; note: string }[];
    } | null;
  };
  speaking: {
    feedback: {
      summary: string;
      criteria: Record<'range' | 'accuracy' | 'fluency' | 'coherence' | 'pronunciation', number>;
      strengths: string[];
      improvements: string[];
    } | null;
    answers: {
      prompt: string;
      seconds: number | null;
      skipped: boolean;
      transcript: string | null;
      scores: { pronunciation: number | null; accuracy: number | null; fluency: number | null; prosody: number | null } | null;
    }[];
  };
};

export const SECTION_INFO: Record<Section, { name: string; icon: 'text-outline' | 'book-outline' | 'reader-outline' | 'headset-outline' | 'create-outline' | 'mic-outline'; minutes: number; help: string }> = {
  grammar: {
    name: 'Grammar',
    icon: 'text-outline',
    minutes: 5,
    help: 'Choose the word or phrase that best completes each sentence. The questions get harder or easier depending on your answers.',
  },
  vocabulary: { name: 'Vocabulary', icon: 'book-outline', minutes: 4, help: 'Choose the word that best fits each sentence.' },
  reading: { name: 'Reading', icon: 'reader-outline', minutes: 7, help: 'Read each text, then answer three questions about it.' },
  listening: {
    name: 'Listening',
    icon: 'headset-outline',
    minutes: 5,
    help: 'Read the question first, then play the recording. You can play each recording twice. Turn your volume up.',
  },
  writing: { name: 'Writing', icon: 'create-outline', minutes: 6, help: 'Write as much as you can. If you are a beginner, a few simple sentences are fine.' },
  speaking: {
    name: 'Speaking',
    icon: 'mic-outline',
    minutes: 3,
    help: 'Answer two questions out loud, up to 30 seconds each. Speak naturally, as if talking to a person. Find a quiet place.',
  },
};

export const placementApi = {
  status: (token: string) => api<{ active: Step | null; latest: Summary | null }>('/api/placement', { token }),
  start: (token: string, restart = false) => api<{ step: Step }>('/api/placement/start', { method: 'POST', body: { restart }, token }),
  answer: (token: string, testId: string, itemId: string, choice: number) =>
    api<{ step: Step }>('/api/placement/answer', { method: 'POST', body: { testId, itemId, choice }, token }),
  writing: (token: string, testId: string, text: string) => api<{ step: Step }>('/api/placement/writing', { method: 'POST', body: { testId, text }, token }),
  speaking: (token: string, form: FormData) => api<{ step: Step }>('/api/placement/speaking', { method: 'POST', form, token }),
  abandon: (token: string, testId: string) => api<{ ok: true }>('/api/placement/abandon', { method: 'POST', body: { testId }, token }),
  results: (token: string, testId: string) => api<{ results: Results }>(`/api/placement/results/${encodeURIComponent(testId)}`, { token }),
};

export const LEVELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
