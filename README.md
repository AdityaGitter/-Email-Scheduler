# Email Job Scheduler

An email scheduling service and dashboard, built for the ReachInbox.ai Software Development Intern assignment.

The API accepts send requests, stores them in PostgreSQL, and schedules them as BullMQ delayed jobs backed by Redis. A worker sends the emails through Ethereal SMTP. Sent and scheduled emails are indexed in Elasticsearch for search. The React dashboard is used to schedule, view and search emails.

- Frontend: https://email-scheduler-tawny-six.vercel.app
- API: https://email-scheduler-api-c763.onrender.com
- Bull Board: https://email-scheduler-api-c763.onrender.com/admin/queues
- Repository: https://github.com/AdityaGitter/-Email-Scheduler

The API is hosted on Render's free tier, which sleeps after about 15 minutes without traffic. The first request after that can take up to a minute. The worker runs inside the same service (see Deployment), so scheduled emails are only sent while the service is awake. Jobs are never lost while it sleeps, because they are stored in Redis.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, TypeScript, Express
- Queue: BullMQ on Redis
- Database: PostgreSQL
- Search: Elasticsearch
- Email: Nodemailer with Ethereal SMTP
- Auth: Google OAuth, JWT in an HTTP-only cookie
- Notifications: Slack OAuth with incoming webhooks

## How it works

### Scheduling

`POST /api/schedule` validates the request and, for each recipient:

1. Picks a sender account (round-robin across the Ethereal accounts).
2. Inserts a row in the `emails` table with status `scheduled`.
3. Adds a BullMQ delayed job. The delay is the time until the email's scheduled time.
4. Indexes the email in Elasticsearch.

The scheduled time of recipient `i` is `startTime + i * delaySeconds`. There are no cron jobs anywhere. Timing is handled only by BullMQ delayed jobs.

### Persistence across restarts

Jobs live in Redis and email state lives in PostgreSQL. If the API or the worker restarts, the delayed jobs are still in Redis and fire at their original time. Nothing is rescheduled or restarted from scratch.

### Idempotency

- The BullMQ `jobId` is the email's UUID, so the same email cannot be queued twice.
- Before sending, the worker checks the email's status and skips anything that is not `scheduled`.
- The worker claims an email with an atomic update, so only one worker can send it:

```sql
UPDATE emails SET status = 'sending'
WHERE id = $1 AND status = 'scheduled'
RETURNING *;
```

After the send, the status becomes `sent` or `failed`.

### Concurrency and minimum delay

- Worker concurrency is set with `WORKER_CONCURRENCY` (default 5).
- The minimum delay between sends uses BullMQ's limiter: at most 1 job per `MIN_DELAY_MS`. The default is **2000 ms (2 seconds between sends)**. The limiter is shared by all workers on the queue, not per process.

### Hourly rate limit

The limit is per sender and is enforced with Redis:

- Each send first runs `INCR` on the key `rl:{senderId}:{hourWindow}`. The increment is atomic, so it is safe with several workers or instances.
- If the count is within the limit, the email is sent.
- If it is over the limit, the worker decrements the counter again and moves the job to the start of the next hour window with `moveToDelayed`. The job is not dropped and does not fail.
- The limit is `MAX_EMAILS_PER_HOUR_PER_SENDER` by default. A request can override it with `hourlyLimit`.

Moved jobs keep their relative order only approximately, because they are all rescheduled to the same hour boundary.

### Slack notification on rate limit

When a sender first hits its limit in an hour window, the worker posts a message to the Slack webhook of the user who owns the email. A Redis key set with `NX` makes sure only one alert goes out per sender per hour, even with several workers. If the user has not connected Slack, nothing is sent and nothing fails. Connecting Slack later works without a redeploy, because the webhook is read from the database each time.

### Behavior under load

If 1000 or more emails are scheduled for the same time, all of them are stored and queued immediately. The limiter then lets one send through every 2 seconds, and each sender stops at its hourly limit. With the default settings (3 senders, 50 per hour each) that is at most 150 emails per hour, and the rest roll into the following hours until the queue is empty.

## Features

Backend:

- Scheduling through BullMQ delayed jobs, no cron
- Persistence across API and worker restarts
- Configurable worker concurrency
- Minimum delay between sends
- Per-sender hourly rate limit in Redis, with rescheduling to the next hour
- Slack alert when a limit is hit
- Idempotent jobs and atomic status updates
- Multiple Ethereal sender accounts
- Elasticsearch indexing and search
- Bull Board queue dashboard
- Google OAuth login and Slack OAuth connect/disconnect

Frontend:

- Google login, with the user's name, email and avatar in the sidebar and a logout option
- Scheduled and Sent views with loading and empty states
- Compose page: recipients (typed or uploaded from a CSV/text file, with the number of addresses detected), subject, body editor, delay between emails, hourly limit, and Send Later with date and time
- Search backed by Elasticsearch
- Responsive layout, with the sidebar turning into a menu on small screens

## Running locally

Requirements: Node.js 20+, npm, Docker.

```bash
git clone https://github.com/AdityaGitter/-Email-Scheduler.git
cd -Email-Scheduler

# PostgreSQL, Redis and Elasticsearch
docker compose up -d
```

Backend (two terminals):

```bash
cd backend
cp .env.example .env     # then fill in the values
npm install
npm run dev:server       # API on http://localhost:4000
npm run dev:worker       # worker, in a second terminal
```

The worker prints `Worker up: concurrency=5, minDelay=2000ms, perSender=50/h` when it starts.

Frontend:

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

The Vite dev server proxies `/api` and `/auth` to `localhost:4000`.

Docker Compose ports: PostgreSQL 5432, Redis 6379, Elasticsearch 9201.

## Environment variables

Set these in `backend/.env`. `backend/.env.example` has the full list.

```env
PORT=4000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
JWT_SECRET=

DATABASE_URL=postgres://app:app@localhost:5432/scheduler
REDIS_URL=redis://localhost:6379
ELASTIC_URL=http://localhost:9201

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

WORKER_CONCURRENCY=5
MIN_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=50
SENDER_COUNT=3
```

### Ethereal

No manual setup is needed. On first start the API creates `SENDER_COUNT` Ethereal accounts with Nodemailer and stores them in the `senders` table, so they are reused after restarts. Ethereal does not deliver real mail. Each sent email has a preview link in the Sent view (stored as `preview_url`).

### Google login

Create an OAuth client (Web application) in Google Cloud and add this redirect URI:

```text
{BACKEND_URL}/auth/google/callback
```

If the consent screen is in testing mode, add your account as a test user.

### Slack

Create a Slack app, add the `incoming-webhook` scope, and set this redirect URL:

```text
{BACKEND_URL}/auth/slack/callback
```

Slack usually requires an https redirect URL, so use a tunnel such as ngrok if you test this locally.

## Deployment

- **Frontend (Vercel):** Root Directory is `frontend`. `frontend/vercel.json` rewrites `/api/*` and `/auth/*` to the Render API, so the browser only talks to the Vercel domain and the login cookie stays on it.
- **API and worker (Render):** Build command `npm install && npm run build`, start command `node dist/server.js & node dist/worker.js`. Render's free plan has no background worker, so both processes run in one web service. `BACKEND_URL` is set to the Vercel URL, and the Google and Slack redirect URIs use that same URL.
- **PostgreSQL:** Neon
- **Redis:** Upstash
- **Elasticsearch:** Elastic Cloud

Environment variables are set in each service's dashboard and are never committed.

## API

```text
GET  /auth/google
GET  /auth/google/callback
POST /auth/logout
GET  /api/me

POST /api/schedule
GET  /api/emails?status=scheduled|sent
GET  /api/search?q=

GET  /auth/slack
GET  /auth/slack/callback
POST /api/slack/disconnect

GET  /admin/queues
```

Example schedule request:

```json
{
  "subject": "Test email",
  "body": "Hello from the scheduler",
  "recipients": ["recipient@example.com"],
  "startTime": "2026-10-01T12:00:00.000Z",
  "delaySeconds": 2,
  "hourlyLimit": 50
}
```

## Testing

Tested manually on a local setup: Google login, scheduling, delayed jobs, sender rotation, the minimum delay, the hourly limit with a low value (rescheduling and Slack alert), search, Bull Board, and API and worker restarts. There are no automated tests.

## Assumptions and trade-offs

- **Delivery guarantee:** a job is claimed in the database before sending. If the process crashes after the claim, the email stays in `sending` and is not retried, so delivery is at-most-once. If SMTP accepts a message but the database update then fails, exactly-once cannot be guaranteed.
- **Ordering:** emails pushed to the next hour keep their order only approximately.
- **Rate limit scope:** the counter is per sender, so it is shared by all requests using that sender.
- **Plain text:** the editor shows formatting, but the body is sent as plain text.
- **Not implemented:** attachments, archive and delete, and email and password login. The login form in the UI is there for the design, and only Google login works.
- **Free tier hosting:** the API sleeps when idle, and the worker sleeps with it.
- **Search:** if Elasticsearch is unreachable, indexing errors are logged and sending continues.

## Author

Aditya Pratap Singh
