/** Writing and speaking tasks for the placement test. One of each set is chosen per test, preferring ones the learner has not seen. */
export type WritingPrompt = { id: string; text: string };
export type SpeakingBand = 'low' | 'mid' | 'high' | 'top';
export type SpeakingPrompt = { id: string; band: SpeakingBand; text: string };

/** Open tasks that every level can answer: beginners write a few sentences, advanced learners show their range. */
export const WRITING_PROMPTS: readonly WritingPrompt[] = [
  {
    id: 'w-1',
    text: 'Describe your job or your studies. Then write about a recent challenge: what happened, how you dealt with it, and what you would do differently next time.',
  },
  {
    id: 'w-2',
    text: 'Write an email to a friend about a change in your life, for example a new job, a new home or a new hobby. Explain what changed, how you feel about it, and what you are planning next.',
  },
  {
    id: 'w-3',
    text: 'Many people now work or study from home on some days. Describe how you prefer to work or study, and give your opinion: what are the advantages and disadvantages of working from home?',
  },
];
export const WRITING_TARGET_WORDS = { min: 120, max: 180 };
export const WRITING_MAX_CHARS = 4000;

/** The first speaking task is the same kind for everyone; the second matches the level found so far. */
export const SPEAKING_INTRO: readonly SpeakingPrompt[] = [
  { id: 's-1a', band: 'low', text: 'Tell me about yourself: where you live, what you do, and what you like doing in your free time.' },
  { id: 's-1b', band: 'low', text: 'Describe a normal day for you, from the morning to the evening.' },
  { id: 's-1c', band: 'low', text: 'Tell me about your family or the people you live with.' },
];
export const SPEAKING_LEVELLED: readonly SpeakingPrompt[] = [
  { id: 's-2-low-a', band: 'low', text: 'What did you do last weekend? Tell me about it.' },
  { id: 's-2-low-b', band: 'low', text: 'Describe your home. What is your favourite room, and why?' },
  { id: 's-2-mid-a', band: 'mid', text: 'Talk about a place you would like to visit. Why do you want to go there, and what would you do?' },
  { id: 's-2-mid-b', band: 'mid', text: 'Describe a skill you learned recently. How did you learn it, and was it difficult?' },
  { id: 's-2-high-a', band: 'high', text: 'Some people say that working from home is better than working in an office. Do you agree? Give your reasons.' },
  { id: 's-2-high-b', band: 'high', text: 'Should children use smartphones before the age of twelve? Explain your view and the main argument on the other side.' },
  { id: 's-2-top-a', band: 'top', text: 'Artificial intelligence is changing many jobs. Which changes do you expect in your own field, and how should people prepare for them?' },
  { id: 's-2-top-b', band: 'top', text: 'Is it the responsibility of governments or of individuals to protect the environment? Argue your position and respond to the strongest counter-argument.' },
];
export const SPEAKING_TASKS = 2;
export const SPEAKING_MAX_SECONDS = 30;

/** Picks the band for the second speaking task from the average level so far (0–6). */
export function speakingBand(estimate: number): SpeakingBand {
  if (estimate < 2.5) return 'low';
  if (estimate < 3.5) return 'mid';
  if (estimate < 5) return 'high';
  return 'top';
}
