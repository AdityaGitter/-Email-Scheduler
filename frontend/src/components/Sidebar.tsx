import { useState } from "react";
import { ChevronDown, Clock, Send } from "lucide-react";
import type { User } from "../types";
import { Avatar, Button, Logo } from "./ui";
type Tab = "scheduled" | "sent";
export default function Sidebar({ user, tab, counts, onTab, onCompose, onLogout, onDisconnectSlack, navOpen }:
  { navOpen: boolean; user: User; tab: Tab; counts: Record<Tab, number>; onTab: (t: Tab) => void; onCompose: () => void; onLogout: () => void; onDisconnectSlack: () => void }) {
  const [open, setOpen] = useState(false);
  const item = (t: Tab, label: string, Icon: typeof Clock) => (
    <button onClick={() => onTab(t)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${tab === t ? "bg-mint font-medium" : "hover:bg-field"}`}>
      <Icon size={16} /><span className="flex-1 text-left">{label}</span><span className="text-xs text-slate-500">{counts[t]}</span></button>);
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[230px] shrink-0 flex-col gap-3 border-r-2 border-brand bg-white p-2.5 transition-transform duration-200 md:static md:z-auto md:w-[330px] md:translate-x-0 ${navOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="px-1 pt-2 pb-1"><Logo /></div>
      <div className="relative">
        <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 rounded-xl bg-field p-2 text-left">
          <Avatar src={user.avatar} name={user.name} size={32} />
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{user.name}</span><span className="block truncate text-[10px] text-slate-500">{user.email}</span></span>
          <ChevronDown size={14} className="text-slate-400" /></button>
        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg">
            {user.slack_connected
              ? <button onClick={() => { setOpen(false); onDisconnectSlack(); }} className="w-full rounded px-3 py-2 text-left hover:bg-field">Disconnect Slack</button>
              : <a href="/auth/slack" className="block rounded px-3 py-2 hover:bg-field">Connect Slack</a>}
            <button onClick={onLogout} className="w-full rounded px-3 py-2 text-left hover:bg-field">Log out</button></div>)}
      </div>
      <Button onClick={onCompose} className="h-9 w-full rounded-full">Compose</Button>
      <p className="px-3 text-[10px] tracking-wide text-slate-400">CORE</p>
      <nav className="space-y-1">{item("scheduled", "Scheduled", Clock)}{item("sent", "Sent", Send)}</nav>
    </aside>);
}
