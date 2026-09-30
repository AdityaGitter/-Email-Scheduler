import { Menu } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { EmailRow, User } from "./types";
import { Logo, Toast } from "./components/ui";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Inbox from "./components/Inbox";
import Compose from "./components/Compose";
import EmailDetail from "./components/EmailDetail";

type Tab = "scheduled" | "sent";
export default function App() {
  const [user, setUser] = useState<User | null>(null), [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("scheduled"), [view, setView] = useState<"list" | "compose" | "detail">("list"), [open, setOpen] = useState<EmailRow | null>(null);
  const [data, setData] = useState<Record<Tab, EmailRow[]>>({ scheduled: [], sent: [] }), [loading, setLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const say = (msg: string, error = false) => { setToast({ msg, error }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false)); }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try { const [scheduled, sent] = await Promise.all([api.emails("scheduled"), api.emails("sent")]); setData({ scheduled, sent }); }
    catch (e) { say((e as Error).message, true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user) { load(); const t = setInterval(load, 10000); return () => clearInterval(t); } }, [user, load]);

  if (checking) return <p className="p-8 text-sm">Loading…</p>;
  const toastEl = toast && <Toast {...toast} />;
  if (!user) return <><Login onError={m => say(m, true)} />{toastEl}</>;

  return (
    <div className="flex h-screen">
      {navOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setNavOpen(false)} />}
      <Sidebar navOpen={navOpen} user={user} tab={tab} counts={{ scheduled: data.scheduled.length, sent: data.sent.length }}
        onTab={t => { setTab(t); setView("list"); setNavOpen(false); }} onCompose={() => { setView("compose"); setNavOpen(false); }}
        onLogout={async () => { await api.logout(); setUser(null); }}
        onDisconnectSlack={async () => { await api.disconnectSlack(); setUser({ ...user, slack_connected: false }); say("Slack disconnected"); }} />
      <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-12 items-center gap-3 border-b border-slate-100 px-3 md:hidden">
        <button aria-label="Open menu" onClick={() => setNavOpen(true)}><Menu size={22} /></button><Logo />
      </div>
      <main className="flex min-w-0 flex-1 overflow-auto">
        {view === "compose" ? <Compose user={user} onBack={() => setView("list")} onError={m => say(m, true)} onInfo={say}
            onDone={() => { say("Emails scheduled"); setTab("scheduled"); setView("list"); load(); }} />
          : view === "detail" && open ? <EmailDetail row={open} user={user} onBack={() => setView("list")} onInfo={say} />
          : <Inbox tab={tab} rows={data[tab]} loading={loading} onRefresh={load} onOpen={r => { setOpen(r); setView("detail"); }} />}
      </main>
      </div>
      {toastEl}
    </div>);
}
