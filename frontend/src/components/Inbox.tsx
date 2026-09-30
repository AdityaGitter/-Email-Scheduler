import { useEffect, useState } from "react";
import { Clock, Filter, RefreshCw, Search, Star } from "lucide-react";
import type { EmailRow } from "../types";
import { api } from "../api";
import { chipTime, inTab } from "../utils";

function Row({ r, onOpen }: { r: EmailRow; onOpen: () => void }) {
  const [starred, setStarred] = useState(false);
  const sent = r.status === "sent", failed = r.status === "failed";
  return (
    <div onClick={onOpen} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 text-sm hover:bg-field/60">
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-start md:gap-4">
        <span className="flex min-w-0 items-center gap-2 md:contents">
          <span className="truncate font-medium md:w-48 md:shrink-0 md:whitespace-normal md:break-all">To: {r.to_email}</span>
          {sent || failed
            ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${failed ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"}`}>{failed ? "Failed" : "Sent"}</span>
            : <span className="flex shrink-0 items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-xs text-orange-700"><Clock size={11} />{chipTime(r.scheduled_at)}</span>}
        </span>
        <span className="min-w-0 flex-1 break-words line-clamp-2 md:line-clamp-none">
          <b className="font-medium">{r.subject}</b>
          {r.body && <span className="text-slate-400"> - {r.body.replace(/\s+/g, " ")}</span>}
        </span>
      </div>
      <button aria-label="Star" onClick={e => { e.stopPropagation(); setStarred(s => !s); }}>
        <Star size={16} className={starred ? "fill-yellow-400 text-yellow-400" : "text-slate-300"} />
      </button>
    </div>);
}

export default function Inbox({ tab, rows, loading, onRefresh, onOpen }: { tab: "scheduled" | "sent"; rows: EmailRow[]; loading: boolean; onRefresh: () => void; onOpen: (r: EmailRow) => void }) {
  const [q, setQ] = useState(""), [hits, setHits] = useState<EmailRow[] | null>(null);
  useEffect(() => {
    if (!q.trim()) return setHits(null);
    const t = setTimeout(() => api.search(q).then(r => setHits(r.filter(x => inTab(x.status, tab)))).catch(() => setHits([])), 300);
    return () => clearTimeout(t);
  }, [q, tab]);
  const list = hits ?? rows;
  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 p-3">
<label className="flex h-10 w-full max-w-[480px] items-center gap-2 rounded-full bg-field px-4 text-slate-500">          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="w-full bg-transparent text-sm outline-none" /></label>
        <button aria-label="Filter" className="text-slate-500"><Filter size={16} /></button>
        <button aria-label="Refresh" onClick={onRefresh} className="text-slate-500"><RefreshCw size={16} /></button>
      </div>
      {loading && !rows.length ? <p className="p-10 text-center text-sm text-slate-500">Loading emails…</p>
        : !list.length ? <p className="p-10 text-center text-sm text-slate-500">{q ? "No emails match your search." : tab === "sent" ? "No sent emails yet. Sent emails will appear here." : "Nothing scheduled. Choose Compose to schedule emails."}</p>
        : list.map(r => <Row key={r.id} r={r} onOpen={() => onOpen(r)} />)}
    </section>);
}
