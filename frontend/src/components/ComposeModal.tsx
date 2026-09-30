import { useState } from "react";
import { Button, Field, Modal } from "./ui";
import { api } from "../api";

const extractEmails = (t: string) => [...new Set(t.match(/[^\s,;"'<>]+@[^\s,;"'<>]+\.[^\s,;"'<>]+/g) ?? [])];
export default function ComposeModal({ onClose, onDone, onError }: { onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const [subject, setSubject] = useState(""), [body, setBody] = useState(""), [recipients, setRecipients] = useState<string[]>([]);
  const [start, setStart] = useState(""), [delay, setDelay] = useState(2), [limit, setLimit] = useState(50), [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!subject || !body || !recipients.length || !start) return onError("Fill subject, body, start time and upload leads.");
    setBusy(true);
    try { await api.schedule({ subject, body, recipients, startTime: new Date(start).toISOString(), delaySeconds: delay, hourlyLimit: limit }); onDone(); }
    catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Compose new email" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Body</span>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Leads (CSV or text file)</span>
          <input type="file" accept=".csv,.txt" onChange={async e => { const f = e.target.files?.[0]; if (f) setRecipients(extractEmails(await f.text())); }} /></label>
        {recipients.length > 0 && <p className="text-sm text-emerald-700">{recipients.length} email addresses detected</p>}
        <Field label="Start time" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Delay between emails (seconds)" type="number" min={0} value={delay} onChange={e => setDelay(+e.target.value)} />
          <Field label="Hourly limit" type="number" min={1} value={limit} onChange={e => setLimit(+e.target.value)} /></div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? "Scheduling…" : "Schedule"}</Button></div>
      </div></Modal>);
}
