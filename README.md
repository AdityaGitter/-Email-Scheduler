# Email Job Scheduler (BullMQ + Redis + Postgres + Elasticsearch)

## Run
```bash
docker compose up -d                       # Redis, Postgres, Elasticsearch
cd backend && cp .env.example .env         # fill Google/Slack creds
npm i && npm run dev:server                # terminal 1 (API + Bull Board)
npm run dev:worker                         # terminal 2 (BullMQ worker)
cd ../frontend && npm i && npm run dev     # http://localhost:5173
```
- Google OAuth: create a Web client; redirect URI `http://localhost:4000/auth/google/callback`.
- Slack: create an app, enable OAuth with scope `incoming-webhook`, redirect `http://localhost:4000/auth/slack/callback` (Slack may require https — use ngrok and set BACKEND_URL).
- Ethereal: no setup. `SENDER_COUNT` accounts are auto-created on first boot and stored in the DB. Open the status link in the Sent tab to view each message.
- Live queue dashboard: http://localhost:4000/admin/queues. Search: `GET /api/search?q=term`.

## Architecture
- **Scheduling**: `POST /api/schedule` inserts one row per recipient in Postgres (`scheduled_at = start + i*delay`) and adds a BullMQ **delayed job** (`jobId = email id`). No cron anywhere.
- **Persistence**: jobs live in Redis (AOF on), state in Postgres. After a restart the worker resumes and delayed jobs fire at the original time.
- **Idempotency**: deterministic `jobId` (no duplicate enqueue) + worker skips rows whose status is not `scheduled` + atomic `UPDATE ... WHERE status='scheduled'` claim so only one worker sends. Trade-off: a crash between claim and send leaves a row as `sending` (at-most-once over at-least-once).
- **Concurrency**: `WORKER_CONCURRENCY` (default 5).
- **Min delay between sends**: BullMQ limiter `max 1 / MIN_DELAY_MS` (default **2000 ms**), shared across all workers via Redis.
- **Hourly limit**: Redis `INCR rl:{sender}:{hourWindow}` (atomic across instances), limit = per-request `hourlyLimit` or `MAX_EMAILS_PER_HOUR_PER_SENDER`. Over the limit: slot is released and the job is **moved to delayed for the next hour window** (never dropped/failed).
- **Slack alert**: first limit hit per sender per hour posts to the user's OAuth-connected webhook (deduped with Redis `SET NX`). No Slack connected = no-op.
- **1000+ emails at once**: all are queued; limiter throttles to ~1 send/2s, excess over hourly limits rolls into later windows.

## Known shortcuts
- Frontend styled with a plain Tailwind layout; **not matched to your Figma** (link was blank in the brief).
- Rate-limit counters are shared between requests on the same sender; overflow ordering is approximate.
- No automated tests; senders are assigned round-robin.
