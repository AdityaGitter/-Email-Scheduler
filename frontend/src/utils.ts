export const chipTime = (s: string) => {
  const d = new Date(s);
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
};
export const fullDate = (s: string) => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const extractEmails = (t: string) => [...new Set(t.match(/[^\s,;"'<>]+@[^\s,;"'<>]+\.[^\s,;"'<>]+/g) ?? [])];
export const inTab = (status: string, tab: "scheduled" | "sent") => (tab === "sent" ? ["sent", "failed"] : ["scheduled", "sending"]).includes(status);
