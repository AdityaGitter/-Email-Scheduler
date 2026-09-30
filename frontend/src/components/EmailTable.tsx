import type { EmailRow } from "../types";
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");
export default function EmailTable({ rows, loading, mode }: { rows: EmailRow[]; loading: boolean; mode: "scheduled" | "sent" }) {
  if (loading) return <p className="p-8 text-center text-slate-500">Loading emails…</p>;
  if (!rows.length) return <p className="p-8 text-center text-slate-500">{mode === "sent" ? "No emails sent yet. Sent emails appear here." : "Nothing scheduled. Use Compose new email to add some."}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-slate-600"><tr><th className="p-3">Email</th><th className="p-3">Subject</th><th className="p-3">{mode === "sent" ? "Sent time" : "Scheduled time"}</th><th className="p-3">Status</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id} className="border-b last:border-0">
            <td className="p-3">{r.to_email}</td><td className="p-3">{r.subject}</td>
            <td className="p-3">{fmt(mode === "sent" ? r.sent_at : r.scheduled_at)}</td>
            <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "failed" ? "bg-red-100 text-red-700" : r.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {r.preview_url ? <a href={r.preview_url} target="_blank" rel="noreferrer">{r.status}</a> : r.status}</span></td>
          </tr>))}</tbody>
      </table></div>);
}
