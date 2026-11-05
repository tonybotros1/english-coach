/**
 * Builds a 12-week plan from placement results. Pure functions only.
 *
 * - Time: each study day starts with review cards (spaced practice and retrieval, the two methods
 *   Dunlosky et al. 2013 rate most effective), then lessons.
 * - Balance: lessons are spread over Paul Nation's four strands (language study, meaning-focused input,
 *   meaning-focused output, fluency), and no day repeats a strand back to back.
 * - Focus: skills further below the target, and the weakest skill, get more minutes.
 * - Rhythm: the last study day of each week is a weekly review; every fourth week ends with a checkpoint test.
 */
import { addDays } from '../dates';
import { GRAMMAR_TOPICS, SKILLS, SPEAKING_TASKS, TEXT_TYPES, WRITING_TASKS, themesFor, type Goal, type Skill, type Strand } from './content';

export const PLAN_WEEKS = 12;
export const MINUTE_CHOICES = [15, 30, 45, 60] as const;
/** Cambridge English: roughly 200 guided learning hours to move up one CEFR level. */
export const HOURS_PER_LEVEL = 200;

export type Settings = { goal: Goal; target: number; minutes: (typeof MINUTE_CHOICES)[number]; days: number };
export type Levels = Record<Skill, number>;
export type TaskKind = Skill | 'review' | 'weekly' | 'checkpoint';
export type Task = { id: string; kind: TaskKind; minutes: number; title: string; topic: string | null; level: number | null; strand: Strand | null };
export type Day = { date: string; type: 'study' | 'review' | 'checkpoint' | 'rest'; tasks: Task[] };
export type Week = { n: number; focus: string; days: Day[] };
export type Plan = { startDate: string; weeks: Week[]; weights: Levels; focusSkills: Skill[] };

const BASE_MINUTES: Record<Skill, number> = { grammar: 15, vocabulary: 10, reading: 15, listening: 10, writing: 15, speaking: 10 };
const clampLevel = (n: number) => Math.max(1, Math.min(6, Math.floor(n + 1e-9)));

/** How much each skill should get: 1, plus extra for the gap to the target, plus a bonus for the weakest. */
export function skillWeights(levels: Levels, target: number): Levels {
  const min = Math.min(...SKILLS.map((s) => levels[s.key]));
  const w = {} as Levels;
  for (const s of SKILLS) w[s.key] = Math.round((1 + Math.max(0, target - levels[s.key]) * 0.75 + (levels[s.key] === min ? 0.5 : 0)) * 100) / 100;
  return w;
}

export const reviewMinutes = (minutes: number) => (minutes <= 15 ? 5 : 10);
/** New review cards introduced per day, so mistakes come back steadily instead of all at once. */
export const newCardsPerDay = (minutes: number) => Math.max(5, Math.round(minutes / 3));

export function buildPlan(settings: Settings, levels: Levels, startDate: string): Plan {
  const { minutes: M, days: D, target, goal } = settings;
  const scale = M >= 60 ? 1.5 : 1;
  const lessonLength = (k: Skill) => Math.max(10, Math.round((BASE_MINUTES[k] * scale) / 5) * 5);
  const reviewMin = reviewMinutes(M);
  const lessonTime = M - reviewMin;
  const weights = skillWeights(levels, target);
  const weightSum = SKILLS.reduce((a, s) => a + weights[s.key], 0);
  const counters: Record<Skill, number> = { grammar: 0, vocabulary: 0, reading: 0, listening: 0, writing: 0, speaking: 0 };
  const themes = themesFor(goal, levels.vocabulary);

  const lesson = (k: Skill, minutes: number, date: string): Task => {
    const L = clampLevel(levels[k]);
    const i = counters[k]++;
    const strand = SKILLS.find((s) => s.key === k)!.strand;
    let topic: string;
    let title: string;
    if (k === 'grammar') {
      // Mostly the learner's level, with the next level's points mixed in as a stretch.
      const list = [...GRAMMAR_TOPICS[L], ...(L < 6 ? GRAMMAR_TOPICS[L + 1] : [])];
      topic = list[i % list.length];
      title = `Grammar: ${topic}`;
    } else if (k === 'vocabulary') {
      topic = themes[i % themes.length];
      title = `Vocabulary: ${topic}`;
    } else if (k === 'reading') {
      topic = `${TEXT_TYPES[i % TEXT_TYPES.length]} about ${themes[(i * 3 + 1) % themes.length].toLowerCase()}`;
      title = `Reading: ${topic}`;
    } else if (k === 'listening') {
      topic = themes[(i * 2 + 2) % themes.length];
      title = `Listening: ${topic}`;
    } else if (k === 'writing') {
      topic = WRITING_TASKS[L][i % WRITING_TASKS[L].length];
      title = `Writing: ${topic}`;
    } else {
      topic = SPEAKING_TASKS[L][i % SPEAKING_TASKS[L].length];
      title = `Speaking: ${topic}`;
    }
    return { id: `${date}-${k}`, kind: k, minutes, title, topic, level: L, strand };
  };
  const fixed = (kind: 'review' | 'weekly' | 'checkpoint', minutes: number, date: string): Task => ({
    id: `${date}-${kind}`,
    kind,
    minutes,
    title: kind === 'review' ? 'Review cards' : kind === 'weekly' ? "Weekly review: this week's cards and a short quiz" : 'Checkpoint test: measure your progress',
    topic: null,
    level: null,
    // Review is retrieval practice across all skills, so it sits outside the four lesson strands.
    strand: null,
  });

  // Each skill's share of all lesson time. Shares carry across the whole plan, so a skill that needs
  // three times the practice really gets about three times the minutes over 12 weeks.
  // Half of the time follows the learner's needs; the other half keeps Nation's four strands equal,
  // so no strand (fluency especially) is starved even when one area is far behind.
  const share = {} as Record<Skill, number>;
  const perStrand = (strand: Strand) => SKILLS.filter((x) => x.strand === strand).length;
  for (const s of SKILLS) share[s.key] = 0.5 * (weights[s.key] / weightSum) + 0.5 * (0.25 / perStrand(s.strand));
  const given: Record<Skill, number> = { grammar: 0, vocabulary: 0, reading: 0, listening: 0, writing: 0, speaking: 0 };
  let assigned = 0;

  const weeks: Week[] = [];
  for (let wk = 0; wk < PLAN_WEEKS; wk++) {
    const days: Day[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(startDate, wk * 7 + d);
      if (d >= D) {
        days.push({ date, type: 'rest', tasks: [] });
        continue;
      }
      if (d === D - 1 && D > 1) {
        const checkpoint = (wk + 1) % 4 === 0;
        days.push({
          date,
          type: checkpoint ? 'checkpoint' : 'review',
          tasks: [fixed('review', reviewMin, date), fixed(checkpoint ? 'checkpoint' : 'weekly', checkpoint ? Math.max(30, lessonTime) : lessonTime, date)],
        });
        continue;
      }
      const tasks = [fixed('review', reviewMin, date)];
      let left = lessonTime;
      const used = new Set<Skill>();
      const strands = new Set<Strand>();
      let last: Strand | null = null;
      while (left >= 8) {
        const candidates = SKILLS.filter((s) => !used.has(s.key));
        if (!candidates.length) break;
        let best = candidates[0];
        let bestScore = -Infinity;
        for (const s of candidates) {
          // How far behind its share this skill is, in lessons, plus a nudge towards variety within the day.
          const deficit = (share[s.key] * (assigned + lessonLength(s.key)) - given[s.key]) / 10;
          let score = deficit;
          if (s.strand !== last) score += 0.35;
          if (!strands.has(s.strand)) score += 0.5;
          if (score > bestScore) {
            bestScore = score;
            best = s;
          }
        }
        let m = Math.min(lessonLength(best.key), left);
        // Never leave a few spare minutes at the end of the day: the last lesson absorbs them.
        if (left - m > 0 && left - m < 8) m = left;
        tasks.push(lesson(best.key, m, date));
        given[best.key] += m;
        assigned += m;
        left -= m;
        used.add(best.key);
        strands.add(best.strand);
        last = best.strand;
      }
      days.push({ date, type: 'study', tasks });
    }
    const all = days.flatMap((x) => x.tasks);
    const g = all.find((t) => t.kind === 'grammar');
    const v = all.find((t) => t.kind === 'vocabulary');
    weeks.push({ n: wk + 1, days, focus: [g?.topic, v?.topic].filter(Boolean).join(' · ') || 'Mixed skills' });
  }
  const focusSkills = [...SKILLS].sort((a, b) => weights[b.key] - weights[a.key]).slice(0, 2).map((s) => s.key);
  return { startDate, weeks, weights, focusSkills };
}

/** How long reaching the target should take at this pace, from the Cambridge guided-learning-hours guideline. */
export function estimate(settings: Pick<Settings, 'target' | 'minutes' | 'days'>, overall: number) {
  const gap = Math.max(0, settings.target - overall);
  const hours = Math.round(gap * HOURS_PER_LEVEL);
  const hoursPerWeek = (settings.minutes * settings.days) / 60;
  const weeks = hoursPerWeek > 0 ? Math.ceil(hours / hoursPerWeek) : 0;
  return {
    hours,
    hoursPerWeek: Math.round(hoursPerWeek * 10) / 10,
    weeks,
    months: gap > 0 ? Math.max(1, Math.round(weeks / 4.345)) : 0,
    planHours: Math.round(hoursPerWeek * PLAN_WEEKS),
  };
}

/** Lesson minutes per strand over the whole plan, to show the balance. */
export function strandMinutes(plan: Plan): Record<Strand, number> {
  const m: Record<Strand, number> = { language: 0, input: 0, output: 0, fluency: 0 };
  for (const w of plan.weeks) for (const d of w.days) for (const t of d.tasks) if (t.strand) m[t.strand] += t.minutes;
  return m;
}
