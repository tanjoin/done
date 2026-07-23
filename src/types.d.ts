import type DoneTask from './done-task';

export type DoneSwitchViewMode = 'card' | 'table';
export type DoneTheme = 'system' | 'light' | 'dark';
export type DoneNotificationSound =
  | 'original'
  | 'bell'
  | 'bell-high'
  | 'soft'
  | 'loud'
  | 'loud-high'
  | 'bright'
  | 'pulse'
  | 'potato'
  | 'coin'
  | 'levelup1'
  | 'levelup2'
  | 'slap'
  | 'marimba'
  | 'recommend1'
  | 'recommend2'
  | 'dotapun'
  | 'success'
  | 'magic'
  | 'warp'
  | 'jojo'
  | 'ding'
  | 'mail_received'
  | 'line_pokipoki'
  | 'slack_knock'
  | 'discord_ping'
  | 'iphone'
  | 'android'
  | 'mcd_potato'
  | 'mario_coin'
  | 'dq_levelup'
  | 'pokemon_heal'
  | 'droplet_dotapun';
export type TodayStatus = 'completed' | 'cancelled' | undefined;
export type DoneTaskData = {
  id: string;
  text: string;
  description?: string | null;
  link?: string | null;
  group?: string;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  startTime?: string | null;
  endTime?: string | null;
  history: Record<string, TodayStatus>;
  notifiedDate?: string | null;
  remindMinutesBefore?: number | null;
  strictMode?: boolean | null;
  specificDate?: string | null;
  endDate?: string | null;
};
export type DoneSelectOption<T extends string> = {
  value: T;
  label: string;
};
export type DoneNotificationAudioStep = {
  duration: number;
  gap?: number;
  gain?: number;
  type?: OscillatorType;
  frequency?: number;
  note?: number;
};
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
