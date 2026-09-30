import { useState } from "react";
import { Archive, ArrowLeft, ChevronDown, ExternalLink, Star, Trash2 } from "lucide-react";
import type { EmailRow, User } from "../types";
import { Avatar } from "./ui";
import { fullDate } from "../utils";
export default function EmailDetail({ row, user, onBack, onInfo }: { row: EmailRow; user: User; onBack: () => void; onInfo: (m: string) => void }) {
  const [star, setStar] = useState(false);
  return (
    <section className="min-w-0 flex-1 p-4 md:p-5">
      <header className="flex items-center gap-3">
        <button aria-label="Back" onClick={onBack}><ArrowLeft size={20} /></button>
        <h1 className="flex-1 truncate text-lg md:text-xl">{row.subject}</h1>
        <button aria-label="Star" onClick={() => setStar(s => !s)}><Star size={17} className={star ? "fill-yellow-400 text-yellow-400" : "text-slate-400"} /></button>
        <button aria-label="Archive" onClick={() => onInfo("Archiving isn't available yet.")}><Archive size={17} className="text-slate-400" /></button>
        <button aria-label="Delete" onClick={() => onInfo("Deleting isn't available yet.")}><Trash2 size={17} className="text-slate-400" /></button>
        <span className="h-6 w-px bg-slate-200" /><Avatar src={user.avatar} name={user.name} size={30} />
      </header>
      <div className="mx-auto mt-6 flex max-w-3xl gap-3 md:gap-4">
        <Avatar name={user.name} size={36} />
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex flex-col justify-between gap-1 sm:flex-row"><p className="break-all"><b>{user.name}</b> <span className="text-slate-500">&lt;{user.email}&gt;</span></p>
            <span className="text-xs text-slate-500">{fullDate(row.sent_at ?? row.scheduled_at)}</span></div>
          <p className="flex items-center gap-1 text-xs text-slate-500">to {row.to_email} <ChevronDown size={12} /></p>
          <p className="mt-6 whitespace-pre-wrap leading-relaxed">{row.body ?? "Message preview isn't available for this email."}</p>
          <p className="mt-6 text-xs text-slate-500">Status: {row.status}</p>
          {row.preview_url && <a href={row.preview_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand"><ExternalLink size={12} />Open in Ethereal</a>}
        </div>
      </div>
    </section>);
}
