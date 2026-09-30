import { useState } from "react";
import { Logo } from "./ui";
const G = () => (<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.500 42.600 14.600 48 24 48z"/></svg>);
export default function Login({ onError }: { onError: (m: string) => void }) {
  const [email, setEmail] = useState(""), [pw, setPw] = useState("");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[354px] rounded-xl border border-slate-200 p-10">
        <div className="mb-5 flex justify-center"><Logo /></div>
        <h1 className="mb-6 text-center text-3xl font-semibold">Login</h1>
        <a href={`${import.meta.env.VITE_API_URL}/auth/google`} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-mint text-sm hover:brightness-95"><G /> Login with Google</a>
        <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or sign up through email<span className="h-px flex-1 bg-slate-200" /></div>
        <form onSubmit={e => { e.preventDefault(); onError("Email login isn't available yet. Use Login with Google."); }} className="space-y-3">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email ID" aria-label="Email ID" className="h-10 w-full rounded-lg bg-field px-3 text-sm outline-none focus:ring-2 focus:ring-brand/40" />
          <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="Password" aria-label="Password" className="h-10 w-full rounded-lg bg-field px-3 text-sm outline-none focus:ring-2 focus:ring-brand/40" />
          <button className="mt-2 h-10 w-full rounded-lg bg-brand text-sm font-medium text-white hover:bg-[#008f38]">Login</button>
        </form>
      </div>
    </main>);
}
