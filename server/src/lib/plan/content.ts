/**
 * What the plan teaches at each level. Grammar follows the British Council / EAQUALS Core Inventory for
 * General English; themes, text types and tasks are chosen to match the learner's goal.
 */
export type Goal = 'work' | 'health' | 'exam' | 'daily';
export type Skill = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing' | 'speaking';
/** Paul Nation's four strands: a balanced course gives each roughly a quarter of the time. */
export type Strand = 'language' | 'input' | 'output' | 'fluency';

export const SKILLS: readonly { key: Skill; name: string; strand: Strand }[] = [
  { key: 'grammar', name: 'Grammar', strand: 'language' },
  { key: 'vocabulary', name: 'Vocabulary', strand: 'language' },
  { key: 'reading', name: 'Reading', strand: 'input' },
  { key: 'listening', name: 'Listening', strand: 'input' },
  { key: 'writing', name: 'Writing', strand: 'output' },
  { key: 'speaking', name: 'Speaking', strand: 'fluency' },
];

export const GOALS: Record<Goal, string> = {
  work: 'Work and career',
  health: 'Healthcare work',
  exam: 'IELTS or another exam',
  daily: 'Daily life and travel',
};

export const GRAMMAR_TOPICS: Record<number, readonly string[]> = {
  1: ["Verb 'to be' (am, is, are)", 'Present simple for routines', 'There is and there are', 'Articles a, an and the', 'Possessive adjectives (my, your, his)', "Can and can't for ability", 'Prepositions of time (in, on, at)', 'Question words (what, where, when)'],
  2: ['Past simple: regular and irregular verbs', 'Present continuous for now and for plans', 'Comparatives and superlatives', 'Countable and uncountable nouns', 'Going to for plans', 'Adverbs of frequency', 'Must, have to and should', 'Object and possessive pronouns'],
  3: ['Present perfect or past simple', 'Past continuous and past simple', 'First and second conditionals', 'Will, going to and present continuous for the future', 'Used to for past habits', 'The passive (present and past)', 'Defining relative clauses', 'Verb + -ing or to-infinitive'],
  4: ['Past perfect simple and continuous', 'Present perfect continuous', 'Third conditional and regrets', 'Reported speech and reporting verbs', 'The passive in all tenses', 'Modals of deduction (must have, can’t have)', 'Wish and if only', 'Non-defining relative clauses', 'Future continuous and future perfect', 'Linking contrast (although, despite, whereas)'],
  5: ['Inversion after negative adverbials', 'Cleft sentences (What I need is…)', 'Mixed conditionals', 'Impersonal passive (It is said that…)', 'Participle clauses', 'Hedging and softening', 'Future in the past', 'Advanced discourse markers'],
  6: ['Subjunctive and formal structures', 'Inverted conditionals (Had I known, Were I to)', 'Ellipsis and substitution', 'Fronting for emphasis', "Nuanced modality (needn't have, might well)", 'Register: formal and informal choices', 'Collocation and idiomatic precision', 'Complex noun phrases in formal writing'],
};

const THEMES_BASE = ['Work and meetings', 'Emails and phone calls', 'Health and the body', 'Technology and software', 'Travel and transport', 'Money and shopping', 'Feelings and personality', 'Food and eating out', 'News and current affairs', 'The environment', 'Education and learning', 'Home and daily life'];
const THEMES_GOAL: Record<Goal, readonly string[]> = {
  work: ['Work and meetings', 'Emails and phone calls', 'Technology and software', 'Projects and deadlines', 'Negotiation and persuasion'],
  health: ['Health and the body', 'Patients and care', 'Hospitals and clinics', 'Work and meetings', 'Medical technology'],
  exam: ['Education and learning', 'The environment', 'News and current affairs', 'Science and research', 'Society and culture'],
  daily: ['Travel and transport', 'Food and eating out', 'Home and daily life', 'Feelings and personality', 'Shopping and services'],
};

/** Vocabulary themes, goal themes first, with word-building topics added as the level rises. */
export function themesFor(goal: Goal, vocabularyLevel: number): string[] {
  const list = [...THEMES_GOAL[goal]];
  for (const t of THEMES_BASE) if (!list.includes(t)) list.push(t);
  if (vocabularyLevel >= 3) list.splice(3, 0, 'Phrasal verbs for everyday situations', 'Collocations with make, do, take and have');
  if (vocabularyLevel >= 4) list.splice(6, 0, 'Formal and academic vocabulary');
  if (vocabularyLevel >= 5) list.splice(8, 0, 'Idioms and precise opinion words');
  return list;
}

export const TEXT_TYPES = ['a short news article', 'an email thread', 'a blog post', 'a workplace guide', 'a short story', 'an opinion column', 'a product review', 'an information leaflet'];

export const WRITING_TASKS: Record<number, readonly string[]> = {
  1: ['Write 4 to 6 sentences about yourself', 'Write a short message inviting a friend for coffee', 'Describe your home in 5 simple sentences', 'Write about your typical day'],
  2: ['Write an email asking a colleague to move a meeting', 'Describe your last weekend', 'Write a short review of a café you like', 'Write a message explaining that you will be late'],
  3: ['Write about a problem you solved at work', 'Write an email to a hotel about a problem', 'Give your opinion on working from home', 'Describe a person who has influenced you'],
  4: ['Write a short report recommending a workplace improvement', 'Discuss whether technology makes us less social', 'Write a formal email explaining a project delay', 'Write an article on staying healthy at work'],
  5: ['Write a proposal for or against a four-day week', 'Evaluate the impact of AI on your profession', 'Write a persuasive email to a hesitant client', 'Write a critical review of a book or podcast'],
  6: ['Write an essay on whether expertise still matters', 'Write a speech arguing that clear communication is leadership', 'Respond to the claim that remote work killed company culture', 'Write a reflective piece on a professional failure'],
};

export const SPEAKING_TASKS: Record<number, readonly string[]> = {
  1: ['Talk about your family', 'Describe your favourite place in your city', 'Talk about what you did last weekend'],
  2: ['Describe your job and a normal working day', 'Talk about a holiday you enjoyed', 'Describe a friend and what you do together'],
  3: ['Describe a challenge at work and how you handled it', 'Talk about a trip you would like to take', 'Give your opinion on social media'],
  4: ['Explain the pros and cons of working from home', 'Justify a change you would make at work', 'Talk about a news story that matters to you'],
  5: ['Explain a complex process from your work to a non-expert', 'Argue convincingly for a view you do not hold', 'Discuss how technology will change your profession'],
  6: ['Present both sides of a hard decision, then give a verdict', 'Tell a story from your career with a clear point', 'Explain an abstract idea such as trust using examples'],
};
