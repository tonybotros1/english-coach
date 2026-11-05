/** Asks Gemini to write one lesson, checks it, and retries once with the problems listed. */
import { generateJson } from '../gemini';
import { HttpError } from '../errors';
import { shuffle } from '../placement/engine';
import { LEVEL_NAMES } from '../placement/levels';
import type { Goal } from '../plan/content';
import { GOALS } from '../plan/content';
import { GEMINI_SCHEMAS, LISTENING_WORDS, READING_WORDS, checkLesson, rawShapes, type LessonKind, type Mcq, type RawContent } from './content';

export type LessonRequest = { kind: LessonKind; level: number; topic: string; goal: Goal; minutes: number };

/** What a learner at each level can handle, from the CEFR Companion Volume (Council of Europe, 2020). */
const LEVEL_GUIDE: Record<number, string> = {
  1: 'A1: very short, simple sentences; present simple, be, have, can; the 1,000 most common words; concrete everyday topics.',
  2: 'A2: short connected sentences with and, but, because; past simple, going to, comparatives; frequent everyday vocabulary.',
  3: 'B1: straightforward connected text on familiar topics; present perfect, conditionals, passives; some less frequent words, explained by context.',
  4: 'B2: detailed text with opinions and arguments; a full range of tenses, modals of deduction, reported speech; topic-specific vocabulary.',
  5: 'C1: complex, well-organised text with implicit meaning; inversion, cleft sentences, hedging; precise and idiomatic vocabulary.',
  6: 'C2: subtle, sophisticated text with irony and fine distinctions; any structure; rare and highly precise vocabulary.',
};

const RULES = `Rules for every lesson:
- British English spelling. Natural, accurate English that a careful teacher would publish.
- Content is respectful and suitable for adults at work: no alcohol, romance, religion, politics, violence or stereotypes. Names and places may be international or from the Gulf.
- Every multiple-choice question has four options. Put the CORRECT option FIRST; the app shuffles them. Exactly one option is correct; the others are plausible learner errors that are clearly wrong in context. Options are similar in length, so the answer cannot be guessed from its length or wording.
- Explanations are one or two short sentences a learner at this level can understand, saying why the answer is right.
- Reply with JSON only, matching the schema.`;

function instructions(r: LessonRequest): string {
  const lvl = LEVEL_NAMES[r.level];
  const goal = GOALS[r.goal];
  const head = `Write a ${r.minutes}-minute ${r.kind} lesson for an adult learner of English at CEFR ${lvl} whose goal is "${goal}".\nLevel guide: ${LEVEL_GUIDE[r.level]}`;
  switch (r.kind) {
    case 'grammar':
      return `${head}
Grammar point: ${r.topic} (British Council / EAQUALS Core Inventory).
- title: the grammar point in a few words.
- explanation: 2 to 5 short points that teach the form and the meaning, each under 60 words, with the key pattern shown (for example "have/has + past participle").
- examples: 3 to 5 example sentences about ${goal.toLowerCase()} topics, each with a short note on what it shows.
- practice: exactly 8 gap-fill questions testing this grammar point, each a sentence with exactly one gap written as ___, getting a little harder from 1 to 8. Use vocabulary easier than ${lvl} so the grammar is what is tested.`;
    case 'vocabulary':
      return `${head}
Topic: ${r.topic}.
- title: the topic in a few words.
- words: 6 to 8 useful words or short phrases at ${lvl} level for this topic (English Vocabulary Profile), not too basic for the level. For each: partOfSpeech, a simple meaning a ${lvl} learner understands, an example sentence that uses the word, and a common collocation.
- practice: exactly 8 gap-fill sentences, each with one gap ___, where the correct answer is one of the lesson's words (written exactly as in the list) and the three wrong options are other words from the list. Use each word at least once.`;
    case 'reading': {
      const [min, max] = READING_WORDS[r.level];
      return `${head}
Text type and topic: ${r.topic}.
- title: a short headline.
- text: an original text of ${min} to ${max} words, paragraphs separated by a blank line. Slightly challenging but readable at ${lvl}.
- glossary: 3 to 6 words from the text that a ${lvl} learner may not know, copied exactly, each with a simple meaning.
- questions: exactly 5 questions in text order: main idea, details, one inference, one vocabulary-in-context${r.level >= 4 ? ", and one on the writer's view or purpose" : ''}. The answer must come from the text, not general knowledge.`;
    }
    case 'listening': {
      const [min, max] = LISTENING_WORDS[r.level];
      return `${head}
Topic: ${r.topic}.
The recording is read aloud by text-to-speech, speaker A and speaker B in different voices. The learner hears it but does not see it.
- title and setting: what the recording is (for example "Two colleagues planning a client visit").
- lines: ${min} to ${max} words in total, as a dialogue between A and B or a monologue by A. Natural spoken English${r.level >= 3 ? ' with contractions and spoken features (well, actually, I mean)' : ', clear and simple'}. Write numbers, times and prices as words. No stage directions, symbols, brackets or speaker names in the text.
- questions: exactly 3 questions about what was said. Wrong options should mention things that are said but are not the answer.
- dictation: exactly 3 sentences copied word for word from the lines, each 5 to 14 words, useful for practising listening for every word.`;
    }
    case 'writing':
      return `${head}
Writing task: ${r.topic}.
- title: the task in a few words.
- task: clear instructions to the learner (who to write to, why, and what to include), suited to ${goal.toLowerCase()}.
- guidance: 2 to 4 short bullet points on what to include.
- usefulLanguage: 4 to 6 useful phrases at ${lvl} level for this task.
- minWords and maxWords: a realistic length for ${lvl} in about ${Math.max(8, r.minutes - 5)} minutes of writing.`;
    case 'speaking':
      return `${head}
Speaking topic: ${r.topic}.
- title: the topic in a few words.
- shadowing: exactly 5 natural spoken sentences at ${lvl} level on this topic, each 6 to 18 words, that the learner repeats aloud after the model voice to practise pronunciation and rhythm. Write numbers as words.
- question: one open question on the topic that the learner answers aloud for about 30 to 60 seconds.
- tips: 2 to 3 short tips for answering well at ${lvl}, such as useful phrases or how to organise the answer.`;
  }
}

/** Shuffles each question's options and records where the correct one went. */
function shuffled(list: { prompt: string; options: string[]; explanation: string }[], rng: () => number): Mcq[] {
  return list.map((q) => {
    const order = shuffle([0, 1, 2, 3], rng);
    return { prompt: q.prompt, options: order.map((i) => q.options[i]), answer: order.indexOf(0), explanation: q.explanation };
  });
}

export type LessonContent =
  | ({ kind: 'grammar' } & Omit<RawContent<'grammar'>, 'practice'> & { practice: Mcq[] })
  | ({ kind: 'vocabulary' } & Omit<RawContent<'vocabulary'>, 'practice'> & { practice: Mcq[] })
  | ({ kind: 'reading' } & Omit<RawContent<'reading'>, 'questions'> & { questions: Mcq[] })
  | ({ kind: 'listening' } & Omit<RawContent<'listening'>, 'questions'> & { questions: Mcq[] })
  | ({ kind: 'writing' } & RawContent<'writing'>)
  | ({ kind: 'speaking' } & RawContent<'speaking'>);

export async function generateLesson(r: LessonRequest, rng: () => number = Math.random): Promise<LessonContent> {
  const system = `You are an expert English teacher and materials writer for Cambridge English, writing short self-study lessons.\n${RULES}`;
  let user = instructions(r);
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await generateJson({ system, user, responseSchema: GEMINI_SCHEMAS[r.kind], parse: rawShapes[r.kind] as never, timeoutMs: 55_000 });
    const problems = checkLesson(r.kind, out, r.level);
    if (!problems.length) {
      const c = out as Record<string, unknown>;
      if (r.kind === 'grammar' || r.kind === 'vocabulary') return { kind: r.kind, ...c, practice: shuffled(c.practice as never, rng) } as LessonContent;
      if (r.kind === 'reading' || r.kind === 'listening') return { kind: r.kind, ...c, questions: shuffled(c.questions as never, rng) } as LessonContent;
      return { kind: r.kind, ...c } as LessonContent;
    }
    console.warn('Generated lesson failed checks', r.kind, problems);
    user = `${instructions(r)}\n\nYour previous attempt had these problems. Fix all of them:\n- ${problems.join('\n- ')}`;
  }
  throw new HttpError(502, 'The lesson could not be prepared right now. Try again in a minute.', 'lesson_failed');
}
