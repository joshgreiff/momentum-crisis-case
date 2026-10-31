# Momentum Crisis Command Center

Petitto / Team #6 / 2:15 — BUSMHR 2292 crisis simulation (Oct 30 – Nov 6, 2026).

A Next.js, Supabase and OpenAI tool that turns each crisis update into six executive analyses and one AI-proposed CEO recommendation for the team to review and record a decision on. Nothing is sent or decided automatically.

## Local development

1. `npm install`
2. In the Supabase SQL Editor, run `supabase/schema.sql`, then the files in `supabase/migrations/` in order (`002_…` through `006_…`).
3. Copy `.env.example` to `.env.local` and fill it in. `NEXT_PUBLIC_SUPABASE_URL` must be the bare project URL (`https://<ref>.supabase.co`). Never commit `.env.local`.
4. `npm run dev`, open http://localhost:3000. Without `TEAM_PASSCODE`/`SESSION_SECRET`, the app runs only on `localhost` in dev mode; set both to test the passcode login locally.

## Deploying to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (framework: Next.js, no build settings to change), or run `npx vercel` from this folder.
2. In **Project → Settings → Environment Variables** (Production), set:

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | yes | server-only; mark Sensitive |
   | `OPENAI_API_KEY` | yes | server-only; mark Sensitive |
   | `TEAM_PASSCODE` | yes | shared with the team; 12+ characters |
   | `SESSION_SECRET` | yes | random, 32+ characters (`openssl rand -base64 48`); never shared |
   | `OPENAI_MODEL` | no | default `gpt-4.1-mini` |
   | `MAX_UPDATES_PER_HOUR` / `MAX_UPDATES_PER_DAY` / `MAX_ATTEMPTS_PER_UPDATE` | no | defaults 10 / 40 / 3 |
| `MAX_QUESTIONS_PER_HOUR` | no | default 30 (one model call each) |
   | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | no | only for inbound email |

   If `TEAM_PASSCODE` or `SESSION_SECRET` is missing in production, every page is locked (fail closed).
3. Deploy, open the URL, sign in with the passcode, and submit one **Practice** update to confirm analysis completes.

## Access and safety

- Everyone shares one passcode (no accounts). Signing in sets an 8-day, httpOnly, signed cookie. Changing `TEAM_PASSCODE` or `SESSION_SECRET` signs everyone out.
- All pages and the AI endpoint require the cookie (`middleware.ts`). The only public route is `/api/inbound`, which accepts only Resend-signed webhooks and stores the email without running AI.
- Keys and the passcode are used only on the server and never reach the browser bundle.
- Limits: at most `MAX_UPDATES_PER_HOUR`/`MAX_UPDATES_PER_DAY` new updates, and `MAX_ATTEMPTS_PER_UPDATE` processing attempts per update. Duplicate updates (same subject and text) are not re-analyzed.
- Updates are labeled **Instructor update** or **Practice**. Practice updates are excluded from the history the AI uses for later updates and are not numbered in the timeline.
- **Ask about the case:** any team member can ask a general question (about the case, what an update said, what the team already sent, what to do next, or feedback on a pasted draft). The AI case advisor answers using `knowledge/`, every instructor update, the team's recorded sent messages, the team roster and the last few questions. Answers are saved for everyone and are advisory only. Requires migration `006_case_questions.sql`.
- Recommendations are labeled AI-proposed. Under **Team decision**, the team pastes the email(s) it actually sent or the decision it made. It is stored separately from the AI proposal, can be edited, and is given to the AI as already-sent context for later updates. The app itself never sends anything. Nothing is sent or executed, and draft communications are never sent.

## How analysis works

Submitting stores the update with status `received`. The dashboard then calls `POST /api/events/<id>/process`, which atomically claims the event (`claim_event`, a 10-minute lease, so it never runs twice), extracts facts, runs six executive analyses concurrently, consolidates the CEO recommendation, and only then responds (Vercel `maxDuration` is 300s; a run typically takes 20–40s). Every step is saved to Supabase as it finishes. If the request is interrupted or a step fails, the event is marked failed or its lease expires; opening the dashboard resumes it automatically (up to the attempt limit), and Retry re-runs only the missing steps. No work relies on a function running after its response.

Every agent receives all files in `knowledge/` plus earlier instructor updates and proposed decisions. All model output is validated against the Zod schemas in `lib/schemas.ts`.

## Checks

- `npm run typecheck`, `npm test`, `npm run build`
- `npm run test:live`: one practice update through real OpenAI and Supabase (a few cents).
- `npm run demo:check [-- --submit]`: browser walkthrough in installed Chrome. Against a deployment: `BASE_URL=https://<app>.vercel.app E2E_PASSCODE=… npm run demo:check`.

## Optional: inbound email (Resend)

Verify a domain in Resend, enable inbound receiving, set the `email.received` webhook to `https://<app>.vercel.app/api/inbound`, and set `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET`. Emailed updates are stored as instructor updates and analyzed the next time someone opens the dashboard.

## Limitations

- One shared passcode; no individual accounts, so the app records the team's decision and when, but not who wrote it. The login throttle is per server instance (best effort).
- Attachments are not downloaded. Images inside documents are not read; the convoy diagram is a hand transcription.
- The whole `knowledge/` folder (~15k tokens) is sent with every agent call.
- Check course AI-use rules before processing private team messages.
