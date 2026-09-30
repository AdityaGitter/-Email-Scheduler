import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { cfg } from "./config";
import { pool, queue, es, initDb, indexEmail } from "./infra";
import { ensureSenders } from "./mail";

const app = express();
app.use(cors({ origin: cfg.frontend, credentials: true }), express.json({ limit: "5mb" }), cookieParser());

const board = new ExpressAdapter(); board.setBasePath("/admin/queues");
createBullBoard({ queues: [new BullMQAdapter(queue)], serverAdapter: board });
app.use("/admin/queues", board.getRouter());

const google = new OAuth2Client(cfg.google.id, cfg.google.secret, `${cfg.backend}/auth/google/callback`);
const auth = (req: Request & { uid?: string }, res: Response, next: NextFunction) => {
  try { req.uid = (jwt.verify(req.cookies.token, cfg.jwt) as any).uid; next(); } catch { res.status(401).json({ error: "Unauthenticated" }); }
};

// ---------- Google login ----------
app.get("/auth/google", (_q, res) => res.redirect(google.generateAuthUrl({ scope: ["openid", "email", "profile"] })));
app.get("/auth/google/callback", async (req, res) => {
  try {
    const { tokens } = await google.getToken(String(req.query.code));
    const p = (await google.verifyIdToken({ idToken: tokens.id_token!, audience: cfg.google.id })).getPayload()!;
    await pool.query(`INSERT INTO users(id,email,name,avatar) VALUES($1,$2,$3,$4)
      ON CONFLICT(id) DO UPDATE SET email=$2,name=$3,avatar=$4`, [p.sub, p.email, p.name, p.picture]);
    res.cookie("token", jwt.sign({ uid: p.sub }, cfg.jwt, { expiresIn: "7d" }), { httpOnly: true, sameSite: "lax" });
    res.redirect(`${cfg.frontend}/`);
  } catch (e) { res.redirect(`${cfg.frontend}/?error=login_failed`); }
});
app.post("/auth/logout", (_q, res) => { res.clearCookie("token"); res.json({ ok: true }); });
app.get("/api/me", auth, async (req: any, res) => {
  const { rows: [u] } = await pool.query("SELECT id,email,name,avatar,(slack_webhook IS NOT NULL) AS slack_connected FROM users WHERE id=$1", [req.uid]);
  res.json(u);
});

// ---------- Slack OAuth (per-user webhook) ----------
app.get("/auth/slack", auth, (req: any, res) => {
  const state = jwt.sign({ uid: req.uid }, cfg.jwt, { expiresIn: "10m" });
  const q = new URLSearchParams({ client_id: cfg.slack.id, scope: "incoming-webhook", state, redirect_uri: `${cfg.backend}/auth/slack/callback` });
  res.redirect(`https://slack.com/oauth/v2/authorize?${q}`);
});
app.get("/auth/slack/callback", async (req, res) => {
  try {
    const { uid } = jwt.verify(String(req.query.state), cfg.jwt) as any;
    const r = await (await fetch("https://slack.com/api/oauth.v2.access", { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: String(req.query.code), client_id: cfg.slack.id, client_secret: cfg.slack.secret, redirect_uri: `${cfg.backend}/auth/slack/callback` }) })).json() as any;
    if (!r.ok) throw new Error(r.error);
    await pool.query("UPDATE users SET slack_webhook=$2 WHERE id=$1", [uid, r.incoming_webhook.url]);
    res.redirect(`${cfg.frontend}/?slack=connected`);
  } catch { res.redirect(`${cfg.frontend}/?error=slack_failed`); }
});
app.post("/api/slack/disconnect", auth, async (req: any, res) => {
  await pool.query("UPDATE users SET slack_webhook=NULL WHERE id=$1", [req.uid]); res.json({ ok: true });
});

// ---------- Scheduling ----------
const Body = z.object({
  subject: z.string().min(1), body: z.string().min(1), recipients: z.array(z.string().email()).min(1).max(20000),
  startTime: z.string().datetime(), delaySeconds: z.number().min(0).default(0), hourlyLimit: z.number().int().min(1).optional(),
});
app.post("/api/schedule", auth, async (req: any, res) => {
  const p = Body.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const d = p.data, senders = await ensureSenders(), start = new Date(d.startTime).getTime();
  for (let i = 0; i < d.recipients.length; i++) {
    const id = randomUUID(), at = new Date(start + i * d.delaySeconds * 1000), senderId = senders[i % senders.length];
    const { rows: [row] } = await pool.query(
      `INSERT INTO emails(id,user_id,to_email,subject,body,sender_id,scheduled_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, req.uid, d.recipients[i], d.subject, d.body, senderId, at]);
    // jobId = email id => BullMQ refuses duplicate jobs (idempotent enqueue)
    await queue.add("send", { emailId: id, senderId, hourlyLimit: d.hourlyLimit }, { jobId: id, delay: Math.max(0, at.getTime() - Date.now()), removeOnComplete: 1000, removeOnFail: 5000 });
    await indexEmail(row);
  }
  res.json({ scheduled: d.recipients.length });
});

app.get("/api/emails", auth, async (req: any, res) => {
  const sent = req.query.status === "sent";
  const { rows } = await pool.query(
    `SELECT id,to_email,subject,scheduled_at,sent_at,status,preview_url FROM emails WHERE user_id=$1 AND status ${sent ? "IN ('sent','failed')" : "IN ('scheduled','sending')"}
     ORDER BY ${sent ? "sent_at DESC" : "scheduled_at ASC"} LIMIT 500`, [req.uid]);
  res.json(rows);
});

app.get("/api/search", auth, async (req: any, res) => {
  const r = await es.search({ index: "emails", size: 50, query: { bool: {
    filter: [{ term: { user_id: req.uid } }],
    must: [{ multi_match: { query: String(req.query.q || ""), fields: ["to_email", "subject", "body"] } }] } } });
  res.json(r.hits.hits.map(h => ({ id: h._id, ...(h._source as object) })));
});

initDb().then(ensureSenders).then(() => app.listen(cfg.port, () => console.log(`API on :${cfg.port}, Bull board /admin/queues`)));
