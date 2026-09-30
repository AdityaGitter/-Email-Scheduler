import nodemailer from "nodemailer";
import { pool } from "./infra";
import { cfg } from "./config";

// Create SENDER_COUNT Ethereal accounts once; persisted in DB so restarts reuse them.
export async function ensureSenders() {
  const { rows } = await pool.query("SELECT count(*)::int c FROM senders");
  for (let i = rows[0].c; i < cfg.senderCount; i++) {
    const a = await nodemailer.createTestAccount();
    await pool.query("INSERT INTO senders(user_addr,pass,host,port) VALUES($1,$2,$3,$4)", [a.user, a.pass, a.smtp.host, a.smtp.port]);
  }
  return (await pool.query("SELECT id FROM senders ORDER BY id")).rows.map(r => r.id as number);
}

export async function sendMail(senderId: number, to: string, subject: string, text: string) {
  const { rows: [s] } = await pool.query("SELECT * FROM senders WHERE id=$1", [senderId]);
  const t = nodemailer.createTransport({ host: s.host, port: s.port, secure: false, auth: { user: s.user_addr, pass: s.pass } });
  const info = await t.sendMail({ from: s.user_addr, to, subject, text });
  return nodemailer.getTestMessageUrl(info) || null;
}
