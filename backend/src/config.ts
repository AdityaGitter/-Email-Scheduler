import "dotenv/config";
const n = (k: string, d: number) => Number(process.env[k] ?? d);
export const cfg = {
  port: n("PORT", 4000), frontend: process.env.FRONTEND_URL!, backend: process.env.BACKEND_URL!,
  jwt: process.env.JWT_SECRET || "dev", redis: process.env.REDIS_URL!, db: process.env.DATABASE_URL!, es: process.env.ELASTIC_URL!,
  google: { id: process.env.GOOGLE_CLIENT_ID!, secret: process.env.GOOGLE_CLIENT_SECRET! },
  slack: { id: process.env.SLACK_CLIENT_ID!, secret: process.env.SLACK_CLIENT_SECRET! },
  concurrency: n("WORKER_CONCURRENCY", 5), minDelayMs: n("MIN_DELAY_MS", 2000),
  maxPerHour: n("MAX_EMAILS_PER_HOUR_PER_SENDER", 50), senderCount: n("SENDER_COUNT", 3),
};
