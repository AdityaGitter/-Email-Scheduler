import { ButtonHTMLAttributes } from "react";
export const Button = ({ variant = "outline", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" | "solid" }) => (
  <button {...p} className={`inline-flex items-center justify-center gap-2 text-sm font-medium transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand ${
    variant === "solid" ? "bg-brand text-white hover:bg-[#008f38]" : "border border-brand text-brand hover:bg-mint"} ${className}`} />);
export const Toast = ({ msg, error }: { msg: string; error?: boolean }) => (
  <div role="status" className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${error ? "bg-red-600" : "bg-[#1f2421]"}`}>{msg}</div>);
export const Avatar = ({ src, name, size = 36 }: { src?: string; name: string; size?: number }) =>
  src ? <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size }} className="rounded-full object-cover" />
      : <span style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-brand text-white">{name[0]?.toUpperCase()}</span>;
export const Logo = () => <span className="font-['Silkscreen'] text-3xl leading-none tracking-tight">ONB</span>;
