import { pool } from "./infra";
// If the user never connected Slack (or webhook is null) this silently no-ops.
export async function notifySlack(userId: string, text: string) {
  try {
    const { rows: [u] } = await pool.query("SELECT slack_webhook FROM users WHERE id=$1", [userId]);
    if (!u?.slack_webhook) return;
    const r = await fetch(u.slack_webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!r.ok) console.warn("Slack webhook failed", r.status);
  } catch (e) { console.warn("Slack notify error", (e as Error).message); }
}
