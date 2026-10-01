import type { EmailRow, ScheduleInput, User } from "./types";

const API_URL = "https://email-scheduler-api-c763.onrender.com";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_URL}${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!r.ok) {
    throw new Error(
      r.status === 401
        ? "unauth"
        : (await r.json().catch(() => ({}))).error?.toString() ||
          "Request failed"
    );
  }

  return r.json();
}

export const api = {
  me: () => req<User>("/api/me"),

  logout: () => req("/auth/logout", {
    method: "POST",
  }),

  emails: (status: "scheduled" | "sent") =>
    req<EmailRow[]>(`/api/emails?status=${status}`),

  search: (q: string) =>
    req<EmailRow[]>(`/api/search?q=${encodeURIComponent(q)}`),

  schedule: (b: ScheduleInput) =>
    req<{ scheduled: number }>("/api/schedule", {
      method: "POST",
      body: JSON.stringify(b),
    }),

  disconnectSlack: () =>
    req("/api/slack/disconnect", {
      method: "POST",
    }),
};