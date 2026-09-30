import { Pool } from "pg";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import { Client } from "@elastic/elasticsearch";
import { cfg } from "./config";

export const pool = new Pool({ connectionString: cfg.db });
export const redis = () => new IORedis(cfg.redis, { maxRetriesPerRequest: null });
export const queue = new Queue("emails", { connection: redis() });
export const es = new Client({ node: cfg.es });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, name TEXT, avatar TEXT, slack_webhook TEXT);
    CREATE TABLE IF NOT EXISTS senders (id SERIAL PRIMARY KEY, user_addr TEXT, pass TEXT, host TEXT, port INT);
    CREATE TABLE IF NOT EXISTS emails (
      id UUID PRIMARY KEY, user_id TEXT NOT NULL, to_email TEXT NOT NULL, subject TEXT, body TEXT, sender_id INT,
      scheduled_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'scheduled', error TEXT, preview_url TEXT);
    CREATE INDEX IF NOT EXISTS emails_user_status ON emails(user_id, status);`);
}

// Index/update a row in Elasticsearch. Never let search failures break sending.
export async function indexEmail(row: any) {
  try {
    await es.index({ index: "emails", id: row.id, document: { user_id: row.user_id, to_email: row.to_email, subject: row.subject,
      body: row.body, status: row.status, scheduled_at: row.scheduled_at, sent_at: row.sent_at } });
  } catch (e) { console.warn("ES index failed", (e as Error).message); }
}
