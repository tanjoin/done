export type DoneSwitchViewMode = 'card' | 'table';
export type DoneTheme = 'system' | 'light' | 'dark';
export type TodayStatus = 'completed' | 'cancelled' | undefined;
export type DoneReminderCandidate = {
  scheduleDateKey: string;
  startNorm: string | null;
  leadMinutes: number | null;
  reminderAt: Date;
};
export type NormalizedTime = {
  normalizedStart: string | null;
  startMinutes: number;
};
export type TargetDayMap = Record<string, boolean>;
export type DoneGroups = Record<string, DoneTask[]>;
export type TimeCheck = {
  valid: boolean;
  ready: boolean;
  msg: string;
};
export type StatusInfo = {
  label: string;
  className: string;
  locked: boolean;
};
