import {DoneNotificationSound, DoneTheme, DoneSwitchViewMode} from './types';
import DoneTask from './done-task';
import {TemporaryHistoryItem} from './temporary-history';

const DONE_NOTIFICATION_SOUNDS: DoneNotificationSound[] = [
  'original',
  'bell',
  'bell-high',
  'soft',
  'loud',
  'loud-high',
  'bright',
  'pulse',
  'potato',
  'coin',
  'levelup1',
  'levelup2',
  'slap',
  'marimba',
  'recommend1',
  'recommend2',
  'dotapun',
  'success',
  'magic',
  'warp',
  'jojo',
  'ding',
  'mail_received',
  'line_pokipoki',
  'slack_knock',
  'discord_ping',
  'iphone',
  'android',
  'mcd_potato',
  'mario_coin',
  'dq_levelup',
  'pokemon_heal',
  'droplet_dotapun',
];

export default class LocalStorageManager {
  static get LEGACY_V3_TASKS_KEY(): string {
    return 'calendar_tasks_v3';
  }

  static get LEGACY_TASKS_KEY(): string {
    return 'data_tasks';
  }

  static get OVERDUE_REFERENCE_DATE_KEY(): string {
    return 'overdue_reference_date';
  }

  static get overdueReferenceDate(): string {
    const saved = localStorage.getItem(LocalStorageManager.OVERDUE_REFERENCE_DATE_KEY);
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      return saved;
    }

    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  static set overdueReferenceDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return;
    }
    localStorage.setItem(LocalStorageManager.OVERDUE_REFERENCE_DATE_KEY, value);
  }

  static get CALENDAR_TARGET_ID_KEY(): string {
    return 'calendar_target_id';
  }

  static get calendarTargetId(): string {
    return localStorage.getItem(LocalStorageManager.CALENDAR_TARGET_ID_KEY) || '';
  }

  static set calendarTargetId(value: string) {
    localStorage.setItem(LocalStorageManager.CALENDAR_TARGET_ID_KEY, value);
  }

  static supportsLocalStorage(): boolean {
    try {
      const key = '__done_local_storage_test__';
      localStorage.setItem(key, key);
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  static get TEMPORARY_INPUT_HISTORY_KEY(): string {
    return 'done_temporary_input_history';
  }

  static get temporaryInputHistory(): TemporaryHistoryItem[] {
    const historyJson = localStorage.getItem(
      LocalStorageManager.TEMPORARY_INPUT_HISTORY_KEY,
    );
    if (!historyJson) {
      return [];
    }
    try {
      const history = JSON.parse(historyJson) as TemporaryHistoryItem[];
      if (Array.isArray(history)) {
        return history;
      }
      return [];
    } catch (e) {
      console.error('Failed to parse temporary history from localStorage:', e);
      return [];
    }
  }

  static set temporaryInputHistory(history: TemporaryHistoryItem[] | null) {
    if (history === null) {
      localStorage.removeItem(LocalStorageManager.TEMPORARY_INPUT_HISTORY_KEY);
    } else {
      localStorage.setItem(
        LocalStorageManager.TEMPORARY_INPUT_HISTORY_KEY,
        JSON.stringify(history),
      );
    }
  }

  static get APP_THEME_KEY(): string {
    return 'done_app_theme';
  }

  static get NOTIFICATION_SOUND_KEY(): string {
    return 'notification_sound';
  }

  static get notificationSound(): DoneNotificationSound {
    const savedSound = localStorage.getItem(
      LocalStorageManager.NOTIFICATION_SOUND_KEY,
    );

    if (
      savedSound !== null &&
      DONE_NOTIFICATION_SOUNDS.includes(savedSound as DoneNotificationSound)
    ) {
      return savedSound as DoneNotificationSound;
    }
    return 'bell';
  }

  static set notificationSound(sound: string) {
    if (DONE_NOTIFICATION_SOUNDS.includes(sound as DoneNotificationSound)) {
      localStorage.setItem(LocalStorageManager.NOTIFICATION_SOUND_KEY, sound);
    }
  }

  static get appTheme(): DoneTheme {
    const savedTheme = localStorage.getItem(
      LocalStorageManager.APP_THEME_KEY,
    ) as DoneTheme | null;
    if (
      savedTheme === 'light' ||
      savedTheme === 'dark' ||
      savedTheme === 'system'
    ) {
      return savedTheme;
    }
    return 'system';
  }

  static set appTheme(theme: DoneTheme) {
    localStorage.setItem(LocalStorageManager.APP_THEME_KEY, theme);
  }

  static get TASKS_KEY(): string {
    return 'done_tasks';
  }

  static hasStoredTasksData(): boolean {
    return (
      localStorage.getItem(LocalStorageManager.TASKS_KEY) !== null ||
      localStorage.getItem(LocalStorageManager.LEGACY_V3_TASKS_KEY) !== null ||
      localStorage.getItem(LocalStorageManager.LEGACY_TASKS_KEY) !== null
    );
  }

  static get tasks(): DoneTask[] {
    const tasksJson =
      localStorage.getItem(LocalStorageManager.TASKS_KEY) ||
      localStorage.getItem(LocalStorageManager.LEGACY_V3_TASKS_KEY) ||
      localStorage.getItem(LocalStorageManager.LEGACY_TASKS_KEY);
    if (!tasksJson) {
      return [];
    }
    try {
      const parsed = JSON.parse(tasksJson) as DoneTask[] | { tasks?: DoneTask[] };
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tasks)) {
        return parsed.tasks;
      }
      return [];
    } catch (e) {
      console.error('Failed to parse tasks from localStorage:', e);
      return [];
    }
  }

  static set tasks(tasks: DoneTask[] | null) {
    if (tasks === null) {
      localStorage.removeItem(LocalStorageManager.TASKS_KEY);
      localStorage.removeItem(LocalStorageManager.LEGACY_V3_TASKS_KEY);
      localStorage.removeItem(LocalStorageManager.LEGACY_TASKS_KEY);
    } else {
      const serialized = JSON.stringify(tasks);
      // 移行期間中は新旧キーを同期して、どちらの参照経路でも同じデータを使う
      localStorage.setItem(LocalStorageManager.TASKS_KEY, serialized);
      localStorage.setItem(LocalStorageManager.LEGACY_V3_TASKS_KEY, serialized);
    }
  }

  static get taskViewMode(): DoneSwitchViewMode {
    const savedViewMode = localStorage.getItem(
      'task_view_mode',
    ) as DoneSwitchViewMode | null;
    if (savedViewMode === 'card' || savedViewMode === 'table') {
      return savedViewMode;
    }
    return 'card';
  }

  static set taskViewMode(mode: DoneSwitchViewMode) {
    localStorage.setItem('task_view_mode', mode);
  }

  static get FILTER_HIDE_NON_TARGET_DAY_KEY(): string {
    return 'filter_hide_non_target_day';
  }

  static get filterHideNonTargetDay(): boolean {
    return this.getFilter(LocalStorageManager.FILTER_HIDE_NON_TARGET_DAY_KEY, true);
  }

  static set filterHideNonTargetDay(value: boolean) {
    this.setFilter(LocalStorageManager.FILTER_HIDE_NON_TARGET_DAY_KEY, value);
  }

  static get FILTER_HIDE_OUT_OF_TIME_KEY(): string {
    return 'filter_hide_out_of_time';
  }

  static get filterHideOutOfTime(): boolean {
    return this.getFilter(LocalStorageManager.FILTER_HIDE_OUT_OF_TIME_KEY, false);
  }

  static set filterHideOutOfTime(value: boolean) {
    this.setFilter(LocalStorageManager.FILTER_HIDE_OUT_OF_TIME_KEY, value);
  }

  static get FILTER_HIDE_COMPLETED_KEY(): string {
    return 'filter_hide_completed';
  }

  static get filterHideCompleted(): boolean {
    return this.getFilter(LocalStorageManager.FILTER_HIDE_COMPLETED_KEY, false);
  }

  static set filterHideCompleted(value: boolean) {
    this.setFilter(LocalStorageManager.FILTER_HIDE_COMPLETED_KEY, value);
  }

  static get FILTER_HIDE_CANCELLED_KEY(): string {
    return 'filter_hide_cancelled';
  }

  static get filterHideCancelled(): boolean {
    return this.getFilter(LocalStorageManager.FILTER_HIDE_CANCELLED_KEY, false);
  }

  static set filterHideCancelled(value: boolean) {
    this.setFilter(LocalStorageManager.FILTER_HIDE_CANCELLED_KEY, value);
  }

  static get FILTER_FORCE_SHOW_OVERDUE_KEY(): string {
    return 'filter_force_show_overdue';
  }

  static get filterForceShowOverdue(): boolean {
    return this.getFilter(LocalStorageManager.FILTER_FORCE_SHOW_OVERDUE_KEY, true);
  }

  static set filterForceShowOverdue(value: boolean) {
    this.setFilter(LocalStorageManager.FILTER_FORCE_SHOW_OVERDUE_KEY, value);
  }

  static getFilter(key: string, defaultValue = false): boolean {
    const currentValue = localStorage.getItem(key);
    if (currentValue === null) {
      return defaultValue;
    }
    return currentValue === 'true';
  }

  static setFilter(key: string, value: boolean): void {
    localStorage.setItem(key, value.toString());
  }
}
