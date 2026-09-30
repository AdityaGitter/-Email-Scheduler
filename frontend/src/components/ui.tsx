import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
export const Button = ({ variant = "primary", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) => (
  <button {...p} className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline-2 ${variant === "primary" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-slate-300 hover:bg-slate-100"} ${p.className ?? ""}`} />);
export const Field = ({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="block text-sm"><span className="mb-1 block text-slate-600">{label}</span><input {...p} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></label>);
export const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="max-h-full w-full max-w-lg overflow-auto rounded-xl bg-white p-6" onClick={e => e.stopPropagation()}>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</div></div>);
export const Toast = ({ msg, error }: { msg: string; error?: boolean }) => (
  <div className={`fixed bottom-4 right-4 rounded-lg px-4 py-2 text-sm text-white ${error ? "bg-red-600" : "bg-slate-800"}`}>{msg}</div>);
