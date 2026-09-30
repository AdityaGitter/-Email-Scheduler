import { Worker, DelayedError, Job } from "bullmq";
import { redis, pool, indexEmail, initDb } from "./infra";
import { sendMail } from "./mail";
import { notifySlack } from "./slack";
import { cfg } from "./config";

const conn = redis();
const HOUR = 3600_000;

// Atomic, multi-worker-safe counter per (sender, hour window).
async function tryConsume(senderId: number, limit: number) {
  const win = Math.floor(Date.now() / HOUR);
  const key = `rl:${senderId}:${win}`;
  const n = await conn.incr(key);
  if (n === 1) await conn.expire(key, 2 * 3600);
  return { ok: n <= limit, n, win, key };
}

async function processor(job: Job, token?: string) {
  const { emailId, senderId, hourlyLimit } = job.data;
  const limit = hourlyLimit || cfg.maxPerHour;

  // Idempotency guard: skip if already handled.
  const cur = await pool.query("SELECT status FROM emails WHERE id=$1", [emailId]);
  if (!cur.rows[0] || cur.rows[0].status !== "scheduled") return;

  const rl = await tryConsume(senderId, limit);
  if (!rl.ok) {
    await conn.decr(rl.key); // give the slot back; job is not consumed
    // First hit in this window -> one Slack alert (SET NX dedupes across workers)
    if (await conn.set(`rl:alert:${senderId}:${rl.win}`, "1", "EX", 7200, "NX")) {
      const { rows: [e] } = await pool.query("SELECT user_id FROM emails WHERE id=$1", [emailId]);
      await notifySlack(e.user_id, `:warning: Sender #${senderId} hit its hourly limit (${limit}/h). Remaining emails are rescheduled to the next hour window.`);
    }
    // Reschedule into next window; tiny per-job offset keeps roughly FIFO order.
    await job.moveToDelayed((rl.win + 1) * HOUR + (Date.now() % 1000), token);
    throw new DelayedError();
  }

  // Atomic claim: only one worker can flip scheduled -> sending.
  const claim = await pool.query("UPDATE emails SET status='sending' WHERE id=$1 AND status='scheduled' RETURNING *", [emailId]);
  if (!claim.rowCount) return;
  const row = claim.rows[0];
  try {
    const url = await sendMail(senderId, row.to_email, row.subject, row.body);
    const u = await pool.query("UPDATE emails SET status='sent', sent_at=now(), preview_url=$2 WHERE id=$1 RETURNING *", [emailId, url]);
    await indexEmail(u.rows[0]);
  } catch (err) {
    const u = await pool.query("UPDATE emails SET status='failed', sent_at=now(), error=$2 WHERE id=$1 RETURNING *", [emailId, String(err)]);
    await indexEmail(u.rows[0]);
  }
}

initDb().then(() => {
  new Worker("emails", processor, {
    connection: conn, concurrency: cfg.concurrency,
    limiter: { max: 1, duration: cfg.minDelayMs }, // min delay between sends (global across workers)
  });
  console.log(`Worker up: concurrency=${cfg.concurrency}, minDelay=${cfg.minDelayMs}ms, perSender=${cfg.maxPerHour}/h`);
});
