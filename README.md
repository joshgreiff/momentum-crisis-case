# Momentum Crisis Command Center (starter)

A minimal Next.js, Supabase, Resend inbound email and OpenAI executive-analysis system for the fictional BUSMHR 2292 Momentum simulation.

## Setup

1. `npm install`
2. Create a Supabase project and run `supabase/schema.sql`, then `supabase/migrations/002_crisis_workflow.sql`, in SQL Editor.
3. Copy `.env.example` to `.env.local` and fill in the keys. `NEXT_PUBLIC_SUPABASE_URL` must be the bare project URL (`https://<ref>.supabase.co`). Never commit `.env.local`.
4. `npm run dev` and open http://localhost:3000. Use the "Submit a crisis update" form to paste a fictional update and click **Analyze Crisis**. The form and Retry buttons only work under `npm run dev` on `localhost`/`127.0.0.1`, because there is no authentication yet.

## How analysis works

Manual and email updates share one pipeline (`lib/agents.ts`): the update is stored, atomically claimed (`claim_event`, so it is never processed twice), facts are extracted, six executives (CEO, Globex President, COO, CFO, CMO, CHRO) analyze it concurrently, and the CEO consolidates one proposed decision. Every agent receives all files in `knowledge/` (case, lecture transcripts, convoy diagram text) plus earlier updates and proposed decisions. All model output is validated against Zod schemas in `lib/schemas.ts`. Failures are recorded on the event; Retry re-runs only the steps that did not complete.

## Checks

- `npm run typecheck`, `npm test` (unit tests with an in-memory store and fake model), `npm run build`
- `npm run test:live` runs one labeled `[TEST]` update through real OpenAI and Supabase (costs a few cents and writes to the database).
5. Deploy to Vercel, configure the same environment variables, and protect access before sharing.
6. In Resend, verify a domain you own, configure inbound email receiving for `crisis@your-domain.example`, and set the `email.received` webhook URL to `https://YOUR_APP.vercel.app/api/inbound`. Copy the webhook signing secret to `RESEND_WEBHOOK_SECRET`.
7. Forward one **test** message to the dedicated address and verify that the dashboard shows the event, six analyses, and a proposed decision.

## Important limitations before production use

- **Authentication is not implemented.** Dashboard exposes case content to anyone who knows the deployment URL. Add Supabase Auth / access controls or Vercel deployment protection before use.
- The decisions API intentionally rejects changes until authentication is implemented. The dashboard is review-only. Do not claim approvals are recorded.
- Email analysis runs after the webhook responds (`after()`), within the function's time limit. Move it to Inngest, QStash, or a durable queue before relying on continuous monitoring.
- Failed or stalled events can be retried manually from the local dashboard; there is no automatic retry worker yet.
- Attachments are not downloaded; add PDF/DOCX attachment ingestion separately.
- Resend webhook events provide an email ID; this app fetches the body via the Receiving API. Verify compatibility with the Resend SDK version you install.
- The whole `knowledge/` folder (about 15k tokens) is sent to every agent call. Images inside documents are not read; `Convoy of trucks diagram-1 (image transcription).md` is a hand transcription of the diagram. Add retrieval if the library grows substantially.
- Consider instructor/course AI-use rules and obtain permission before processing team or private messages.
- No automatic external sending. All output is draft analysis.

## Next milestones

1. Add Supabase Auth and team roles.
2. Add durable queue, retries, processing logs and rate limiting.
3. Ingest the case, operations diagram and transcripts into a searchable source library with document citations.
4. Add authenticated approval/rejection and a decision audit trail.
5. Add a board briefing export and Slack/email notifications.
# momentum-crisis-case
