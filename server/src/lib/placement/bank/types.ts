/**
 * Placement test item bank types.
 *
 * Levels use the CEFR scale as numbers: 1 = A1, 2 = A2, 3 = B1, 4 = B2, 5 = C1, 6 = C2.
 * In every `options` array the FIRST option is the correct answer. The server shuffles
 * the options for each test and never sends the answer to the phone.
 */
export type Level = 1 | 2 | 3 | 4 | 5 | 6;
export type Options = readonly [correct: string, distractor1: string, distractor2: string, distractor3: string];

/** A grammar or vocabulary question: one sentence with a gap shown as ___ (three underscores). */
export type GapItem = {
  id: string; // e.g. 'g-b1-07' or 'v-c1-12'; unique across the whole bank
  level: Level;
  prompt: string; // contains exactly one ___
  options: Options;
  explanation: string; // one or two short sentences: why the answer is right, in plain English for a learner
  topic: string; // the grammar point (British Council / EAQUALS Core Inventory) or vocabulary area tested
};

export type ReadingQuestion = { id: string; prompt: string; options: Options; explanation: string };
export type ReadingPassage = {
  id: string; // e.g. 'r-b2-2'
  level: Level;
  title: string;
  text: string; // paragraphs separated by a blank line (\n\n)
  questions: readonly [ReadingQuestion, ReadingQuestion, ReadingQuestion];
};

/** A short recording, played on the phone with text-to-speech. Speakers A and B get different voices. */
export type ListeningItem = {
  id: string; // e.g. 'l-a2-05'
  level: Level;
  lines: readonly { speaker: 'A' | 'B'; text: string }[];
  prompt: string; // the question, shown before the recording plays
  options: Options;
  explanation: string; // why the answer is right, quoting the key words the learner had to hear
};
