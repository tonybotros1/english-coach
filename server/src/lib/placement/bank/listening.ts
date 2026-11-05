import type { ListeningItem } from './types';

/**
 * Listening items for the placement test, 8 per CEFR level (A1 to C2).
 * Each recording is read aloud by the phone's text-to-speech engine, so the
 * text is written exactly as it should be spoken: no symbols, abbreviations
 * or stage directions, and numbers, times and prices written out in words.
 * The FIRST option in every `options` array is the correct answer.
 */
export const LISTENING: readonly ListeningItem[] = [
  // ---------------------------------------------------------------- A1
  {
    id: 'l-a1-01',
    level: 1,
    lines: [{ speaker: 'A', text: 'Hello, I am Sam. I am from Egypt, but I live in Dubai now. I am a nurse.' }],
    prompt: 'Where does Sam live now?',
    options: ['In Dubai', 'In Egypt', 'In Cairo', 'In London'],
    explanation: 'Sam says "I am from Egypt, but I live in Dubai now." Egypt is where Sam comes from.',
  },
  {
    id: 'l-a1-02',
    level: 1,
    lines: [
      { speaker: 'A', text: 'Excuse me, what time does the bus leave?' },
      { speaker: 'B', text: 'At ten past four. It is three o\'clock now.' },
    ],
    prompt: 'What time does the bus leave?',
    options: ['At ten past four', 'At three o\'clock', 'At four o\'clock', 'At ten past three'],
    explanation: 'The answer is "At ten past four." Three o\'clock is the time now.',
  },
  {
    id: 'l-a1-03',
    level: 1,
    lines: [
      { speaker: 'A', text: 'How much is the blue bag, please?' },
      { speaker: 'B', text: 'The blue bag is forty dirhams. The red bag is twenty-five dirhams.' },
    ],
    prompt: 'How much is the blue bag?',
    options: ['Forty dirhams', 'Twenty-five dirhams', 'Fourteen dirhams', 'Sixty-five dirhams'],
    explanation: '"The blue bag is forty dirhams." Twenty-five dirhams is the price of the red bag.',
  },
  {
    id: 'l-a1-04',
    level: 1,
    lines: [
      {
        speaker: 'A',
        text: 'Hi, this is Alex. My phone number is oh five oh, three four seven, two nine one eight. Thank you.',
      },
    ],
    prompt: 'What is Alex\'s phone number?',
    options: ['050 347 2918', '050 374 2918', '050 347 2981', '015 347 2918'],
    explanation: 'Alex says "oh five oh, three four seven, two nine one eight", so the number is 050 347 2918.',
  },
  {
    id: 'l-a1-05',
    level: 1,
    lines: [
      { speaker: 'A', text: 'When is your English class?' },
      { speaker: 'B', text: 'It is on Monday and Thursday, at six in the evening.' },
    ],
    prompt: 'What time is the English class?',
    options: ['At six in the evening', 'At six in the morning', 'At seven in the evening', 'At two in the afternoon'],
    explanation: 'The class is "at six in the evening", on Monday and Thursday.',
  },
  {
    id: 'l-a1-06',
    level: 1,
    lines: [
      { speaker: 'A', text: 'I have two brothers and one sister. My sister is a teacher. My brothers are students.' },
    ],
    prompt: 'How many brothers does the speaker have?',
    options: ['Two', 'One', 'Three', 'Four'],
    explanation: 'The speaker says "I have two brothers and one sister." One is the number of sisters.',
  },
  {
    id: 'l-a1-07',
    level: 1,
    lines: [
      { speaker: 'A', text: 'Excuse me, where is the bank?' },
      { speaker: 'B', text: 'It is next to the supermarket, opposite the park.' },
    ],
    prompt: 'Where is the bank?',
    options: ['Next to the supermarket', 'Opposite the supermarket', 'Next to the park', 'Behind the park'],
    explanation: 'The bank is "next to the supermarket, opposite the park", not next to the park.',
  },
  {
    id: 'l-a1-08',
    level: 1,
    lines: [
      {
        speaker: 'A',
        text: 'This is my friend Ali. He is twenty-three. He works in a hotel. His brother works in a hospital.',
      },
    ],
    prompt: 'Where does Ali work?',
    options: ['In a hotel', 'In a hospital', 'In a school', 'In a shop'],
    explanation: '"He works in a hotel." It is Ali\'s brother who works in a hospital.',
  },

  // ---------------------------------------------------------------- A2
  {
    id: 'l-a2-01',
    level: 2,
    lines: [
      {
        speaker: 'A',
        text: 'The train to Manchester will leave from platform six, not platform four. The train is ten minutes late and will now leave at twenty past eleven. We are sorry for the delay.',
      },
    ],
    prompt: 'Which platform does the Manchester train leave from?',
    options: ['Platform six', 'Platform four', 'Platform ten', 'Platform eleven'],
    explanation: 'The announcement says "platform six, not platform four". Ten is the number of minutes late.',
  },
  {
    id: 'l-a2-02',
    level: 2,
    lines: [
      { speaker: 'A', text: 'Shall we meet at the café at four o\'clock tomorrow?' },
      { speaker: 'B', text: 'Sorry, I finish work at five on Thursdays. Can we meet at six?' },
      { speaker: 'A', text: 'Yes, six is fine. See you then.' },
    ],
    prompt: 'What time will they meet?',
    options: ['At six o\'clock', 'At four o\'clock', 'At five o\'clock', 'At half past five'],
    explanation: 'The second speaker finishes work at five and asks "Can we meet at six?" The answer is "Yes, six is fine."',
  },
  {
    id: 'l-a2-03',
    level: 2,
    lines: [
      { speaker: 'A', text: 'Excuse me, how do I get to the post office?' },
      {
        speaker: 'B',
        text: 'Go straight on and take the second street on the left. The post office is on the right, next to the bank.',
      },
    ],
    prompt: 'Which street should the person take?',
    options: ['The second on the left', 'The first on the left', 'The second on the right', 'The first on the right'],
    explanation: 'The directions are "take the second street on the left". "On the right" is where the post office is in that street.',
  },
  {
    id: 'l-a2-04',
    level: 2,
    lines: [
      {
        speaker: 'A',
        text: 'Good afternoon, shoppers. Today only, all children\'s shoes are half price. The shoe department is on the second floor, next to the café. The store closes at nine o\'clock this evening.',
      },
    ],
    prompt: 'What is cheaper today?',
    options: ['Children\'s shoes', 'Children\'s clothes', 'Drinks in the café', 'Women\'s shoes'],
    explanation: 'The announcement says "all children\'s shoes are half price". The café is only where the shoe department is.',
  },
  {
    id: 'l-a2-05',
    level: 2,
    lines: [
      {
        speaker: 'A',
        text: 'Hi Noor, it\'s Chris. I\'m sorry, but I can\'t come to the cinema tonight. My car isn\'t working. Can we go on Saturday afternoon instead? Please call me back.',
      },
    ],
    prompt: 'When does Chris want to go to the cinema?',
    options: ['On Saturday afternoon', 'This evening, as planned', 'On Saturday evening', 'On Sunday afternoon'],
    explanation: 'Chris "can\'t come to the cinema tonight" and asks "Can we go on Saturday afternoon instead?"',
  },
  {
    id: 'l-a2-06',
    level: 2,
    lines: [
      { speaker: 'A', text: 'Are you ready to order?' },
      { speaker: 'B', text: 'Yes, I\'d like the chicken with rice, please.' },
      { speaker: 'A', text: 'I\'m sorry, we haven\'t got any chicken today. The fish is very good.' },
      { speaker: 'B', text: 'Okay, I\'ll have the fish, then, with salad instead of rice.' },
    ],
    prompt: 'What does the customer order?',
    options: ['Fish with salad', 'Chicken with rice', 'Fish with rice', 'Chicken with salad'],
    explanation: 'There is no chicken today, so the customer says "I\'ll have the fish, then, with salad instead of rice."',
  },
  {
    id: 'l-a2-07',
    level: 2,
    lines: [
      { speaker: 'A', text: 'Good morning, Riverside Health Centre. How can I help?' },
      { speaker: 'B', text: 'Hello, I\'d like to see a doctor today, please.' },
      { speaker: 'A', text: 'I\'m afraid we\'re full today. Is tomorrow morning at quarter to ten all right?' },
      { speaker: 'B', text: 'Yes, that\'s fine. Thank you.' },
    ],
    prompt: 'When is the appointment?',
    options: ['Tomorrow at quarter to ten', 'Today at quarter to ten', 'Tomorrow at quarter past ten', 'Today in the afternoon'],
    explanation: 'The centre is "full today" and offers "tomorrow morning at quarter to ten". The caller says "Yes, that\'s fine."',
  },
  {
    id: 'l-a2-08',
    level: 2,
    lines: [
      {
        speaker: 'A',
        text: 'Welcome to the Palm Hotel. Breakfast is in the garden restaurant from half past six to ten o\'clock. The swimming pool is open from eight in the morning until eight in the evening. Please leave your key at reception when you go out.',
      },
    ],
    prompt: 'What time does breakfast finish?',
    options: ['At ten o\'clock', 'At half past six', 'At eight o\'clock', 'At half past ten'],
    explanation: 'Breakfast is "from half past six to ten o\'clock". Eight o\'clock is when the pool opens and closes.',
  },

  // ---------------------------------------------------------------- B1
  {
    id: 'l-b1-01',
    level: 3,
    lines: [
      { speaker: 'A', text: 'Are we still meeting on Wednesday to work on the presentation?' },
      { speaker: 'B', text: 'Well, I\'ve got a dentist appointment on Wednesday afternoon. How about Tuesday morning instead?' },
      { speaker: 'A', text: 'Tuesday\'s no good, I\'m afraid. I\'m on a training course all day. What about Thursday?' },
      { speaker: 'B', text: 'Thursday\'s fine, but not before eleven. Let\'s say half past eleven in the library.' },
    ],
    prompt: 'When will they meet?',
    options: ['Thursday at half past eleven', 'Wednesday in the afternoon', 'Tuesday in the morning', 'Thursday at eleven o\'clock'],
    explanation: 'Wednesday and Tuesday are both impossible. They choose Thursday: "not before eleven. Let\'s say half past eleven."',
  },
  {
    id: 'l-b1-02',
    level: 3,
    lines: [
      {
        speaker: 'A',
        text: 'Hello, this is Jamie from Westside Motors with a message about your car. It\'s ready to collect, but the bill\'s a bit higher than we said. When we did the service, we found the front tyres were badly worn, so we had to replace them. That brings it to two hundred and eighty pounds instead of two hundred. We\'re open until six today, or you can pick it up tomorrow from eight.',
      },
    ],
    prompt: 'Why is the bill higher than expected?',
    options: [
      'The front tyres were replaced',
      'The service took longer than planned',
      'The car is being collected late',
      'The garage has raised its prices',
    ],
    explanation: 'Jamie says the front tyres "were badly worn, so we had to replace them". That is why it costs more.',
  },
  {
    id: 'l-b1-03',
    level: 3,
    lines: [
      { speaker: 'A', text: 'Hi, I bought this jacket here last week, but it\'s too small.' },
      { speaker: 'B', text: 'No problem. Would you like to change it for a bigger size, or have your money back?' },
      { speaker: 'A', text: 'A bigger size, please. But I can\'t see any large ones in blue.' },
      {
        speaker: 'B',
        text: 'We\'ve sold out of blue, I\'m afraid. We\'ve got large in black, or I can order a blue one for Monday.',
      },
      { speaker: 'A', text: 'I need it for the weekend, so I\'ll take the black one.' },
    ],
    prompt: 'What does the customer decide to do?',
    options: ['Take a large black jacket', 'Order a large blue jacket', 'Get the money back', 'Keep the small jacket'],
    explanation: 'Blue has sold out and an order would only arrive on Monday. The customer says "I\'ll take the black one."',
  },
  {
    id: 'l-b1-04',
    level: 3,
    lines: [
      {
        speaker: 'A',
        text: 'Good morning, everyone. Just a quick reminder about next week\'s trip to the science museum. The coach will leave from the main gate, not the car park like last time, at eight fifteen sharp. Please bring a packed lunch, because the museum café will be closed for repairs. And don\'t forget your student card, as you\'ll need it to get in free.',
      },
    ],
    prompt: 'Why should students bring a packed lunch?',
    options: [
      'The museum café will be closed',
      'Food at the museum is expensive',
      'There is no time to stop for lunch',
      'The coach leaves very early',
    ],
    explanation: 'Students should bring lunch "because the museum café will be closed for repairs".',
  },
  {
    id: 'l-b1-05',
    level: 3,
    lines: [
      { speaker: 'A', text: 'So, did you book the flights to Muscat?' },
      { speaker: 'B', text: 'Not yet. The morning flight was really cheap, but by the time I tried, it was full.' },
      { speaker: 'A', text: 'Oh no. What about the evening one?' },
      {
        speaker: 'B',
        text: 'It\'s nearly twice the price. Honestly, I think we should drive. It\'s only about five hours, and we can stop for lunch on the way.',
      },
      { speaker: 'A', text: 'Fine by me, as long as we take turns driving.' },
    ],
    prompt: 'How will they probably travel to Muscat?',
    options: ['By car, sharing the driving', 'On the cheap morning flight', 'On the evening flight', 'By coach, stopping for lunch'],
    explanation: 'The morning flight is full and the evening one is "nearly twice the price". They agree to drive: "Fine by me."',
  },
  {
    id: 'l-b1-06',
    level: 3,
    lines: [
      {
        speaker: 'A',
        text: 'Hi Priya, it\'s Robin. It\'s about tomorrow\'s meeting with the new clients. They\'ve asked to move it from ten to two, because their train gets in late. The problem is, I\'m at the other office all afternoon, so I can\'t be there. Could you lead it instead? All the notes are in the shared folder. Let me know if that\'s a problem. Thanks.',
      },
    ],
    prompt: 'What does Robin ask Priya to do?',
    options: [
      'Lead the meeting with the clients',
      'Move the meeting back to ten',
      'Meet the clients at the station',
      'Go to the other office instead',
    ],
    explanation: 'The meeting is now at two, when Robin is at the other office, so Robin asks "Could you lead it instead?"',
  },
  {
    id: 'l-b1-07',
    level: 3,
    lines: [
      { speaker: 'A', text: 'You look well. Are you still going to the gym before work?' },
      { speaker: 'B', text: 'No, I stopped going in the mornings. Getting up at five was just too much.' },
      { speaker: 'A', text: 'So have you given up completely?' },
      {
        speaker: 'B',
        text: 'Not at all. I go at lunchtime now. It\'s a bit busier, but I\'m sleeping much better, and I\'ve actually got more energy in the afternoons.',
      },
    ],
    prompt: 'Why did the second speaker stop going to the gym in the morning?',
    options: [
      'Getting up so early was too hard',
      'The gym was too busy in the mornings',
      'Work started earlier than before',
      'Lunchtime was cheaper at the gym',
    ],
    explanation: 'The second speaker says "Getting up at five was just too much." The gym is actually busier at lunchtime.',
  },
  {
    id: 'l-b1-08',
    level: 3,
    lines: [
      {
        speaker: 'A',
        text: 'Thank you for calling Greenfield Library. Please note that from the first of June, our opening hours are changing. From Monday to Friday, we\'ll open an hour later, at ten, but we\'ll stay open until eight in the evening instead of six. Saturday hours stay the same, nine until one. To renew your books, please use our website as usual.',
      },
    ],
    prompt: 'What will change from the first of June?',
    options: [
      'It will close later on weekdays',
      'It will open earlier on weekdays',
      'It will be open longer on Saturdays',
      'It will stop renewing books',
    ],
    explanation: 'On weekdays it will "stay open until eight in the evening instead of six". It opens later, not earlier, and Saturdays "stay the same".',
  },

  // ---------------------------------------------------------------- B2
  {
    id: 'l-b2-01',
    level: 4,
    lines: [
      { speaker: 'A', text: 'So how are you finding working from home three days a week?' },
      {
        speaker: 'B',
        text: 'Honestly, I thought I\'d love it. No commute, more time with the family. And the first month was great. But I\'ve noticed I\'m working longer hours, not shorter. I\'m checking emails at ten at night just because the laptop\'s sitting there.',
      },
      { speaker: 'A', text: 'Would you go back to the office full time, then?' },
      {
        speaker: 'B',
        text: 'No, I wouldn\'t go that far. I just need to be stricter with myself, set a finishing time and actually stick to it.',
      },
    ],
    prompt: 'How does the second speaker feel about working from home now?',
    options: [
      'Positive, but aware of a problem to solve',
      'Unhappy and keen to return to the office',
      'Happy, but finding the family distracting',
      'Worried about getting less work done',
    ],
    explanation: 'The speaker is working "longer hours", but "wouldn\'t go that far" as returning full time, and plans to "set a finishing time".',
  },
  {
    id: 'l-b2-02',
    level: 4,
    lines: [
      {
        speaker: 'A',
        text: 'Hi Sam, it\'s Alex from the accounts team. I\'m just ringing about the invoice you sent over on Monday. Everything looks fine, apart from one small thing. The hours for the second week seem to have been counted twice, so the total\'s come out quite a bit higher than we agreed. I\'m sure it\'s just a mix-up in the spreadsheet. If you could send me a corrected version by Thursday, I can get it paid before the end of the month. Thanks.',
      },
    ],
    prompt: 'What is the main purpose of the call?',
    options: [
      'To ask for a corrected invoice',
      'To say the invoice has been paid',
      'To complain about a late payment',
      'To agree a higher total for the work',
    ],
    explanation: 'Alex has found hours "counted twice" and asks Sam to "send me a corrected version by Thursday". Payment comes only after that.',
  },
  {
    id: 'l-b2-03',
    level: 4,
    lines: [
      { speaker: 'A', text: 'Have you tried the new Italian place on the corner?' },
      { speaker: 'B', text: 'We went on Friday, actually, for my brother\'s birthday.' },
      { speaker: 'A', text: 'And? Is it as good as everyone says?' },
      {
        speaker: 'B',
        text: 'Well, the decor\'s lovely, and the staff were very friendly. We did wait about forty minutes for our main course, mind you. And the pasta was, let\'s say, nothing I couldn\'t make at home.',
      },
      { speaker: 'A', text: 'So you\'d recommend it?' },
      { speaker: 'B', text: 'If you\'re going for the atmosphere, sure.' },
    ],
    prompt: 'What does the second speaker suggest about the restaurant?',
    options: [
      'The food was disappointing',
      'The staff were unfriendly',
      'The prices were too high',
      'The decor was unattractive',
    ],
    explanation: 'The pasta was "nothing I couldn\'t make at home", and it is only recommended "for the atmosphere". The decor and staff were praised.',
  },
  {
    id: 'l-b2-04',
    level: 4,
    lines: [
      {
        speaker: 'A',
        text: 'Before we start, a word about the essay deadline. A number of you have asked whether it can be moved, because of the exams in the same week. I\'ve spoken to the department, and I\'m afraid the date itself can\'t change. What I can do is look at a plan of your essay a week earlier and give you feedback on it, so that the final writing goes more quickly. It\'s optional, but I\'d strongly encourage it.',
      },
    ],
    prompt: 'What does the lecturer offer the students?',
    options: [
      'Feedback on an essay plan',
      'A later essay deadline',
      'A shorter essay to write',
      'Extra help with the exams',
    ],
    explanation: 'The deadline "can\'t change", but the lecturer can "look at a plan of your essay a week earlier and give you feedback on it".',
  },
  {
    id: 'l-b2-05',
    level: 4,
    lines: [
      { speaker: 'A', text: 'Have you had a chance to look at the new booking system yet?' },
      { speaker: 'B', text: 'I\'ve had a play with it. It\'s certainly faster than the old one, I\'ll give it that.' },
      { speaker: 'A', text: 'But?' },
      {
        speaker: 'B',
        text: 'But they\'ve changed the whole layout without asking any of us who actually use it every day. It took me twenty minutes to find the cancel button.',
      },
      { speaker: 'A', text: 'It\'ll probably get easier once we\'re used to it.' },
      { speaker: 'B', text: 'Maybe. I just wish they\'d asked.' },
    ],
    prompt: 'What is the second speaker mainly unhappy about?',
    options: [
      'Users were not asked about the changes',
      'The new system is slower than before',
      'Bookings can no longer be cancelled',
      'There was no training on the system',
    ],
    explanation: 'The speaker complains they changed it "without asking any of us" and ends with "I just wish they\'d asked." It is "faster than the old one".',
  },
  {
    id: 'l-b2-06',
    level: 4,
    lines: [
      {
        speaker: 'A',
        text: 'A lot of people assume that if they\'re not hungry in the morning, skipping breakfast does no harm. And for many adults, that\'s probably true. What the research actually shows is more mixed than the headlines suggest. The bigger issue seems to be what people eat later on. If skipping breakfast means you\'re starving by eleven and reaching for the biscuits, then it\'s not doing you any favours. If it doesn\'t, there\'s no strong reason to force yourself to eat.',
      },
    ],
    prompt: 'What is the speaker\'s main point about skipping breakfast?',
    options: [
      'Its effect depends on what you eat later',
      'Everyone should eat a proper breakfast',
      'It is harmful for most adults',
      'It is usually fine, but only if you exercise',
    ],
    explanation: '"The bigger issue seems to be what people eat later on." It only matters if you end up "reaching for the biscuits".',
  },
  {
    id: 'l-b2-07',
    level: 4,
    lines: [
      {
        speaker: 'A',
        text: 'I\'ve found two hotels for the conference next month. One\'s right next to the venue, but it\'s pretty basic. The other\'s much nicer, with a pool, but it\'s half an hour away by taxi.',
      },
      {
        speaker: 'B',
        text: 'Half an hour each way, twice a day, in rush-hour traffic? You know what the roads are like round there in the morning. I\'d rather have a basic room and an extra hour in bed.',
      },
      { speaker: 'A', text: 'Fair enough. It\'s only for three nights, after all. I\'ll book the one next to the venue, then.' },
    ],
    prompt: 'Which hotel does the second speaker prefer, and why?',
    options: [
      'The basic one, because it saves travel time',
      'The nicer one, because it has a pool',
      'The basic one, because it is quieter',
      'The nicer one, because of the traffic',
    ],
    explanation: 'The nicer hotel means "half an hour each way" in traffic; the speaker would "rather have a basic room and an extra hour in bed".',
  },
  {
    id: 'l-b2-08',
    level: 4,
    lines: [
      {
        speaker: 'A',
        text: 'Hello, Layla, this is Jordan from Brightway Lettings. I\'m calling about the leak in your bathroom. I know you were promised a plumber on Tuesday, and I\'m really sorry nobody turned up. That\'s simply not acceptable, and I\'ve already spoken to the company about it. I\'ve now booked a different firm, and they\'ve confirmed they\'ll be with you tomorrow between eight and ten. If there\'s been any further damage, please take some photos and we\'ll cover the cost.',
      },
    ],
    prompt: 'What is the speaker\'s attitude?',
    options: [
      'Apologetic and keen to solve the problem',
      'Annoyed that Layla called so many times',
      'Unsure whether the leak is really serious',
      'Defensive about the first company\'s work',
    ],
    explanation: 'Jordan says "I\'m really sorry", calls the missed visit "not acceptable", and has "booked a different firm" for tomorrow.',
  },

  // ---------------------------------------------------------------- C1
  {
    id: 'l-c1-01',
    level: 5,
    lines: [
      {
        speaker: 'A',
        text: 'So I think we\'re agreed that moving the launch forward to March is the way to go. It gets us ahead of the competition.',
      },
      {
        speaker: 'B',
        text: 'I can certainly see the appeal. I suppose my only hesitation is that testing was planned around a June launch, and if we squeeze it, we may end up releasing something that isn\'t quite ready. I\'d hate our first impression to be a flood of complaints.',
      },
      { speaker: 'A', text: 'So you\'re against it?' },
      {
        speaker: 'B',
        text: 'I wouldn\'t put it like that. I\'d just want to see a realistic testing plan before we commit to a date.',
      },
    ],
    prompt: 'What is the second speaker\'s position on a March launch?',
    options: [
      'Open to it if testing can be done properly',
      'Firmly opposed to launching any earlier',
      'Fully in favour, as it beats competitors',
      'Open to it if the budget can be increased',
    ],
    explanation: 'Asked "So you\'re against it?", the speaker says "I wouldn\'t put it like that" and wants "a realistic testing plan before we commit".',
  },
  {
    id: 'l-c1-02',
    level: 5,
    lines: [
      {
        speaker: 'A',
        text: 'Let me start with something that might surprise you. There\'s a widely held belief that rereading your notes is a good way to revise. It feels productive, and that\'s precisely the problem. As the material becomes familiar, we mistake that sense of familiarity for understanding. When students are tested afterwards, those who spent the same time trying to recall the information without looking, however clumsily, consistently do better a week later than those who simply reread. So the discomfort of not quite remembering isn\'t a sign that the method is failing. If anything, it\'s the whole point.',
      },
    ],
    prompt: 'What does the speaker suggest about rereading notes?',
    options: [
      'It gives a false feeling of having learnt',
      'It is the most effective way to revise',
      'It works well if done for long enough',
      'It is uncomfortable for most students',
    ],
    explanation: 'Rereading "feels productive", but "we mistake that sense of familiarity for understanding". The discomfort belongs to trying to recall, not rereading.',
  },
  {
    id: 'l-c1-03',
    level: 5,
    lines: [
      { speaker: 'A', text: 'What did you make of the second candidate?' },
      { speaker: 'B', text: 'She was very polished. She\'d clearly done her homework on the company.' },
      { speaker: 'A', text: 'I can hear a but coming.' },
      {
        speaker: 'B',
        text: 'Well, every time we asked about a specific project, she moved quite quickly back to general principles. That may be nothing. Some people are just more comfortable talking in big-picture terms. But for a role that\'s mainly hands-on, I\'d want to be sure she\'s actually done the work herself.',
      },
      { speaker: 'A', text: 'So, a second interview?' },
      { speaker: 'B', text: 'I think that would be fair, yes. With a practical task this time.' },
    ],
    prompt: 'What concern does the second speaker have about the candidate?',
    options: [
      'She may lack real hands-on experience',
      'She knew too little about the company',
      'She seemed nervous and unprepared',
      'She focused too much on small details',
    ],
    explanation: 'She avoided specific projects, and for a "hands-on" role the speaker wants "to be sure she\'s actually done the work herself".',
  },
  {
    id: 'l-c1-04',
    level: 5,
    lines: [
      {
        speaker: 'A',
        text: 'Hi Jamal, it\'s Kim. Thanks for sending the report over last night. I\'ve had a first look, and there\'s some really solid analysis in there, particularly the section on customer retention. I did notice that the figures for the Gulf region don\'t quite match the ones finance sent round last week. I\'m sure there\'s a perfectly good explanation. It may well be that they\'re using a different period. But given that this is going to the board on Monday, it might be worth double-checking before then, just so nobody\'s caught off guard.',
      },
    ],
    prompt: 'What is Kim really asking Jamal to do?',
    options: [
      'Check the figures before the board meeting',
      'Rewrite the section on customer retention',
      'Send the report to the finance team',
      'Move the board meeting to a later date',
    ],
    explanation: 'The Gulf figures "don\'t quite match", and as the report goes "to the board on Monday", it is "worth double-checking before then".',
  },
  {
    id: 'l-c1-05',
    level: 5,
    lines: [
      { speaker: 'A', text: 'I was thinking we could just split the electricity bill equally, like we always have.' },
      {
        speaker: 'B',
        text: 'Hmm, that\'s one way of doing it. Though, to be fair, I\'ve been away with work for most of the last two months.',
      },
      {
        speaker: 'A',
        text: 'Right, but your fridge has still been running, and the heating\'s on a timer for the whole flat anyway.',
      },
      {
        speaker: 'B',
        text: 'Sure, sure. I just wonder whether paying half for a flat I\'ve barely been in is entirely, you know, reasonable.',
      },
      { speaker: 'A', text: 'Okay. So what did you have in mind?' },
      { speaker: 'B', text: 'Maybe we could look at it month by month, depending on who\'s actually been here.' },
    ],
    prompt: 'What does the second speaker think about the bill?',
    options: [
      'Splitting it equally this time is unfair',
      'They should keep splitting it equally',
      'The heating timer should be switched off',
      'They should change electricity company',
    ],
    explanation: 'The speaker doubts that "paying half for a flat I\'ve barely been in" is "reasonable" and suggests sharing "depending on who\'s actually been here".',
  },
  {
    id: 'l-c1-06',
    level: 5,
    lines: [
      {
        speaker: 'A',
        text: 'When people talk about smart homes, the conversation usually focuses on convenience: lights that switch themselves off, a fridge that tells you when you\'re out of milk. And there\'s nothing wrong with convenience. But I think we\'ve been rather slow to ask who these devices are actually working for. Every time your thermostat learns your routine, that information goes somewhere. I\'m not suggesting anyone throws their smart speaker out of the window. I\'d simply argue that being useful and being harmless are two quite different things, and we tend to treat them as one.',
      },
    ],
    prompt: 'What is the speaker\'s main argument?',
    options: [
      'Being useful does not make a device harmless',
      'People should get rid of smart devices',
      'Smart homes are less convenient than claimed',
      'Thermostats are the most worrying device',
    ],
    explanation: 'The speaker argues "being useful and being harmless are two quite different things", while "not suggesting anyone throws their smart speaker out".',
  },
  {
    id: 'l-c1-07',
    level: 5,
    lines: [
      { speaker: 'A', text: 'So, I\'ve had a look at the scan results. The good news is that nothing\'s broken.' },
      { speaker: 'B', text: 'That\'s a relief. So I can start running again this weekend?' },
      {
        speaker: 'A',
        text: 'I\'d hold off a little. There\'s some swelling around the tendon, which is fairly common, and it tends to settle on its own. But if you go straight back to ten kilometres, there\'s a real chance you\'ll end up back here in a month.',
      },
      { speaker: 'B', text: 'So, what, no running at all?' },
      {
        speaker: 'A',
        text: 'Not for now. Gentle walking, some cycling or swimming if it\'s comfortable. Give it three weeks, and then build up slowly.',
      },
    ],
    prompt: 'What is the doctor\'s advice?',
    options: [
      'Avoid running for now, then build up slowly',
      'Stop all forms of exercise for three weeks',
      'Keep running, but over shorter distances',
      'Come back for another scan in a month',
    ],
    explanation: 'The doctor says "I\'d hold off", allows "gentle walking, some cycling", then "Give it three weeks, and then build up slowly."',
  },
  {
    id: 'l-c1-08',
    level: 5,
    lines: [
      {
        speaker: 'A',
        text: 'I\'m often asked whether the four-day working week actually works. And the honest answer is that the early trials look encouraging. Productivity held steady, staff were happier, and fewer people left. But I\'d be cautious about reading too much into them. Most of the companies that took part volunteered, which suggests they already had the kind of culture where it was likely to succeed. Whether a hospital or a delivery firm could make it work in the same way is a much harder question, and frankly, we don\'t have the evidence yet.',
      },
    ],
    prompt: 'What is the speaker\'s view of the trials?',
    options: [
      'Promising, but not proof it works everywhere',
      'Clear proof that it works for every employer',
      'Disappointing, because productivity fell',
      'Promising, but only for very large companies',
    ],
    explanation: 'The trials "look encouraging", but the speaker is "cautious" because the firms "volunteered" and "we don\'t have the evidence yet" for others.',
  },

  // ---------------------------------------------------------------- C2
  {
    id: 'l-c2-01',
    level: 6,
    lines: [
      { speaker: 'A', text: 'So, how did the presentation to the client go?' },
      {
        speaker: 'B',
        text: 'Oh, marvellous. The projector gave up five minutes in, their finance director took three phone calls while I was talking, and at the end they asked, with a perfectly straight face, if we could do the whole thing for half the budget.',
      },
      { speaker: 'A', text: 'Ouch. Still, at least they stayed till the end.' },
      {
        speaker: 'B',
        text: 'They did, which I suppose counts as a triumph of sorts. Nobody actually fell asleep, either, as far as I could tell.',
      },
      { speaker: 'A', text: 'So, honestly, do you reckon they\'ll sign?' },
      {
        speaker: 'B',
        text: 'Honestly? I\'d put it at roughly the same odds as me being made their finance director by Friday.',
      },
    ],
    prompt: 'How likely does the second speaker think it is that the client will sign?',
    options: ['Very unlikely', 'Fairly likely', 'Certain by Friday', 'Likely at a lower price'],
    explanation: 'The odds are compared to "me being made their finance director by Friday", which is clearly almost impossible. "Marvellous" is ironic.',
  },
  {
    id: 'l-c2-02',
    level: 6,
    lines: [
      {
        speaker: 'A',
        text: 'I\'ll admit the first year of the project wasn\'t entirely without its challenges. We lost our main funder in the spring, two of our three lead researchers left for jobs abroad, and, for good measure, the lab flooded the week before our first results were due. So when people ask why we ended up eighteen months behind schedule, I\'m tempted to say we did rather well to be only eighteen months behind. That said, I don\'t want to hide behind bad luck. Some of the delay was down to us, and in particular to a plan that assumed, rather optimistically, that nothing would go wrong. That\'s the part I\'d do differently.',
      },
    ],
    prompt: 'What does the speaker finally admit?',
    options: [
      'The team\'s own planning was partly to blame',
      'The delay was caused entirely by bad luck',
      'The funder was mainly responsible for it',
      'The flood in the lab was the main cause',
    ],
    explanation: '"I don\'t want to hide behind bad luck. Some of the delay was down to us", especially a plan that "assumed" nothing "would go wrong".',
  },
  {
    id: 'l-c2-03',
    level: 6,
    lines: [
      { speaker: 'A', text: 'Have you read Hannah\'s proposal for the new office layout?' },
      { speaker: 'B', text: 'I have. I\'ll grant her this much, it\'s ambitious.' },
      { speaker: 'A', text: 'That sounds like faint praise, if ever I heard it.' },
      {
        speaker: 'B',
        text: 'Well, open plan for everyone, no fixed desks, no desk phones. On paper it\'s very slick. In practice, half the sales team spend all day on calls, and I\'m not sure they\'ll thank her for having to fight over a desk every morning.',
      },
      { speaker: 'A', text: 'So you\'d scrap the whole thing?' },
      {
        speaker: 'B',
        text: 'No, no, there\'s plenty in it worth keeping, the meeting rooms especially. I\'d just want the people who\'ll actually sit there to have a say before it\'s set in stone.',
      },
    ],
    prompt: 'What is the second speaker\'s view of the proposal?',
    options: [
      'It has merit but needs input from staff',
      'It should be rejected and started again',
      'It suits the needs of the sales team well',
      'It is sensible, but far too expensive',
    ],
    explanation: 'The speaker would not scrap it, as "there\'s plenty in it worth keeping", but wants the people who will sit there "to have a say".',
  },
  {
    id: 'l-c2-04',
    level: 6,
    lines: [
      {
        speaker: 'A',
        text: 'Hiya, it\'s Charlie. Look, I know I said I\'d have the kitchen finished by the weekend, and I genuinely meant it at the time. But we\'ve opened up the wall behind the old units and, put it this way, whoever did the wiring in there last was clearly making it up as they went along. I\'m not going to just cover it over and hope for the best. So realistically, it\'ll be the middle of next week, and I\'ll knock the extra day\'s labour off the bill, seeing as it was me who gave you the dodgy estimate. Give us a ring when you get a minute.',
      },
    ],
    prompt: 'Why will Charlie not charge for the extra day?',
    options: [
      'Charlie admits the estimate was wrong',
      'The customer complained about the delay',
      'Charlie caused the wiring problem',
      'The work will finish sooner than feared',
    ],
    explanation: 'The extra day is free "seeing as it was me who gave you the dodgy estimate". The bad wiring was done by someone before.',
  },
  {
    id: 'l-c2-05',
    level: 6,
    lines: [
      { speaker: 'A', text: 'Have you seen the email from finance about the new expenses app?' },
      { speaker: 'B', text: 'The one that\'s going to save us all hours every month?' },
      { speaker: 'A', text: 'That\'s the one.' },
      {
        speaker: 'B',
        text: 'I\'ve had a go, yes. You photograph your receipt, it reads it beautifully, and then insists, with total confidence, that a taxi from the airport was a stationery purchase. You correct it, it thinks about it for a while, and then it logs you out.',
      },
      { speaker: 'A', text: 'So, not quite the revolution we were promised, then.' },
      {
        speaker: 'B',
        text: 'Let\'s just say I\'ve gone back to the old spreadsheet, and I\'ve honestly never been so pleased to see it. Which tells you something.',
      },
    ],
    prompt: 'What does the second speaker think of the new app?',
    options: [
      'It is worse than the old method',
      'It saves a great deal of time',
      'It is fine apart from the photos',
      'It works well once you are used to it',
    ],
    explanation: 'The app mislabels receipts and logs users out, so the speaker has "gone back to the old spreadsheet". Saving "hours" is said ironically.',
  },
  {
    id: 'l-c2-06',
    level: 6,
    lines: [
      {
        speaker: 'A',
        text: 'Let me say something briefly about league tables. It\'s become fashionable to dismiss university rankings as meaningless, and I have some sympathy with that. They reward size and research spending, and they say very little about the quality of teaching a typical undergraduate actually receives. But I\'d stop short of calling them useless. For an employer abroad who\'s never heard of a particular institution, a ranking is at least a starting point, however crude, and that\'s not nothing. The mistake isn\'t consulting them at all. It\'s treating a single number as if it settled the question, when it was only ever meant to start one.',
      },
    ],
    prompt: 'What is the speaker\'s position on university rankings?',
    options: [
      'Flawed, but useful if not relied on alone',
      'Meaningless, and best ignored altogether',
      'A reliable guide to the quality of teaching',
      'Helpful, but mainly for students choosing a course',
    ],
    explanation: 'The speaker has "some sympathy" with critics but would "stop short of calling them useless". The mistake is "treating a single number as if it settled the question".',
  },
  {
    id: 'l-c2-07',
    level: 6,
    lines: [
      { speaker: 'A', text: 'So, how was the viewing? Was the flat as nice as the photos?' },
      {
        speaker: 'B',
        text: 'Well, the agent described it as cosy, and I\'ll give him that much. You could more or less make toast without getting up from the sofa.',
      },
      { speaker: 'A', text: 'Small, then, I take it.' },
      {
        speaker: 'B',
        text: 'Compact. And the stunning view of the canal he kept going on about turned out to involve a fair bit of leaning out of the bathroom window.',
      },
      { speaker: 'A', text: 'So that\'s a no, then?' },
      {
        speaker: 'B',
        text: 'Not necessarily. It\'s ten minutes\' walk from work, and the rent\'s about half what I\'m paying now. Frankly, I\'m prepared to overlook a great deal for that.',
      },
    ],
    prompt: 'How does the second speaker feel about the flat?',
    options: [
      'Willing to take it despite its drawbacks',
      'Determined not to take it at all',
      'Pleased mainly with the canal view',
      'Surprised by how much space it has',
    ],
    explanation: 'Asked "So that\'s a no, then?", the speaker says "Not necessarily" and is "prepared to overlook a great deal" for the location and rent.',
  },
  {
    id: 'l-c2-08',
    level: 6,
    lines: [
      {
        speaker: 'A',
        text: 'Five-star reviews are, I think we can safely say, not quite the independent verdict they appear to be. Some are written by friends, some are bought outright, and a surprising number come from people who\'ve been offered a discount in return. None of which means you should ignore them altogether. Oddly enough, though, it\'s the three-star reviews I find most revealing. Someone who\'s bothered to write a measured account of what was fine and what wasn\'t is rarely being paid to do it, and they tend to tell you exactly what you need to know. So these days, whether I\'m choosing a hotel or a hairdryer, I skip straight past the top and the bottom and read the middle.',
      },
    ],
    prompt: 'Why does the speaker value three-star reviews?',
    options: [
      'They tend to be honest and specific',
      'They are mostly written by experts',
      'They give the most positive picture',
      'They often come with a discount',
    ],
    explanation: 'Their writers are "rarely being paid to do it" and give "a measured account of what was fine and what wasn\'t".',
  },
];
