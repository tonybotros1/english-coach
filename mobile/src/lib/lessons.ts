import { api, ApiError } from './api';

export type Mcq = { prompt: string; options: string[]; answer: number; explanation: string };
type Line = { speaker: 'A' | 'B'; text: string };

export type LessonContent =
  | { kind: 'grammar'; title: string; explanation: string[]; examples: { sentence: string; note: string }[]; practice: Mcq[] }
  | {
      kind: 'vocabulary';
      title: string;
      words: { word: string; partOfSpeech: string; meaning: string; example: string; collocation: string }[];
      practice: Mcq[];
    }
  | { kind: 'reading'; title: string; text: string; glossary: { word: string; meaning: string }[]; questions: Mcq[] }
  | { kind: 'listening'; title: string; setting: string; lines: Line[]; questions: Mcq[]; dictation: string[] }
  | { kind: 'writing'; title: string; task: string; guidance: string[]; usefulLanguage: string[]; minWords: number; maxWords: number }
  | { kind: 'speaking'; title: string; shadowing: string[]; question: string; tips: string[] };

export type Scores = { pronunciation: number | null; accuracy: number | null; fluency: number | null; completeness: number | null; prosody: number | null };
export type ShadowResult = { sentence: string; recognized: string; scores: Scores; words: { word: string; accuracy: number | null; errorType: string }[] };
export type DictationResult = { sentence: string; typed: string; accuracy: number; words: { word: string; ok: boolean }[] };

export type LessonResult = {
  correct: number | null;
  total: number | null;
  dictation: DictationResult[] | null;
  writing: {
    text: string;
    feedback: {
      label: string;
      summary: string;
      criteria: Record<'content' | 'organisation' | 'range' | 'accuracy', number>;
      strengths: string[];
      improvements: string[];
      corrections: { original: string; corrected: string; note: string }[];
      improved: string;
    };
  } | null;
  speaking: {
    transcript: string;
    seconds: number;
    scores: Scores | null;
    feedback: { summary: string; strengths: string[]; improvements: string[]; criteria: Record<string, number> } | null;
    label: string | null;
  } | null;
  cardsAdded: number;
  seconds: number;
};

export type Lesson = {
  id: string;
  taskId: string;
  date: string;
  kind: LessonContent['kind'];
  level: number;
  levelName: string;
  topic: string;
  minutes: number;
  status: 'ready' | 'completed' | 'generating';
  content: LessonContent;
  shadowing: (ShadowResult | null)[];
  result: LessonResult | null;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const lessonApi = {
  /** Opens a lesson, waiting while the server writes it (up to about two minutes). */
  async open(token: string, taskId: string, signal?: { cancelled: boolean }): Promise<Lesson> {
    for (let i = 0; i < 40; i++) {
      if (signal?.cancelled) throw new ApiError('Cancelled.', 0, 'cancelled');
      const r = await api<{ status: 'ready' | 'generating'; lesson: Lesson | null }>('/api/lessons/open', { method: 'POST', body: { taskId }, token });
      if (r.status === 'ready' && r.lesson) return r.lesson;
      await wait(3000);
    }
    throw new ApiError('The lesson is taking too long to prepare. Try again in a minute.', 504, 'timeout');
  },
  complete: (token: string, lessonId: string, answers: number[], seconds: number, dictation?: string[]) =>
    api<{ lesson: Lesson }>('/api/lessons/complete', { method: 'POST', body: { lessonId, answers, seconds, ...(dictation ? { dictation } : {}) }, token }),
  writing: (token: string, lessonId: string, text: string, seconds: number) =>
    api<{ lesson: Lesson }>('/api/lessons/writing', { method: 'POST', body: { lessonId, text, seconds }, token }),
  shadow: (token: string, form: FormData) => api<{ result: ShadowResult }>('/api/lessons/shadow', { method: 'POST', form, token }),
  talk: (token: string, form: FormData) => api<{ lesson: Lesson }>('/api/lessons/talk', { method: 'POST', form, token }),
};
