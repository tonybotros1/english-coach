# Tony's English Coach

An English learning app: an adaptive placement test that gives your CEFR level (A1 to C2), a personal 12-week plan that targets your weakest skills, daily lessons and review cards, pronunciation scoring, and a morning email with the day's tasks.

| Folder | What it is |
| --- | --- |
| `mobile/` | The phone app, built with Expo (React Native) for iPhone and Android. |
| `server/` | The server, built with Next.js and deployed to Vercel. It holds every secret, talks to MongoDB, Gemini, Azure Speech and Resend, and later also serves the web app. |

## Build phases

1. **Foundations (done):** server, database, sign-in with an emailed code, the app's five tabs, and the voice check that proves recording and scoring work on both phones.
2. Placement test and results.
3. Plan builder, Today screen and review cards.
4. Daily activities for all six skills.
5. Morning email, progress screen and checkpoint tests.
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

Open http://localhost:3100/api/health to check it. Without Resend, sign-in codes are printed in this terminal and filled in on the phone for you.

**3. Start the phone app** in a third terminal, then scan the QR code with the Camera app (iPhone) or Expo Go (Android).

```bash
cd mobile
npm install
npx expo start
```

The app finds the server on your computer by itself. If your computer's firewall asks, allow Node.js on private networks.

**Android emulator.** Start an emulator from Android Studio (for example Pixel 10 Pro), then forward the two ports so the emulator reaches your computer without going through the firewall, and open the app:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3100 tcp:3100
npx expo start --android
```

Expo Go installs itself on the emulator the first time. If the app ever shows old code, press `r` in the Expo terminal to reload.

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

**Resend.** Create an API key and set `RESEND_API_KEY`. Until you verify a domain, Resend only delivers to the address you signed up with. That is enough while you are the only user.

**Gemini.** Create a free key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY`. It is used from Phase 2.

## Deploy the server to Vercel

1. Push this repository to GitHub.
2. In Vercel, create a new project from it and set **Root Directory** to `server`.
3. Add every setting from `server/.env.example` under Environment Variables.
4. Deploy, then open `https://YOUR-PROJECT.vercel.app/api/health`. Every service you configured should show `true`, and `db` should show `up`.
5. Create `mobile/.env` with `EXPO_PUBLIC_API_URL=https://YOUR-PROJECT.vercel.app` and restart `npx expo start`.

## Checks

```bash
cd server && npm test && npm run typecheck
cd mobile && npx tsc --noEmit && npx expo lint
```
