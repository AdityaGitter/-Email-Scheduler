import { useRef, useState } from "react";
import { AlignCenter, AlignLeft, Bold, ChevronDown, Clock, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, Paperclip, Quote, Redo2, Strikethrough, Type, Underline, Undo2, Upload, ArrowLeft, ChevronsUpDown } from "lucide-react";
import type { User } from "../types";
import { api } from "../api";
import { Button } from "./ui";
import { extractEmails, fullDate } from "../utils";

const cmds: [typeof Bold, string, string?][] = [[Undo2, "undo"], [Redo2, "redo"], [Type, "fontSize", "4"], [Bold, "bold"], [Italic, "italic"], [Underline, "underline"], [AlignCenter, "justifyCenter"], [ChevronsUpDown, "justifyFull"],
  [ListOrdered, "insertOrderedList"], [List, "insertUnorderedList"], [IndentIncrease, "indent"], [IndentDecrease, "outdent"], [Quote, "formatBlock", "blockquote"], [AlignLeft, "justifyLeft"], [Strikethrough, "strikeThrough"]];
const atTomorrow = (h: number) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); return d; };
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function SendLater({ onCancel, onDone }: { onCancel: () => void; onDone: (d: Date) => void }) {
  const [v, setV] = useState("");
  const opts: [string, Date][] = [["Tomorrow", atTomorrow(9)], ["Tomorrow, 10:00 AM", atTomorrow(10)], ["Tomorrow, 11:00 AM", atTomorrow(11)], ["Tomorrow, 3:00 PM", atTomorrow(15)]];
  return (
    <div className="absolute right-0 top-12 z-20 w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl">
      <p className="mb-3 font-medium">Send Later</p>
      <input type="datetime-local" aria-label="Pick date & time" value={v} onChange={e => setV(e.target.value)} className="mb-2 w-full border-b border-slate-200 py-1 text-xs text-slate-600 outline-none" />
      {opts.map(([l, d]) => <button key={l} onClick={() => setV(toLocalInput(d))} className="block w-full rounded px-1 py-1.5 text-left text-xs hover:bg-field">{l}</button>)}
      <div className="mt-4 flex items-center justify-end gap-3"><button onClick={onCancel} className="text-xs font-medium">Cancel</button>
        <Button className="h-8 rounded-full px-5 text-xs" onClick={() => v && onDone(new Date(v))}>Done</Button></div>
    </div>);
}

export default function Compose({ user, onBack, onDone, onError, onInfo }: { user: User; onBack: () => void; onDone: () => void; onError: (m: string) => void; onInfo: (m: string) => void }) {
  const [to, setTo] = useState<string[]>([]), [draft, setDraft] = useState(""), [expand, setExpand] = useState(false);
  const [subject, setSubject] = useState(""), [delay, setDelay] = useState(""), [limit, setLimit] = useState("");
  const [sendAt, setSendAt] = useState<Date | null>(null), [pop, setPop] = useState(false), [busy, setBusy] = useState(false);
  const editor = useRef<HTMLDivElement>(null), file = useRef<HTMLInputElement>(null);
  const addTo = (list: string[]) => setTo(t => [...new Set([...t, ...list])]);
  const commitDraft = () => { const e = extractEmails(draft); if (e.length) addTo(e); setDraft(""); };
  const shown = expand ? to : to.slice(0, 3);

  const send = async () => {
    const all = draft ? [...new Set([...to, ...extractEmails(draft)])] : to;
    const body = editor.current?.innerText.trim() ?? "";
    if (!all.length || !subject.trim() || !body) return onError("Add at least one recipient, a subject and a message.");
    setBusy(true);
    try {
      await api.schedule({ subject, body, recipients: all, startTime: (sendAt ?? new Date()).toISOString(), delaySeconds: Number(delay) || 0, hourlyLimit: Number(limit) || undefined });
      onDone();
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };
  const num = "h-8 w-16 rounded-md bg-field px-2 text-center text-xs outline-none focus:ring-2 focus:ring-brand/40";
  return (
    <section className="min-w-0 flex-1 p-4 md:p-5">
      <header className="relative flex items-center gap-3">
        <button aria-label="Back" onClick={onBack}><ArrowLeft size={20} /></button>
        <h1 className="flex-1 truncate text-lg md:text-xl">Compose New Email</h1>
        <button aria-label="Attach" onClick={() => onInfo("Attachments aren't supported yet.")} className="text-brand"><Paperclip size={17} /></button>
        <button aria-label="Send later" onClick={() => setPop(p => !p)} className="text-brand"><Clock size={17} /></button>
        <Button className="h-8 rounded-full px-5" onClick={send} disabled={busy}>{busy ? "Scheduling…" : sendAt ? "Send Later" : "Send"}</Button>
        {pop && <SendLater onCancel={() => { setPop(false); setSendAt(null); }} onDone={d => { setSendAt(d); setPop(false); }} />}
      </header>
      {sendAt && <p className="mt-1 text-right text-xs text-slate-500">Scheduled for {fullDate(sendAt.toISOString())}</p>}
      <div className="mx-auto mt-6 max-w-4xl space-y-4 text-sm">
        <div className="flex items-center gap-4"><span className="w-12 text-xs">From</span>
          <span className="flex items-center gap-2 rounded-lg bg-field px-3 py-1.5">{user.email}<ChevronDown size={13} className="text-slate-400" /></span></div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 pb-1"><span className="w-12 text-xs">To</span>
          <div className="flex min-w-0 flex-[1_1_12rem] flex-wrap items-center gap-1.5">
            {shown.map(e => <span key={e} className="rounded-full border border-brand bg-mint px-2 py-0.5 text-xs">{e}</span>)}
            {!expand && to.length > 3 && <button onClick={() => setExpand(true)} className="rounded-full border border-brand bg-mint px-2 py-0.5 text-xs">+{to.length - 3}</button>}
            <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={commitDraft} onKeyDown={e => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), commitDraft())}
              placeholder={to.length ? "" : "recipient@example.com"} className="min-w-32 flex-1 bg-transparent py-1 outline-none" /></div>
          <button onClick={() => file.current?.click()} className="flex items-center gap-1 text-xs text-brand"><Upload size={13} />Upload List</button>
          <input ref={file} type="file" accept=".csv,.txt" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) { const m = extractEmails(await f.text()); m.length ? addTo(m) : onError("No email addresses found in that file."); } e.target.value = ""; }} /></div>
        <div className="flex items-center gap-4 border-b border-slate-200 pb-1"><span className="w-12 text-xs">Subject</span>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="flex-1 bg-transparent py-1 outline-none" /></div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs"><span>Delay between 2 emails</span>
          <input value={delay} onChange={e => setDelay(e.target.value.replace(/\D/g, ""))} placeholder="00" aria-label="Delay in seconds" className={num} />
          <span className="sm:ml-3">Hourly Limit</span><input value={limit} onChange={e => setLimit(e.target.value.replace(/\D/g, ""))} placeholder="00" aria-label="Hourly limit" className={num} /></div>
        <div className="rounded-xl bg-[#fafafa] p-4">
          <div ref={editor} contentEditable suppressContentEditableWarning data-placeholder="Type Your Reply…" className="min-h-6 text-sm outline-none" />
          <div className="mt-3 flex flex-wrap items-center gap-1 rounded-full bg-white p-2 text-slate-600">
            {cmds.map(([Icon, c, arg], i) => <button key={i} aria-label={c} onMouseDown={e => { e.preventDefault(); document.execCommand(c, false, arg); }} className="rounded p-1.5 hover:bg-field"><Icon size={15} /></button>)}</div>
          <div className="min-h-72" onClick={() => editor.current?.focus()} />
        </div>
      </div>
    </section>);
}
