/**
 * Reading passages for the adaptive placement test: three per CEFR level (A1 to C2).
 * In every `options` array the FIRST option is the correct answer.
 */
import type { ReadingPassage } from './types';

export const READING: readonly ReadingPassage[] = [
  // ---------------------------------------------------------------- A1
  {
    id: 'r-a1-1',
    level: 1,
    title: 'A note on the fridge',
    text:
      "Hi Omar,\n\n" +
      "I am at the sports centre with Dad. We come back at seven o'clock. Your dinner is in the fridge. It is chicken and rice.\n\n" +
      "Please give the cat some food at six. Her food is in the blue box under the window, not in the kitchen.\n\n" +
      "Grandma phones at half past five. Please answer the phone!\n\n" +
      "Love,\nMum",
    questions: [
      {
        id: 'r-a1-1-q1',
        prompt: "Where is the cat's food?",
        options: ['In a box under the window', 'In the fridge with the dinner', 'In a cupboard in the kitchen', 'On the table next to the phone'],
        explanation: "Mum writes: 'Her food is in the blue box under the window, not in the kitchen.'",
      },
      {
        id: 'r-a1-1-q2',
        prompt: 'What time does Grandma phone?',
        options: ['At half past five', "At seven o'clock", 'At half past six', "At five o'clock"],
        explanation: "The note says: 'Grandma phones at half past five.'",
      },
      {
        id: 'r-a1-1-q3',
        prompt: 'Where are Mum and Dad now?',
        options: ['At the sports centre', "At Grandma's house", 'At the shops', 'At work'],
        explanation: "Mum writes: 'I am at the sports centre with Dad.'",
      },
    ],
  },
  {
    id: 'r-a1-2',
    level: 1,
    title: 'About me',
    text:
      'Hello! My name is Lina and I am from Spain. Now I live in Dubai with my sister, Marta.\n\n' +
      "I am a nurse in a children's hospital, and Marta is a teacher. She is twenty-six and I am twenty-three.\n\n" +
      'We have a small flat near the beach. At the weekend we walk by the sea. I love the sunny weather here, but I miss my parents.',
    questions: [
      {
        id: 'r-a1-2-q1',
        prompt: "What is Lina's job?",
        options: ['She is a nurse.', 'She is a teacher.', 'She is a doctor.', 'She is a student.'],
        explanation: "Lina says: 'I am a nurse in a children's hospital.' Marta is the teacher.",
      },
      {
        id: 'r-a1-2-q2',
        prompt: 'Which sentence is true?',
        options: ['Marta is older than Lina.', 'Lina is older than Marta.', 'Lina and Marta are both teachers.', 'Lina lives in Spain with Marta.'],
        explanation: "Marta 'is twenty-six' and Lina is 'twenty-three', so Marta is older.",
      },
      {
        id: 'r-a1-2-q3',
        prompt: 'What does Lina say about her parents?',
        options: ['They are not with her, and she is sad.', 'They live with her in the small flat.', 'They walk by the sea every weekend.', 'They love the sunny weather in Dubai.'],
        explanation: "Lina writes 'I miss my parents'. To miss someone means you feel sad because they are not with you.",
      },
    ],
  },
  {
    id: 'r-a1-3',
    level: 1,
    title: 'Library notice',
    text:
      'Greenhill Library\n\n' +
      'Open: Monday to Friday, 9 am to 7 pm. Saturday, 10 am to 2 pm. Closed on Sunday.\n\n' +
      'You can take home six books for two weeks. Children under ten must come with an adult.\n\n' +
      'Please do not eat or drink in the library. You can have water and snacks in the garden.\n\n' +
      'Free Wi-Fi: please ask at the front desk.',
    questions: [
      {
        id: 'r-a1-3-q1',
        prompt: 'On which day is the library closed all day?',
        options: ['Sunday', 'Saturday', 'Friday', 'Monday'],
        explanation: "The notice says 'Closed on Sunday'. On Saturday it is open from 10 am to 2 pm.",
      },
      {
        id: 'r-a1-3-q2',
        prompt: 'How many books can you take home?',
        options: ['Six', 'Two', 'Ten', 'Seven'],
        explanation: "The notice says: 'You can take home six books for two weeks.'",
      },
      {
        id: 'r-a1-3-q3',
        prompt: 'Where can you eat a snack?',
        options: ['In the garden', 'In the café upstairs', 'In the reading room', 'At the front desk'],
        explanation: "The notice says: 'You can have water and snacks in the garden.'",
      },
    ],
  },

  // ---------------------------------------------------------------- A2
  {
    id: 'r-a2-1',
    level: 2,
    title: 'My new flat',
    text:
      'Hi Priya,\n\n' +
      "Thanks for your email. Yes, I've finally moved into my new flat! It's smaller than my old one, but it's much closer to my office, so now I walk to work in ten minutes instead of taking the bus.\n\n" +
      "The only problem is the noise. There's a café downstairs and it opens at six in the morning, so I wake up early every day!\n\n" +
      "Are you free next Friday evening? I'd like to cook dinner for a few friends. My brother is coming, and he's bringing his guitar. Could you bring a dessert? I'm not very good at making cakes.\n\n" +
      'See you soon,\nHana',
    questions: [
      {
        id: 'r-a2-1-q1',
        prompt: 'What is good about Hana\'s new flat?',
        options: ['It is near her office.', 'It is bigger than her old flat.', 'It has a large kitchen.', 'It is next to a bus stop.'],
        explanation: "Hana says the flat is 'much closer to my office', so she can walk to work.",
      },
      {
        id: 'r-a2-1-q2',
        prompt: 'Why does Hana wake up early?',
        options: ['The café below her flat opens at six.', 'She has to catch the bus to work.', 'Her brother plays his guitar in the morning.', 'She starts work at six every day.'],
        explanation: "She writes: 'There's a café downstairs and it opens at six in the morning, so I wake up early.'",
      },
      {
        id: 'r-a2-1-q3',
        prompt: 'What does Hana ask Priya to do?',
        options: ['Bring something sweet to the dinner', 'Cook dinner with her on Friday', 'Bring a guitar to the dinner', 'Teach her how to make a cake'],
        explanation: "Hana asks: 'Could you bring a dessert?'",
      },
    ],
  },
  {
    id: 'r-a2-2',
    level: 2,
    title: 'Cooking classes',
    text:
      'Do you want to cook quick, healthy meals at home? Join our six-week course at Riverside Community Centre. Classes are on Tuesdays from 6.30 to 8.30 pm, starting on 3 March. There is no class on 24 March because the centre is closed that week.\n\n' +
      'The course costs £90. This includes all the food you cook with. Please bring an apron and a box, because you can take your meal home after each class.\n\n' +
      "Each group has only ten people, so book early. You don't need any experience. To book, visit our website or call 01632 960418.",
    questions: [
      {
        id: 'r-a2-2-q1',
        prompt: 'Why should you bring a box to the class?',
        options: ['To take home the food you cook', 'To carry your apron to the centre', 'To bring your own food to class', 'To keep your vegetables cold'],
        explanation: "The advert says: 'bring an apron and a box, because you can take your meal home after each class.'",
      },
      {
        id: 'r-a2-2-q2',
        prompt: 'Why is it a good idea to book early?',
        options: ['There are not many places in each group.', 'The price goes up after 3 March.', 'The centre is closed on 24 March.', 'Only people with experience can join.'],
        explanation: "The advert says: 'Each group has only ten people, so book early.'",
      },
      {
        id: 'r-a2-2-q3',
        prompt: 'When are the classes?',
        options: ['On Tuesday evenings', 'Every evening for six weeks', 'On Tuesday mornings', 'Only on 3 and 24 March'],
        explanation: "The advert says: 'Classes are on Tuesdays from 6.30 to 8.30 pm.'",
      },
    ],
  },
  {
    id: 'r-a2-3',
    level: 2,
    title: 'Island ferry timetable',
    text:
      'Ferries to Palm Island leave the city harbour every day at 8.00, 10.30, 13.00 and 15.30. The trip takes 40 minutes. The last ferry back to the city leaves the island at 17.00.\n\n' +
      'Return tickets: adults £12, children aged 4 to 12 £6, children under 4 free. You can buy tickets at the harbour office or online.\n\n' +
      'On very windy days, ferries sometimes do not run. Please check our website before you travel.\n\n' +
      'You can take bicycles on the 8.00 and 15.30 ferries only.',
    questions: [
      {
        id: 'r-a2-3-q1',
        prompt: 'How much is a return ticket for a three-year-old child?',
        options: ['It is free.', 'It costs £6.', 'It costs £12.', 'It costs £3.'],
        explanation: "The timetable says 'children under 4 free', so a three-year-old does not pay.",
      },
      {
        id: 'r-a2-3-q2',
        prompt: 'A family wants to take their bicycles to the island. Which ferry can they take?',
        options: ['The 8.00 ferry', 'The 10.30 ferry', 'The 13.00 ferry', 'The 17.00 ferry'],
        explanation: "The timetable says: 'You can take bicycles on the 8.00 and 15.30 ferries only.'",
      },
      {
        id: 'r-a2-3-q3',
        prompt: 'What time does the 10.30 ferry arrive at Palm Island?',
        options: ['11.10', '11.30', '10.40', '11.00'],
        explanation: "The ferry leaves at 10.30 and 'The trip takes 40 minutes', so it arrives at 11.10.",
      },
    ],
  },

  // ---------------------------------------------------------------- B1
  {
    id: 'r-b1-1',
    level: 3,
    title: 'A week without my phone',
    text:
      'Last month my sister challenged me to spend a week without my smartphone. I use it for almost everything – maps, music, the news, chatting with friends – so I expected the week to be a disaster. I agreed, but I kept an old basic phone in case of emergencies.\n\n' +
      'The first two days were difficult. I kept reaching into my pocket, and without a map app I got lost on the way to a meeting and arrived twenty minutes late. On the third day, though, something changed. I started reading on the bus instead of scrolling through videos, and I finished a novel that had been sitting on my shelf for a year.\n\n' +
      "By the end of the week I was sleeping better, probably because I wasn't looking at a screen in bed. I've gone back to my smartphone now, but I've made one rule: it stays in the kitchen at night. I've also deleted two social media apps, and I don't miss them at all.",
    questions: [
      {
        id: 'r-b1-1-q1',
        prompt: 'Why did the writer keep an old basic phone?',
        options: ['To be able to call someone if there was a problem', 'To use its map when going to meetings', "Because the writer's sister wanted daily calls", 'To listen to music while travelling on the bus'],
        explanation: "The writer 'kept an old basic phone in case of emergencies'.",
      },
      {
        id: 'r-b1-1-q2',
        prompt: 'What do we learn about the novel the writer finished?',
        options: ['The writer had owned it for a long time.', "It was a present from the writer's sister.", 'The writer read it on a phone in bed.', 'The writer began it on the first day.'],
        explanation: "The writer finished 'a novel that had been sitting on my shelf for a year'.",
      },
      {
        id: 'r-b1-1-q3',
        prompt: "What does the writer think improved their sleep?",
        options: ['Not looking at a screen in bed', 'Reading a novel every night in bed', 'Deleting two social media apps', 'Feeling tired after getting lost'],
        explanation: "The writer slept better 'probably because I wasn't looking at a screen in bed'. The apps were deleted after the week.",
      },
    ],
  },
  {
    id: 'r-b1-2',
    level: 3,
    title: 'Office move',
    text:
      'To all staff,\n\n' +
      'As most of you know, the Finance and Marketing teams will move from the second floor to the newly renovated fourth floor next month. The move will take place over the weekend of 14–15 June, so that work is not interrupted.\n\n' +
      'Before you leave on Thursday 12 June, please pack the items on your desk into the boxes provided and write your name and new desk number on each box. Computers, screens and phones will be moved by the IT team, so please do not pack them. Personal items, such as plants and photos, should be taken home, as we cannot be responsible for them.\n\n' +
      'On Friday 13 June, both teams will work from home. Please make sure you have everything you need, including your laptop charger, before you leave on Thursday.\n\n' +
      'The fourth floor has a larger kitchen and two new meeting rooms, which can be booked through the usual online system. If you have any questions, please contact Daniel Reyes in Facilities on extension 2047.',
    questions: [
      {
        id: 'r-b1-2-q1',
        prompt: 'Who will move the phones to the fourth floor?',
        options: ['The IT team', 'Each member of staff', 'Daniel Reyes in Facilities', 'The Finance team'],
        explanation: "The notice says: 'Computers, screens and phones will be moved by the IT team.'",
      },
      {
        id: 'r-b1-2-q2',
        prompt: 'Why should staff take their plants home?',
        options: ['The company will not take responsibility for them.', 'There is no space for plants on the fourth floor.', 'The IT team needs the boxes for computers.', 'Plants are not allowed in the new kitchen.'],
        explanation: "Personal items 'should be taken home, as we cannot be responsible for them'.",
      },
      {
        id: 'r-b1-2-q3',
        prompt: 'What is the main purpose of the notice?',
        options: ['To tell staff how to prepare for a move', 'To announce that staff will work from home', 'To ask staff to book the new meeting rooms', 'To introduce the new head of Facilities'],
        explanation: "Most of the notice gives instructions for the move, such as 'please pack the items on your desk'. Working from home is for one day only.",
      },
    ],
  },
  {
    id: 'r-b1-3',
    level: 3,
    title: 'The power of a short nap',
    text:
      'Many people feel sleepy in the early afternoon, especially after lunch. This is not only because of the food. Our bodies follow a natural daily rhythm, and most adults have a small drop in energy between about one and three o\'clock.\n\n' +
      "Researchers have found that a short nap at this time can improve memory, mood and concentration. The ideal length seems to be between ten and twenty minutes. If you sleep for longer than half an hour, you may go into deep sleep and wake up feeling worse than before – a feeling known as 'sleep inertia'.\n\n" +
      "Some companies now provide quiet rooms where employees can rest during their break. Supporters say this makes staff more productive, but not everyone agrees. Critics point out that naps are no substitute for a good night's sleep, and that people who nap late in the day may find it harder to fall asleep at night.\n\n" +
      'Experts therefore recommend keeping naps short and having them before mid-afternoon.',
    questions: [
      {
        id: 'r-b1-3-q1',
        prompt: 'According to the article, why do people feel sleepy after lunch?',
        options: ["Partly because of the body's natural daily rhythm", 'Only because they have eaten too much food', 'Because they slept badly the night before', 'Because their offices are too quiet and warm'],
        explanation: "The article says it 'is not only because of the food' and that 'our bodies follow a natural daily rhythm'.",
      },
      {
        id: 'r-b1-3-q2',
        prompt: "What is 'sleep inertia'?",
        options: ['Feeling worse after a long nap', 'Being unable to fall asleep at night', 'The drop in energy after lunch', 'A nap of ten to twenty minutes'],
        explanation: "After sleeping 'longer than half an hour' you may 'wake up feeling worse than before', which is called 'sleep inertia'.",
      },
      {
        id: 'r-b1-3-q3',
        prompt: 'What do critics say about naps?',
        options: ['Late naps can make it harder to sleep at night.', 'Quiet rooms at work cost companies too much.', 'Ten-minute naps are too short to be useful.', 'Naps can damage memory and concentration.'],
        explanation: "Critics say 'people who nap late in the day may find it harder to fall asleep at night'.",
      },
    ],
  },

  // ---------------------------------------------------------------- B2
  {
    id: 'r-b2-1',
    level: 4,
    title: 'In defence of the pen',
    text:
      'Walk into any university lecture hall today and you will see rows of glowing laptop screens. Typing notes is faster, neater and easier to search later, so it is hardly surprising that most students have abandoned pen and paper. Yet I suspect that many of them are making their studies harder, not easier.\n\n' +
      'The problem is precisely that typing is so fast. A confident typist can record a lecture almost word for word, which feels productive but often involves very little thinking. When you write by hand, you simply cannot keep up, so you are forced to decide what matters and put it in your own words. Several studies have suggested that this extra effort helps students understand and remember material better, even if their notes are shorter.\n\n' +
      'There is also the question of distraction. A laptop offers endless temptations, from messages to online shopping, and few of us are disciplined enough to ignore them for an hour. A notebook, by contrast, has nothing to offer except the lecture.\n\n' +
      'I am not suggesting that universities should ban laptops. For students with certain disabilities they are essential, and for some subjects typed notes make sense. But I would encourage any student to try a simple experiment: take handwritten notes for one month and compare the results. You may find that writing less allows you to learn more.',
    questions: [
      {
        id: 'r-b2-1-q1',
        prompt: 'Why does the writer see the speed of typing as a disadvantage?',
        options: ['Students can take notes without really thinking.', 'Typed notes are harder to search afterwards.', 'Typed notes are usually too short to be useful.', 'Lecturers start speaking faster to keep up.'],
        explanation: "Typing a lecture 'almost word for word' feels productive 'but often involves very little thinking'.",
      },
      {
        id: 'r-b2-1-q2',
        prompt: "What does the writer mean by saying a notebook 'has nothing to offer except the lecture'?",
        options: ['It does not distract students from the lecture.', 'It is too limited to be useful for serious study.', 'It is less tidy and organised than a laptop.', 'It makes students copy the lecture word for word.'],
        explanation: "The sentence follows the point about laptops' 'endless temptations', so it means a notebook gives students nothing else to look at.",
      },
      {
        id: 'r-b2-1-q3',
        prompt: 'What does the writer recommend in the final paragraph?',
        options: ['Students should try handwriting their notes for a month.', 'Universities should ban laptops from lecture halls.', 'Students with disabilities should use notebooks.', 'Students should record lectures instead of writing notes.'],
        explanation: "The writer is 'not suggesting that universities should ban laptops' but encourages students to 'take handwritten notes for one month'.",
      },
    ],
  },
  {
    id: 'r-b2-2',
    level: 4,
    title: 'Keeping cool the old way',
    text:
      'Summer temperatures in Gulf cities regularly pass 45°C, and the usual response is obvious: more air conditioning. In some buildings in the region, cooling already accounts for more than half of all electricity use, and as cities grow, that figure is likely to rise. Yet the traditional architecture of the Gulf suggests that we have forgotten some useful lessons.\n\n' +
      'Long before electricity, builders here used wind towers, known as barjeel, to catch passing breezes and direct them down into the rooms below. Houses were built close together along narrow lanes, so that the buildings shaded each other and the streets stayed cool for much of the day. Thick walls, small windows and inner courtyards did the rest.\n\n' +
      'Nobody seriously proposes returning to life without air conditioning. However, several recent projects have shown that these ideas can be adapted for modern buildings. Shaded walkways, buildings arranged to channel the wind and reflective materials on roofs can considerably reduce the need for cooling, at relatively little cost.\n\n' +
      'The difficulty is that such features must be planned from the very start. Wide roads and isolated glass towers, which have dominated development in recent decades, make the problem worse, and they cannot easily be corrected later. If planners want cities that are comfortable to live in without ever-higher energy bills, the time to apply these old lessons is before the next district is built, not after.',
    questions: [
      {
        id: 'r-b2-2-q1',
        prompt: "What is the writer's view of air conditioning?",
        options: ['It will still be needed, but we could depend on it less.', 'It should be replaced completely by wind towers.', 'It is the only realistic answer to the summer heat.', 'It is useful, but should be banned in new districts.'],
        explanation: "The writer says 'Nobody seriously proposes returning to life without air conditioning', but old ideas 'can considerably reduce the need for cooling'.",
      },
      {
        id: 'r-b2-2-q2',
        prompt: 'Why were traditional houses built close together?',
        options: ['So that they kept each other in the shade', 'So that the wind towers could catch more breezes', 'So that the lanes between them stayed wide', 'So that they needed fewer thick walls'],
        explanation: "Houses were built close together 'so that the buildings shaded each other'.",
      },
      {
        id: 'r-b2-2-q3',
        prompt: 'What is the main point of the final paragraph?',
        options: ['Cooling features must be included when an area is first planned.', 'Existing glass towers should be replaced with traditional houses.', 'Older districts are more comfortable to live in than new ones.', 'Energy bills in Gulf cities will soon stop rising.'],
        explanation: "The writer says these features 'must be planned from the very start' and should be used 'before the next district is built, not after'.",
      },
    ],
  },
  {
    id: 'r-b2-3',
    level: 4,
    title: 'Review: the Pulse 4 watch',
    text:
      'On paper, the Pulse 4 has everything you could want from a fitness watch. It counts your steps, tracks your sleep, measures your heart rate and even reminds you to drink water. The screen is bright enough to read in direct sunlight, and at £149 it costs considerably less than its best-known competitors.\n\n' +
      'For the first fortnight, I was impressed. Setting it up took less than five minutes, and the app presents your data in clear, colourful charts. The battery, which the manufacturer claims will last ten days, actually lasted closer to eight, but that is still better than most watches at this price.\n\n' +
      "The problems began when I compared its figures with those from other devices. On a five-kilometre run, the Pulse 4 told me I had covered just over four. Its sleep tracking was even stranger: on one night when I lay awake reading until two in the morning, the watch congratulated me on nine hours of 'excellent rest'.\n\n" +
      "Does this matter? That depends on what you want. If you simply need a gentle push to move more during the day, the Pulse 4 will do the job, and its reminders are genuinely motivating. But if you are training for a race or trying to understand a sleep problem, you need numbers you can trust, and I'm afraid this watch cannot provide them.",
    questions: [
      {
        id: 'r-b2-3-q1',
        prompt: 'What does the reviewer say about the battery?',
        options: ["It didn't last as long as claimed, but was still good.", 'It lasted longer than the manufacturer had said.', 'It was weaker than most watches at the same price.', 'It lasted exactly as long as the manufacturer said.'],
        explanation: "It 'lasted closer to eight' days, not ten, 'but that is still better than most watches at this price'.",
      },
      {
        id: 'r-b2-3-q2',
        prompt: 'Why does the reviewer mention lying awake reading until two in the morning?',
        options: ["To show that the watch's sleep data was wrong", 'To show that the screen is easy to read at night', 'To explain why the five-kilometre run felt hard', "To show that the watch's reminders really work"],
        explanation: "Although the reviewer was awake, 'the watch congratulated me on nine hours of excellent rest', so its sleep tracking was inaccurate.",
      },
      {
        id: 'r-b2-3-q3',
        prompt: 'Who would the reviewer recommend the Pulse 4 to?',
        options: ['People who want encouragement to be more active', 'Runners who are preparing for a race', 'People who want to understand a sleep problem', 'People who mainly want accurate heart-rate data'],
        explanation: "The reviewer says that 'If you simply need a gentle push to move more', the watch 'will do the job'.",
      },
    ],
  },

  // ---------------------------------------------------------------- C1
  {
    id: 'r-c1-1',
    level: 5,
    title: 'The uses of boredom',
    text:
      'For most of history, boredom was simply part of life: the long wait for a bus, the empty hour before dinner, the slow afternoon with nothing to do. Today, such moments have all but disappeared. The instant we feel the first flicker of restlessness, we reach for a device that promises to fill the gap, and it almost always delivers.\n\n' +
      'This might seem like an unqualified improvement. Boredom is, after all, unpleasant, and few people would volunteer to experience more of it. Yet a growing body of psychological research suggests that we may have thrown away something of value. In a number of experiments, participants who were first given a deliberately dull task – copying numbers from a phone directory, in one well-known study – went on to produce more original ideas than those who had moved straight to the creative exercise.\n\n' +
      'The explanation, researchers propose, is that boredom acts as a signal. It tells us that our current situation is not rewarding enough, and it pushes the mind to search elsewhere – into memory, imagination and daydreams. It is in this wandering state that unexpected connections tend to form. By constantly supplying our brains with fresh stimulation, we may be silencing that signal before it has a chance to do its work.\n\n' +
      'None of this means that we should seek out tedium for its own sake, and the research is not without its critics, who point out that many of the studies were small. But it does raise an uncomfortable question about the way we now spend our idle minutes. The next time you find yourself with nothing to do, it may be worth resisting the urge to fill the silence, at least for a while.',
    questions: [
      {
        id: 'r-c1-1-q1',
        prompt: "In the first paragraph, what does 'it' refer to in 'it almost always delivers'?",
        options: ['The device', 'The gap', 'The flicker of restlessness', 'Boredom'],
        explanation: "We reach for 'a device that promises to fill the gap', and the device almost always does what it promises.",
      },
      {
        id: 'r-c1-1-q2',
        prompt: 'Why does the writer mention copying numbers from a phone directory?',
        options: ['As an example of a dull task used in research', 'To show how people passed the time before devices', 'As an example of a creative exercise in a study', 'To criticise the methods of a well-known study'],
        explanation: "It is given as an example of 'a deliberately dull task' that participants did before a creative exercise.",
      },
      {
        id: 'r-c1-1-q3',
        prompt: 'How does the writer present the research on boredom?',
        options: ['As thought-provoking but not yet conclusive', 'As clear proof that devices harm creativity', 'As too weak to be taken seriously at all', 'As promising, though it is based only on surveys'],
        explanation: "The writer notes critics say 'many of the studies were small', but says the research 'does raise an uncomfortable question'. The studies were experiments, not surveys.",
      },
    ],
  },
  {
    id: 'r-c1-2',
    level: 5,
    title: 'Flexible working pilot',
    text:
      'Over the six-month pilot, employees in the three participating departments were permitted to choose their own start and finish times, provided they were available between 10 a.m. and 3 p.m. and worked their contracted hours. This section summarises the main findings and their implications for a possible wider roll-out.\n\n' +
      'Overall, the response was strongly positive. In the final survey, 82 per cent of participants reported a better balance between work and home life, and sickness absence fell by around a fifth compared with the same period the previous year. Managers in two of the three departments reported no loss of productivity; in Customer Services, average response times actually improved, largely because staff who preferred early starts were able to cover the morning peak in enquiries. Interestingly, the arrangements people chose were rarely radical: most participants moved their working day by less than an hour.\n\n' +
      "The picture was less encouraging in Product Design. Here, team members came to rely heavily on the shared core hours for meetings, which left little time for the focused work the department depends on. Several designers commented that they felt they were 'always in a meeting or waiting for one'. Notably, this was not a problem the pilot itself had created; the survey suggests that meeting overload existed before, but that compressing collaboration into fewer hours made it far more visible.\n\n" +
      'On balance, the evidence supports extending the scheme across the organisation. However, it would be unwise to do so without first addressing how teams plan meetings. We recommend that any roll-out be accompanied by clear guidance on limiting meetings during core hours, and that Product Design be invited to help draft it, given that its experience has been the most instructive.',
    questions: [
      {
        id: 'r-c1-2-q1',
        prompt: 'Why did response times improve in Customer Services?',
        options: ['Early starters could handle the busy morning period.', 'Staff took fewer days off sick than in the past.', 'Staff worked more hours than their contracts required.', 'Meetings were limited to the shared core hours.'],
        explanation: "Response times improved 'largely because staff who preferred early starts were able to cover the morning peak in enquiries'.",
      },
      {
        id: 'r-c1-2-q2',
        prompt: 'What does the report suggest about the difficulties in Product Design?',
        options: ['The pilot exposed a problem rather than causing it.', 'They were caused by letting staff choose their hours.', 'They disappeared once meetings were moved to core hours.', 'They affected all three departments to the same degree.'],
        explanation: "The report says 'this was not a problem the pilot itself had created'; meeting overload 'existed before' but became 'far more visible'.",
      },
      {
        id: 'r-c1-2-q3',
        prompt: 'Why does the report recommend involving Product Design in writing the guidance?',
        options: ['Its problems offer the most useful lessons.', 'It was the most successful department in the pilot.', 'Its managers asked to write it in the survey.', 'It had the largest fall in sickness absence.'],
        explanation: "Product Design should help 'given that its experience has been the most instructive', meaning the others can learn most from it.",
      },
    ],
  },
  {
    id: 'r-c1-3',
    level: 5,
    title: "The restorer's dilemma",
    text:
      "When a centuries-old painting arrives in a conservation studio, it rarely looks the way its creator intended. Varnish applied by earlier owners will have yellowed, colours may have faded unevenly, and past repairs, some of them clumsy, can obscure whole sections of the image. The restorer's task seems straightforward: to recover the original. In practice, it is anything but.\n\n" +
      "The first difficulty is that 'the original' is often impossible to identify with certainty. Some pigments change colour over time in ways that cannot be reversed, so even a perfectly cleaned surface will not match what the artist saw. Removing varnish can also remove thin final layers of paint that the artist added deliberately, and once these are gone, they cannot be replaced.\n\n" +
      "A second, more philosophical difficulty concerns what audiences value. Some critics argue that the signs of age – the fine network of cracks, the softened tones – have become part of a painting's character, and that a heavily cleaned work can look disturbingly new, almost like a reproduction. When a famous portrait or wall painting is restored, the unveiling is frequently followed by complaints that it has been 'ruined', even when the work was carried out with exceptional care.\n\n" +
      "Most conservators today take a cautious position. They aim to stabilise a painting and remove only what is clearly later material, and they increasingly favour treatments that can be undone by future specialists with better techniques. This approach is less dramatic than a full restoration, and it rarely produces headlines. But it reflects a growing recognition that each generation's certainty about what a painting 'should' look like has, sooner or later, been questioned by the next.",
    questions: [
      {
        id: 'r-c1-3-q1',
        prompt: "According to the writer, why is it hard to identify 'the original'?",
        options: ['Some colours have changed in ways that cannot be undone.', 'Artists rarely kept records of the colours they used.', 'Restorers cannot agree on which varnish to remove.', 'All earlier repairs were carried out badly.'],
        explanation: "The writer says 'Some pigments change colour over time in ways that cannot be reversed'.",
      },
      {
        id: 'r-c1-3-q2',
        prompt: 'What point does the writer make about public reactions to restored paintings?',
        options: ['Even very careful work can be criticised.', 'Audiences generally prefer cleaned paintings.', 'Complaints are usually caused by careless work.', 'Critics want restorers to remove all the cracks.'],
        explanation: "Complaints that a work has been 'ruined' follow 'even when the work was carried out with exceptional care'.",
      },
      {
        id: 'r-c1-3-q3',
        prompt: 'What does the final sentence imply?',
        options: ["Today's views on restoration may also be questioned later.", 'Future specialists will finally discover the true original.', 'Each generation restores paintings more carefully than the last.', 'Full restorations are likely to become popular again.'],
        explanation: "Each generation's certainty 'has, sooner or later, been questioned by the next', which suggests present-day views will be too.",
      },
    ],
  },

  // ---------------------------------------------------------------- C2
  {
    id: 'r-c2-1',
    level: 6,
    title: 'The authenticity trap',
    text:
      "Few phrases are uttered with more quiet pride by modern travellers than 'off the beaten track'. The ambition is understandable: to see a place as it 'really' is, unmediated by tour buses and souvenir stalls, and to return with experiences that cannot be bought in a package. It is also, on closer inspection, a little peculiar, not least because the traveller who boasts of escaping the tourists is, by any reasonable definition, a tourist too.\n\n" +
      "For one thing, the hunt for authenticity is now itself an industry. Guidebooks promise 'hidden gems', apps rank 'local favourites', and entire neighbourhoods have been remodelled to look convincingly untouched. Some cafés now advertise themselves, without apparent embarrassment, as the places 'where the locals go'. The traveller who flees the crowds in search of the genuine article frequently discovers that the crowds, guided by the same recommendations, have arrived first. There is an irony here that the industry, to its credit, seems in no hurry to point out.\n\n" +
      "More fundamentally, the very notion of an 'authentic' place rests on a questionable assumption: that there exists some fixed, traditional version of a culture against which its present form can be measured and found wanting. Yet cultures have always borrowed, adapted and reinvented. The street-food stall that visitors seek out as a taste of timeless tradition may serve a dish that, a generation ago, nobody in the city had heard of. To insist that residents preserve a version of themselves that suits visitors' expectations is, however politely expressed, a curious form of entitlement.\n\n" +
      'None of this is to suggest that the desire to travel thoughtfully is misplaced. Seeking out small, locally owned businesses, learning a few phrases of the language and spending longer in fewer places are all, by most measures, preferable to racing between landmarks. The problem lies not in such habits but in the self-congratulation that often accompanies them: the conviction that one is somehow a superior kind of visitor. Perhaps the most authentic thing a traveller can do is admit to being a tourist, and behave like a considerate one.',
    questions: [
      {
        id: 'r-c2-1-q1',
        prompt: 'What irony does the writer identify in the second paragraph?',
        options: ["Shared recommendations send many people to the same 'hidden' places.", 'Guidebooks deliberately keep the best places secret from readers.', 'Local residents now prefer tourists to stay in package hotels.', 'Remodelled neighbourhoods have become less popular with visitors.'],
        explanation: "Travellers fleeing the crowds find 'the crowds, guided by the same recommendations, have arrived first'.",
      },
      {
        id: 'r-c2-1-q2',
        prompt: "What does the writer mean by 'a curious form of entitlement'?",
        options: ['It is unreasonable to expect residents to stay unchanged for visitors.', 'Residents unfairly expect visitors to pay more for traditional food.', 'Visitors who travel independently deserve a more genuine experience.', 'Residents have no right to change the dishes they traditionally serve.'],
        explanation: "The phrase describes the demand 'that residents preserve a version of themselves that suits visitors' expectations', which the writer finds unjustified.",
      },
      {
        id: 'r-c2-1-q3',
        prompt: "Which best describes the writer's position in the final paragraph?",
        options: ['Thoughtful habits are worthwhile; feeling superior about them is not.', 'Thoughtful travel is really just a disguised form of snobbery.', 'Package tours are more respectful than independent travel.', 'Travellers should avoid places that are popular with other tourists.'],
        explanation: "The writer says such habits are 'preferable to racing between landmarks'; 'The problem lies not in such habits but in the self-congratulation'.",
      },
    ],
  },
  {
    id: 'r-c2-2',
    level: 6,
    title: 'Review: The Arithmetic of Everything',
    text:
      "Books that set out to explain how numbers govern our lives tend to fall into one of two camps: breathless celebrations of data or gloomy warnings about it. Miriam Osei's The Arithmetic of Everything belongs, refreshingly, to neither, though it occasionally seems unsure which it would rather avoid more.\n\n" +
      "Osei's central claim is that measurement is never neutral: the decision to count something – steps walked, hours worked, books read – subtly changes how we value it. Her early chapters develop this idea with considerable elegance, and she is particularly good on the quiet way in which a number, once published, stops being a description and starts becoming a target. The account of a hospital that, having been judged on waiting times, began to measure them more creatively rather than reducing them is both funny and quietly devastating. So, too, is her portrait of a keen runner who abandons a favourite trail because it confuses his watch's GPS.\n\n" +
      'The difficulty arises in the second half, where Osei turns from diagnosis to prescription. Having persuasively shown that metrics distort, she is understandably reluctant to dismiss them altogether, since many of the improvements she admires, in public health for instance, would have been impossible without careful counting. The result is a series of recommendations so carefully balanced that they risk saying very little: measure, but not too much; trust the figures, but not blindly. One finishes these chapters agreeing with nearly every sentence and remembering almost none of them.\n\n' +
      'It would be unfair to make too much of this. The problem Osei has chosen is genuinely hard, and her refusal to offer a neat solution is arguably more honest than the confident formulas of her competitors. Her prose, moreover, remains lucid throughout, even where her argument loses its edge. Readers looking for a manifesto will be disappointed. Those willing to tolerate a little uncertainty will find in the first half one of the sharpest accounts of the subject in recent years, and in the second, at the very least, the right questions.',
    questions: [
      {
        id: 'r-c2-2-q1',
        prompt: "What does the reviewer suggest by saying the book 'seems unsure which it would rather avoid more'?",
        options: ['Its balance between the two extremes is not always steady.', 'It attacks both camps openly and with equal force.', 'It was written to appeal to readers from both camps.', 'It finally sides with the gloomy warnings about data.'],
        explanation: "The book rejects both 'celebrations' and 'warnings', but at times it seems to waver between them rather than keep a firm middle position.",
      },
      {
        id: 'r-c2-2-q2',
        prompt: 'Why does the reviewer mention the hospital?',
        options: ["It illustrates the book's main claim in a way the reviewer admires.", 'It shows that most of the examples in the book come from healthcare.', 'It is an example of an improvement made possible by careful counting.', 'It shows that the book treats a serious subject too lightly.'],
        explanation: "The hospital that measured waiting times 'more creatively rather than reducing them' shows that counting changes behaviour; the reviewer calls it 'funny and quietly devastating'.",
      },
      {
        id: 'r-c2-2-q3',
        prompt: "What is the reviewer's main criticism of the second half?",
        options: ['Its advice is sensible but too cautious to be memorable.', 'It contradicts the arguments made in the first half.', 'It is dishonest about the benefits of measurement.', 'It offers formulas that are too confident to be trusted.'],
        explanation: "The recommendations are 'so carefully balanced that they risk saying very little'; readers agree 'with nearly every sentence' but remember 'almost none'.",
      },
    ],
  },
  {
    id: 'r-c2-3',
    level: 6,
    title: 'Language and thought',
    text:
      'Few ideas in the study of language have had such a turbulent reputation as the suggestion that the language we speak shapes the way we think. In its strongest form, which holds that speakers are confined to the concepts their vocabulary provides, it has been largely discredited: people plainly can grasp distinctions for which their language has no single word, and translation, however imperfect, would otherwise be impossible. For several decades the topic was treated in many university departments as something of an embarrassment.\n\n' +
      "The past twenty years, however, have seen a more modest version return to respectability. Experimental work suggests that linguistic habits can nudge attention and memory in measurable, if small, ways. Speakers of languages that describe location in terms of compass directions rather than 'left' and 'right', for instance, appear to keep track of orientation more consistently, even in non-verbal tasks. Similarly, languages that divide the colour spectrum differently seem to give their speakers a slight advantage in distinguishing shades that fall either side of one of their category boundaries.\n\n" +
      'It would be easy to overstate what such findings show. The effects are generally modest, they often weaken or disappear when participants are given a task that occupies their verbal memory, and in some cases it remains unclear whether language is shaping thought or whether a community\'s environment and practices have shaped both. People who navigate open landscapes daily may well develop directional habits and the vocabulary to match, without one being the cause of the other.\n\n' +
      'What emerges, then, is a position less exciting than either the original hypothesis or its dismissal. Language does not imprison thought, but nor is it a transparent window through which thought passes unchanged. It is better understood as one influence among many: a set of well-worn paths that make some routes through experience easier to take, without ever closing the others. That conclusion is unlikely to inspire popular books. It does, however, have the considerable merit of being consistent with the evidence.',
    questions: [
      {
        id: 'r-c2-3-q1',
        prompt: 'Why has the strongest form of the idea been largely rejected?',
        options: ['People can understand ideas their language has no single word for.', 'Translation between languages has been shown to be impossible.', 'Experiments found that language has no effect on memory.', 'Speakers of different languages divide colours in the same way.'],
        explanation: "The writer says 'people plainly can grasp distinctions for which their language has no single word'.",
      },
      {
        id: 'r-c2-3-q2',
        prompt: 'What alternative explanation does the writer raise in the third paragraph?',
        options: ['Environment and daily practices may shape both language and thinking.', 'Verbal memory tasks may create effects that do not really exist.', 'Directional vocabulary may lead communities to explore open landscapes.', 'Differences in colour vision may be caused by eyesight alone.'],
        explanation: "It may be that 'a community's environment and practices have shaped both', 'without one being the cause of the other'.",
      },
      {
        id: 'r-c2-3-q3',
        prompt: "What is the writer's attitude to the conclusion in the final paragraph?",
        options: ['It is unexciting but well supported by the evidence.', 'It is exciting enough to interest the general public.', 'It is a compromise that ignores the strongest research.', 'It is likely to be dismissed like the original hypothesis.'],
        explanation: "The conclusion is 'unlikely to inspire popular books', but has 'the considerable merit of being consistent with the evidence'.",
      },
    ],
  },
];
