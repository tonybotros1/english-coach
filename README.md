# Tony's English Coach

An English learning app: an adaptive placement test that gives your CEFR level (A1 to C2), a personal 12-week plan that targets your weakest skills, daily lessons and review cards, pronunciation scoring, checkpoint tests, a progress screen, and a morning reminder on the phone with the day's tasks.

| Folder | What it is |
| --- | --- |
| `mobile/` | The phone app, built with Expo (React Native) for iPhone and Android. |
| `server/` | The server, built with Next.js and deployed to Vercel. It holds every secret, talks to MongoDB, Gemini and Azure Speech, and later also serves the web app. It runs at https://english-coach-azure-alpha.vercel.app. |

## Build phases

1. **Foundations (done):** server, database, sign-in, the app's five tabs, and the voice check that proves recording and scoring work on both phones.
2. **Placement test and results (done):** a 30-minute adaptive test in six parts with a CEFR level for each skill, exam equivalents, and every mistake explained.
3. **Plan, Today and review cards (done):** a 12-week plan from your results, today's tasks on the Today screen, and FSRS review cards made from your mistakes.
4. **Daily lessons (done):** Gemini writes a lesson for each task in your plan, for all six skills, saved once and checked before use.
5. **Reminders, progress and checkpoints (done):** a morning reminder scheduled on the phone, the progress screen, weekly reviews and checkpoint tests that update the plan.
6. Web app on the same server.

## Run it on your computer

You need Node.js 22 and the Expo Go app on your phone. The phone and the computer must be on the same Wi-Fi.

**1. Start a practice database.** It runs locally, and everything in it is deleted when you stop it.

```bash
cd server
npm install
npm run dev:db
```

**2. Start the server** in a second terminal. `server/.env.local` already points at the practice database.

```bash
cd server
npm run dev -- --port 3100
```

Open http://localhost:3100/api/health to check it.

**3. Start the phone app** in a third terminal, then scan the QR code with the Camera app (iPhone) or Expo Go (Android).

```bash
cd mobile
npm install
npx expo start
```

The app finds the server on your computer by itself, unless `mobile/.env.local` points it at Vercel (see below). Delete that file to work against your computer again. If your computer's firewall asks, allow Node.js on private networks.

**Android emulator.** Start an emulator from Android Studio (for example Pixel 10 Pro), then forward the two ports so the emulator reaches your computer without going through the firewall, and open the app:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3100 tcp:3100
npx expo start --android
```

Expo Go installs itself on the emulator the first time. If the app ever shows old code, press `r` in the Expo terminal to reload.

## The placement test

- **Six parts:** grammar, vocabulary, reading, listening, writing and speaking.
- **Adaptive:** the four multiple-choice parts work like the Oxford Placement Test. Each starts at B1, moves up a level after a pass and down after a fail, and stops at the highest level passed.
- **Question bank:** 270 questions on the server, CEFR-tagged, in `server/src/lib/placement/bank/`. Every question was checked by a second reviewer. Retakes get questions you haven't seen, and the answers never reach the phone.
- **Writing and speaking:** Gemini grades both against the CEFR descriptors. Azure scores pronunciation and fluency of the spoken answers. Without those keys, the level is estimated from the other skills and the results page says so.
- **Pausing:** every answer is saved, so a test can be continued on any device for 7 days.

`npm test` in `server` checks the bank's format, lengths and balance, the staircase logic, and a full test run against a practice database.

## The plan and review cards

- **Setup:** four choices, which are goal, target level, minutes a day and days a week. The estimate uses Cambridge English's guideline of about 200 guided study hours per CEFR level.
- **Balance:** half of the lesson time follows your results, so the weakest skills get the most. The other half keeps Paul Nation's four strands equal (language study, input, output, fluency), so no strand is squeezed out.
- **Rhythm:** every study day starts with review cards. The last study day of each week is a review day, and weeks 4, 8 and 12 end with a checkpoint test.
- **Review cards:** every placement mistake and writing correction becomes a card. Cards are scheduled with FSRS, the open-source algorithm Anki uses, aiming for 90% recall. You recall the answer, reveal it, then rate Again, Hard, Good or Easy. New cards arrive a few a day, with skills mixed, and forgotten cards come back in the same session.

## Daily lessons

Each lesson task in the plan opens a lesson written by Gemini for your level, goal and that day's topic. The lesson is saved the first time, so opening it again is instant and costs nothing. Before saving, the server checks it: one gap per practice sentence, four different options, reading and listening lengths for the level, and dictation sentences that appear word for word in the recording. If a check fails, Gemini gets one retry with the problems listed.

| Skill | What you do |
| --- | --- |
| Grammar | Short explanation and examples, then 8 practice questions with feedback straight away |
| Vocabulary | 6 to 8 new words with meaning, example and collocation, then 8 practice questions |
| Reading | A text at your level with a glossary, then 5 questions |
| Listening | A recording with two voices and 3 questions, then dictation of 3 sentences, checked word by word |
| Writing | A task with useful phrases; AI feedback, corrections and a stronger version of your text |
| Speaking | Shadowing 5 sentences scored for pronunciation, then a free answer with AI feedback |

Mistakes, new words, dictation errors and weak pronunciation all become review cards. Finishing a lesson ticks it off on Today.

Lessons need `GEMINI_API_KEY`. Speaking also needs `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`. Without them, the app explains which setting is missing.

## Reminders, progress and checkpoints

- **Morning reminder:** the phone schedules the next 7 mornings itself, with each day's plan in the text (for example "Today: 30 minutes of English · 11 review cards, then Grammar"). No push server is needed, it works with the app closed, and it is rescheduled each time the app opens. Turn it on or off and pick 6, 7, 8 or 9 o'clock on the Progress tab. Android may deliver it up to an hour after the chosen time to save battery.
- **Weekly review:** the last study day of each week. First the review cards, then a 10-question quiz from that week's lessons, mixing questions you missed with ones you got right. Missed questions become review cards.
- **Checkpoint tests:** weeks 4, 8 and 12 end with a 15-minute test: the four multiple-choice parts start at your current level, and there is one speaking question. The results update your levels, and the rest of the plan is rebuilt from them. Weeks already done stay as they were.
- **Progress screen:** days in a row, minutes per week against the plan's target, each skill's level from the placement test to the latest test, review card counts (learned, still learning, new), recall over the last 30 days, and lessons done.

Minutes come from finished lessons, reviews and tests. Review time counts the gaps between cards, capped at 90 seconds each, so leaving the app open does not inflate it.

Notifications need a development build to be fully tested. Expo Go on Android can't create the app's own notification channel, so reminders there use the default channel, and tapping one doesn't open the app.

## Design

Clean and neutral: grey is the main colour (backgrounds, cards, secondary buttons) and black is the accent (text, primary buttons, selection). Dark mode inverts it. All colours, spacing and radii live in `mobile/src/constants/theme.ts`, and the shared building blocks (screen, card, button, list row, notice, pill) are in `mobile/src/components/ui.tsx`.

## Connect the real services

Put keys only in `server/.env.local` on your computer and in Vercel's Environment Variables. Never paste them into chats or commit them. `server/.env.example` lists every setting.

**MongoDB Atlas**
1. Change the password of the database user that was shared in chat (Atlas, then Database Access).
2. Create a new database user, for example `english_coach_app`, with the built-in role **readWrite** on the database `english_coach` only.
3. Set `MONGODB_URI` to that user's connection string and `MONGODB_DB=english_coach`. The app creates its collections and indexes on first use.
4. Under Network Access, allow `0.0.0.0/0`, because Vercel's servers do not have fixed addresses. The dedicated user and a strong password protect the data.

**Sign-in secret.** Generate `AUTH_SECRET` once and keep it the same everywhere:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**Azure Speech, free tier**
1. In the Azure portal, create a **Speech** resource and choose the **Free F0** pricing tier.
2. From Keys and Endpoint, copy Key 1 into `AZURE_SPEECH_KEY` and the region, for example `uaenorth`, into `AZURE_SPEECH_REGION`.
3. If the page shows only an endpoint like `https://NAME.cognitiveservices.azure.com`, put that in `AZURE_SPEECH_ENDPOINT` instead.

The free tier gives 5 audio hours a month. It stops at the limit and never charges.

**Gemini.** Create a free key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY`. It grades the writing and speaking parts. `GEMINI_MODEL` and `GEMINI_FALLBACK_MODEL` default to the newest Flash and Flash-Lite models, and the lighter one is used when the free quota runs out.

## Accounts and passwords

Learners create an account with their email and a password of at least 8 characters. No email is ever sent.

- Passwords are stored only as scrypt hashes with a random salt.
- After 10 wrong passwords in a row, the account is locked for 15 minutes.
- A wrong password and an unknown email get the same message, so nobody can find out who has an account.
- Learners change their password under Progress, then Account, then Change password.

**Forgotten passwords.** There is no email reset, so you give the learner a new temporary password yourself. In the `server` folder, put the production `MONGODB_URI` in `.env.production.local` (git ignores it), then run:

```bash
node scripts/reset-password.mjs learner@example.com --env .env.production.local
```

It prints the new password once. Send it to the learner privately, and they change it in the app.

The emailed-code sign-in (`/api/auth/request-code`) is still there for local development. It works in production only if `RESEND_API_KEY` is set.

## Deploy the server to Vercel

The server is deployed from GitHub: every push to `main` deploys by itself.

1. In Vercel, import the GitHub repository and set **Root Directory** to `server`.
2. Under Environment Variables, add `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET`, `GEMINI_API_KEY`, `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`. Paste a whole `.env` file into the Key field to add them all at once. Use a new `AUTH_SECRET` for production.
3. Deploy, then open `/api/health`. `db` should show `up` and `speech`, `ai` and `auth` should show `true`.
4. Create `mobile/.env.local` with `EXPO_PUBLIC_API_URL=https://english-coach-azure-alpha.vercel.app` and restart with `npx expo start --clear`.

`server/vercel.json` runs the functions in Mumbai (`bom1`), the closest Vercel region to the Atlas cluster in Abu Dhabi and Azure Speech in UAE North. The free Hobby plan allows one region and up to 300 seconds per request; writing a lesson takes up to 120.

## Checks

```bash
cd server && npm test && npm run typecheck
cd mobile && npx tsc --noEmit && npx expo lint
```
