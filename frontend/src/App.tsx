import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { EmailRow, User } from "./types";
import { Button, Toast } from "./components/ui";
import EmailTable from "./components/EmailTable";
import ComposeModal from "./components/ComposeModal";

export default function App() {
  const [user, setUser] = useState<User | null>(null), [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [rows, setRows] = useState<EmailRow[]>([]), [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState(false), [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const say = (msg: string, error = false) => { setToast({ msg, error }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false)); }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api.emails(tab)); } catch (e) { say((e as Error).message, true); } finally { setLoading(false); }
  }, [tab]);
  useEffect(() => { if (user) { load(); const t = setInterval(load, 10000); return () => clearInterval(t); } }, [user, load]);

  if (checking) return <p className="p-8">Loading…</p>;
  if (!user) return (
    <main className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Email Scheduler</h1>
      <a href="/auth/google"><Button>Sign in with Google</Button></a></main>);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={user.avatar} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
          <div><p className="font-medium">{user.name}</p><p className="text-sm text-slate-500">{user.email}</p></div></div>
        <div className="flex gap-2">
          {user.slack_connected
            ? <Button variant="ghost" onClick={async () => { await api.disconnectSlack(); setUser({ ...user, slack_connected: false }); }}>Disconnect Slack</Button>
            : <a href="/auth/slack"><Button variant="ghost">Connect Slack</Button></a>}
          <Button variant="ghost" onClick={async () => { await api.logout(); setUser(null); }}>Log out</Button></div>
      </header>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
          {(["scheduled", "sent"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-1.5 text-sm ${tab === t ? "bg-white shadow" : ""}`}>{t === "scheduled" ? "Scheduled emails" : "Sent emails"}</button>))}</div>
        <Button onClick={() => setCompose(true)}>Compose new email</Button></div>
      <EmailTable rows={rows} loading={loading && !rows.length} mode={tab} />
      {compose && <ComposeModal onClose={() => setCompose(false)} onError={m => say(m, true)} onDone={() => { setCompose(false); say("Emails scheduled"); load(); }} />}
      {toast && <Toast {...toast} />}
    </div>);
}
