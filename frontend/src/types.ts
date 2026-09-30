export interface User { id: string; email: string; name: string; avatar: string; slack_connected: boolean }
export interface EmailRow { id: string; to_email: string; subject: string; scheduled_at: string; sent_at: string | null; status: string; preview_url?: string | null; body?: string }
export interface ScheduleInput { subject: string; body: string; recipients: string[]; startTime: string; delaySeconds: number; hourlyLimit?: number }
