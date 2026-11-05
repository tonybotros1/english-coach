/** Sample Gemini replies for B1 lessons, written to pass the lesson checks. The correct option is first, as Gemini is asked. */

const q = (prompt: string, options: [string, string, string, string], explanation = 'Because of the context.') => ({ prompt, options, explanation });

export const GRAMMAR = {
  title: 'Present perfect or past simple',
  explanation: [
    'Use the present perfect (have/has + past participle) for experiences and for actions that connect the past to now.',
    'Use the past simple for finished actions at a finished time, often with words like yesterday, last week or in 2020.',
  ],
  examples: [
    { sentence: 'I have worked here since 2021.', note: 'Since shows the action continues now.' },
    { sentence: 'We finished the report yesterday.', note: 'Yesterday is a finished time.' },
    { sentence: 'Have you ever presented to a client?', note: 'Ever asks about experience.' },
  ],
  practice: [
    q('I ___ in this team since January.', ['have worked', 'worked', 'work', 'am working']),
    q('She ___ the client last Monday.', ['called', 'has called', 'calls', 'have called']),
    q('___ you ever led a meeting?', ['Have', 'Did', 'Do', 'Are']),
    q('We ___ the budget yet.', ["haven't finished", "didn't finish", "don't finish", "aren't finishing"]),
    q('He ___ to Dubai in 2019.', ['moved', 'has moved', 'moves', 'is moving']),
    q('They ___ three new products this year.', ['have launched', 'launched', 'launch', 'are launch']),
    q('When ___ you start this job?', ['did', 'have', 'do', 'are']),
    q('I ___ just sent the email.', ['have', 'did', 'was', 'am']),
  ],
};

export const VOCABULARY = {
  title: 'Meetings at work',
  words: [
    { word: 'agenda', partOfSpeech: 'noun', meaning: 'a list of things to discuss in a meeting', example: 'Please send the agenda before the meeting.', collocation: 'set the agenda' },
    { word: 'postpone', partOfSpeech: 'verb', meaning: 'to move to a later time', example: 'We had to postpone the meeting until Friday.', collocation: 'postpone a decision' },
    { word: 'deadline', partOfSpeech: 'noun', meaning: 'the time when work must be finished', example: 'The deadline for the report is Monday.', collocation: 'meet a deadline' },
    { word: 'attend', partOfSpeech: 'verb', meaning: 'to go to an event', example: 'Ten people will attend the training.', collocation: 'attend a meeting' },
    { word: 'minutes', partOfSpeech: 'noun', meaning: 'a written record of a meeting', example: 'Sara took the minutes of the meeting.', collocation: 'take the minutes' },
    { word: 'colleague', partOfSpeech: 'noun', meaning: 'a person you work with', example: 'My colleague helped me with the slides.', collocation: 'a close colleague' },
  ],
  practice: [
    q('Can you add the new project to the ___?', ['agenda', 'deadline', 'minutes', 'colleague']),
    q('The manager decided to ___ the launch by a week.', ['postpone', 'attend', 'agenda', 'minutes']),
    q('We worked late to meet the ___.', ['deadline', 'agenda', 'colleague', 'minutes']),
    q('All team leaders must ___ the meeting.', ['attend', 'postpone', 'deadline', 'colleague']),
    q('Who is taking the ___ today?', ['minutes', 'agenda', 'deadline', 'colleague']),
    q('My ___ sits next to me in the office.', ['colleague', 'agenda', 'minutes', 'deadline']),
    q('Is the ___ for the budget next Thursday?', ['deadline', 'colleague', 'agenda', 'minutes']),
    q('If the client is ill, we will ___ the visit.', ['postpone', 'attend', 'colleague', 'minutes']),
  ],
};

const READING_TEXT = `Many companies in Dubai now let staff work from home two days a week. At first, some managers worried that people would work less. A year later, most of them say the opposite is true.

Layla Hassan manages a team of twelve at a software company. She says her team finishes projects faster than before. "People are not tired from driving in heavy traffic every morning," she explains. "They start work calmer and more focused." She also noticed that fewer people take sick days.

However, working from home is not perfect. New employees often find it harder to learn the job when their colleagues are not around. Some people also feel lonely, especially if they live alone. Layla's solution is simple. Everyone comes to the office on Mondays and Wednesdays, and those days are kept for meetings, training and team lunches.

Experts agree that the best plans are flexible. A worker with young children may prefer more days at home, while a new graduate may want to be in the office more often. The important thing, they say, is to ask staff what works for them and to try new ideas for a few months before making a final decision.

For now, Layla's company plans to keep its system. "We get the benefits of both," she says, "and nobody wants to go back to five days in the office."`;

export const READING = {
  title: 'Home or office?',
  text: READING_TEXT,
  glossary: [
    { word: 'focused', meaning: 'giving all your attention to something' },
    { word: 'lonely', meaning: 'sad because you are alone' },
    { word: 'flexible', meaning: 'able to change easily' },
  ],
  questions: [
    q('What is the main idea of the text?', ['Mixing home and office work can work well', 'Working from home always makes people lonely', 'Managers want staff in the office every day', 'Traffic in Dubai is getting worse']),
    q("Why does Layla think her team works faster?", ['They are less tired from travelling', 'They have more meetings at home', 'They work longer hours on Mondays', 'They have new computers']),
    q('Who finds working from home harder?', ['New employees', 'Managers', 'Parents of young children', 'Software engineers']),
    q('What does "flexible" mean in paragraph four?', ['able to change', 'very cheap', 'strict and fixed', 'easy to forget']),
    q('What do experts suggest companies do?', ['Ask staff and test ideas first', 'Let everyone stay at home', 'Hold training every day', 'Copy other companies quickly']),
  ],
};

export const LISTENING = {
  title: 'Planning a client visit',
  setting: 'Two colleagues plan a visit from a client',
  lines: [
    { speaker: 'A', text: "Hi Omar, have you got a minute? The client from Muscat wants to visit next week." },
    { speaker: 'B', text: "Sure. Which day are they thinking of? I'm away on Tuesday." },
    { speaker: 'A', text: "They asked for Tuesday, actually. But I can ask them to come on Wednesday instead." },
    { speaker: 'B', text: "Wednesday is perfect. Shall we book the big meeting room on the third floor?" },
    { speaker: 'A', text: "Good idea. And I think we should take them to lunch after the meeting." },
    { speaker: 'B', text: "Let's try the new restaurant near the station. It's quiet, so we can talk." },
    { speaker: 'A', text: "Great. I'll send them an email this afternoon and confirm the time." },
  ],
  questions: [
    q('When will the client probably visit?', ['On Wednesday', 'On Tuesday', 'This afternoon', 'On Thursday']),
    q('Where will the meeting be?', ['In the big room on the third floor', 'At the station', 'In a restaurant', 'In Muscat']),
    q('Why do they choose the restaurant?', ['It is quiet', 'It is cheap', 'It is in the office', 'The client asked for it']),
  ],
  dictation: ["The client from Muscat wants to visit next week.", "Shall we book the big meeting room on the third floor?", "I'll send them an email this afternoon and confirm the time."],
};

export const WRITING = {
  title: 'Asking to move a meeting',
  task: 'Write an email to your manager asking to move tomorrow’s meeting. Explain why, and suggest two new times.',
  guidance: ['Say which meeting you mean', 'Give a clear reason', 'Suggest two other times'],
  usefulLanguage: ['Would it be possible to…', 'Unfortunately, I have…', 'How about…', 'Please let me know if…'],
  minWords: 80,
  maxWords: 120,
};

export const SPEAKING = {
  title: 'Talking about your job',
  shadowing: ['I work in a small team in the city centre.', 'Most days I start at eight and finish at four.', 'The best part of my job is helping customers.', 'Sometimes the work is stressful, but I enjoy it.', 'Next year I would like to lead a project.'],
  question: 'Describe your job. What do you do on a normal day, and what do you like about it?',
  tips: ['Use the present simple for routines', 'Give one example of a typical task'],
};

export const WRITING_FEEDBACK = {
  level: 'B1',
  plus: false,
  summary: 'You explain the problem clearly and suggest new times.',
  criteria: { content: 4, organisation: 3, range: 3, accuracy: 3 },
  strengths: ['Clear reason', 'Polite tone'],
  improvements: ['Check past tenses', 'Use a closing line'],
  corrections: [
    { original: 'I have went', corrected: 'I went', note: 'Past simple for a finished time.' },
    { original: 'not in the text', corrected: 'x', note: 'invented' },
  ],
  improved: 'Dear Ahmed, would it be possible to move tomorrow’s meeting?',
};

export const SPEAKING_FEEDBACK = {
  level: 'B1',
  plus: true,
  summary: 'You describe your day clearly.',
  criteria: { range: 3, accuracy: 3, fluency: 4, coherence: 4, pronunciation: 4 },
  strengths: ['Good routine verbs'],
  improvements: ['Add linking words'],
};
