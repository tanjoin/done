import DoneTask from './done-task';
import LocalStorageManager from './local-storage-manager';
import {fetchTodoTasksFromGoogleCalendar} from './google-calendar-service';
import {
  loadTasksFromGoogleDrive,
  syncTasksToGoogleDrive,
} from './google-drive-service';
import {hasValidGoogleToken, isGoogleReloginRequiredError} from './google-auth';
import type {DoneTaskData} from './types';

export default class TaskRepository {
  private static readonly CLOUD_CACHE_KEY = 'done_cloud_tasks_cache_v1';
  private static readonly CLOUD_CACHE_AT_KEY = 'done_cloud_tasks_cache_at_v1';
  private static readonly CLOUD_CACHE_TTL_MS = 3 * 60 * 1000;
  private static readonly NAV_FROM_SETTINGS_KEY =
    'done_nav_from_settings_to_index_v1';
  private static readonly NAV_HINT_TTL_MS = 30 * 1000;
  static readonly EVENT_TODO_CALENDAR_STATUS =
    'done-todo-calendar-load-status';
  static readonly EVENT_GOOGLE_DRIVE_STATUS = 'done-google-drive-status';

  static markNextIndexNavigationFromSettings(): void {
    try {
      sessionStorage.setItem(
        TaskRepository.NAV_FROM_SETTINGS_KEY,
        String(Date.now()),
      );
    } catch {
      // セッション書き込み失敗時は処理継続
    }
  }

  private static consumeSettingsNavigationHint(): boolean {
    try {
      const raw = sessionStorage.getItem(TaskRepository.NAV_FROM_SETTINGS_KEY);
      sessionStorage.removeItem(TaskRepository.NAV_FROM_SETTINGS_KEY);
      if (!raw) {
        return false;
      }
      const at = Number(raw);
      if (!Number.isFinite(at)) {
        return false;
      }
      return Date.now() - at <= TaskRepository.NAV_HINT_TTL_MS;
    } catch {
      return false;
    }
  }

  private static getNavigationType(): string {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      return nav.type || 'navigate';
    }
    return 'navigate';
  }

  static shouldForceCloudRefreshOnIndexInit(): boolean {
    const navType = TaskRepository.getNavigationType();
    if (navType === 'reload') {
      return true;
    }

    if (TaskRepository.consumeSettingsNavigationHint()) {
      return false;
    }

    const referrer = document.referrer || '';
    if (navType === 'navigate' && /\/settings\.html([?#].*)?$/i.test(referrer)) {
      return false;
    }

    return true;
  }

  private _tasks: DoneTask[] = [];

  private countGoogleTodoTasks(tasks: DoneTaskData[]): number {
    return tasks.filter(task => task.sourceType === 'google-todo').length;
  }

  private emitTodoCalendarStatus(detail: {
    state: 'loading' | 'cached' | 'success' | 'error';
    message: string;
  }): void {
    document.dispatchEvent(
      new CustomEvent(TaskRepository.EVENT_TODO_CALENDAR_STATUS, {
        detail,
      }),
    );
  }

  private emitGoogleDriveStatus(detail: {
    state: 'loading' | 'cached' | 'success' | 'error' | 'off';
    message: string;
  }): void {
    document.dispatchEvent(
      new CustomEvent(TaskRepository.EVENT_GOOGLE_DRIVE_STATUS, {
        detail,
      }),
    );
  }

  private hydrateTasks(rawTasks: DoneTaskData[]): DoneTask[] {
    return rawTasks.map(task => new DoneTask(task));
  }

  private stripGoogleTodoTasks(tasks: DoneTaskData[]): DoneTaskData[] {
    return tasks.filter(task => task.sourceType !== 'google-todo');
  }

  private getPersistableTasks(): DoneTaskData[] {
    return this.stripGoogleTodoTasks(this._tasks);
  }

  get tasks(): DoneTask[] {
    return this._tasks;
  }

  set tasks(value: DoneTask[] | null) {
    if (value === null) {
      this._tasks = [];
      LocalStorageManager.tasks = null;
      this.clearSessionCache();
    } else {
      this._tasks = value;
      LocalStorageManager.tasks = this.stripGoogleTodoTasks(value);
      this.setSessionCache(value);
    }
  }

  hydrateFromLocal(): void {
    const localTasks = LocalStorageManager.tasks || [];
    const localOnly = this.stripGoogleTodoTasks(localTasks);
    if (localOnly.length !== localTasks.length) {
      LocalStorageManager.tasks = localOnly;
    }
    this._tasks = this.hydrateTasks(localOnly);
  }

  private readSessionCache(): DoneTaskData[] | null {
    try {
      const rawTasks = sessionStorage.getItem(TaskRepository.CLOUD_CACHE_KEY);
      const rawAt = sessionStorage.getItem(TaskRepository.CLOUD_CACHE_AT_KEY);
      if (!rawTasks || !rawAt) {
        return null;
      }

      const at = Number(rawAt);
      if (!Number.isFinite(at)) {
        return null;
      }
      if (Date.now() - at > TaskRepository.CLOUD_CACHE_TTL_MS) {
        return null;
      }

      const parsed = JSON.parse(rawTasks) as DoneTaskData[];
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private setSessionCache(tasks: DoneTaskData[]): void {
    try {
      sessionStorage.setItem(
        TaskRepository.CLOUD_CACHE_KEY,
        JSON.stringify(tasks),
      );
      sessionStorage.setItem(
        TaskRepository.CLOUD_CACHE_AT_KEY,
        String(Date.now()),
      );
    } catch {
      // キャッシュ書き込み失敗時は処理継続
    }
  }

  private clearSessionCache(): void {
    try {
      sessionStorage.removeItem(TaskRepository.CLOUD_CACHE_KEY);
      sessionStorage.removeItem(TaskRepository.CLOUD_CACHE_AT_KEY);
    } catch {
      // キャッシュ削除失敗時は処理継続
    }
  }

  private async fetchCloudMergedTasks(
    localTasks: DoneTaskData[],
  ): Promise<{
    mergedTasks: DoneTaskData[];
    todoCount: number;
    todoFetchFailed: boolean;
    todoFetchAuthExpired: boolean;
    driveLoadFailed: boolean;
    driveLoadAuthExpired: boolean;
  }> {
    let workingTasks = localTasks;
    let driveLoadFailed = false;
    let driveLoadAuthExpired = false;

    if (!LocalStorageManager.googleDriveSyncEnabled) {
      this.emitGoogleDriveStatus({
        state: 'off',
        message: 'Google Drive: 同期OFF',
      });
    } else {
      this.emitGoogleDriveStatus({
        state: 'loading',
        message: 'Google Drive: 読み込み中...',
      });
    }

    try {
      const fromDrive = await loadTasksFromGoogleDrive();
      if (fromDrive && fromDrive.length > 0) {
        workingTasks = fromDrive;
      }
      if (LocalStorageManager.googleDriveSyncEnabled) {
        this.emitGoogleDriveStatus({
          state: 'success',
          message: 'Google Drive: 読み込み完了',
        });
      }
    } catch (error) {
      // Google Drive が未設定/未認証の場合はローカルのみで継続する。
      driveLoadFailed = true;
      driveLoadAuthExpired = isGoogleReloginRequiredError(error);
      if (LocalStorageManager.googleDriveSyncEnabled) {
        this.emitGoogleDriveStatus({
          state: 'error',
          message: driveLoadAuthExpired
            ? 'Google Drive: 認証切れ（再ログインしてください）'
            : 'Google Drive: 読み込み失敗',
        });
      }
    }

    let googleTodoTasks: DoneTaskData[] = [];
    let todoFetchFailed = false;
    let todoFetchAuthExpired = false;
    try {
      googleTodoTasks = await fetchTodoTasksFromGoogleCalendar();
    } catch (error) {
      // Google Calendar が未設定/未認証の場合はローカルのみで継続する。
      googleTodoTasks = [];
      todoFetchFailed = true;
      todoFetchAuthExpired = isGoogleReloginRequiredError(error);
    }

    const googleTodoMap = new Map(googleTodoTasks.map(task => [task.id, task]));
    const localOnly = workingTasks.filter(
      task => task.sourceType !== 'google-todo',
    );

    return {
      mergedTasks: [...localOnly, ...Array.from(googleTodoMap.values())],
      todoCount: googleTodoTasks.length,
      todoFetchFailed,
      todoFetchAuthExpired,
      driveLoadFailed,
      driveLoadAuthExpired,
    };
  }

  async refreshFromCloudIfNeeded(forceRefresh = false): Promise<boolean> {
    if (!hasValidGoogleToken()) {
      this.emitGoogleDriveStatus({
        state: 'off',
        message: 'Google Drive: 未ログイン',
      });
      return false;
    }

    if (!LocalStorageManager.googleDriveSyncEnabled) {
      this.emitGoogleDriveStatus({
        state: 'off',
        message: 'Google Drive: 同期OFF',
      });
    }

    if (!forceRefresh) {
      const cached = this.readSessionCache();
      if (cached) {
        this._tasks = this.hydrateTasks(cached);
        LocalStorageManager.tasks = this.stripGoogleTodoTasks(cached);
        this.emitTodoCalendarStatus({
          state: 'cached',
          message: `TODOカレンダー: キャッシュ利用 (${this.countGoogleTodoTasks(cached)}件)`,
        });
        this.emitGoogleDriveStatus({
          state: 'cached',
          message: 'Google Drive: キャッシュ利用',
        });
        return true;
      }
    }

    this.emitTodoCalendarStatus({
      state: 'loading',
      message: 'TODOカレンダー: 読み込み中...',
    });

    const fetched = await this.fetchCloudMergedTasks(LocalStorageManager.tasks || []);
    const localOnly = this.stripGoogleTodoTasks(fetched.mergedTasks);
    this._tasks = this.hydrateTasks(fetched.mergedTasks);
    LocalStorageManager.tasks = localOnly;
    this.setSessionCache(fetched.mergedTasks);

    this.emitTodoCalendarStatus(
      fetched.todoFetchFailed
        ? {
            state: 'error',
            message: fetched.todoFetchAuthExpired
              ? 'TODOカレンダー: 認証切れ（再ログインしてください）'
              : 'TODOカレンダー: 読み込み失敗（ローカル表示中）',
          }
        : {
            state: 'success',
            message: `TODOカレンダー: ${fetched.todoCount}件読み込み`,
          },
    );

    return true;
  }

  async loadTasks(): Promise<void> {
    this.hydrateFromLocal();

    if (this._tasks.length === 0 && !LocalStorageManager.hasStoredTasksData()) {
      await this.resetToDefault();
      return;
    }

    await this.refreshFromCloudIfNeeded();
  }

  async resetToDefault(): Promise<void> {
    const response = await fetch('tasks.json');
    if (!response.ok) {
      throw new Error('Failed to load tasks.json', {
        cause: response.statusText,
      });
    }

    const tasksFromJson = (await response.json()) as DoneTaskData[];
    this._tasks = this.hydrateTasks(tasksFromJson);
    LocalStorageManager.tasks = this._tasks;
    this.setSessionCache(this._tasks);
  }

  saveTasks(): void {
    const persistableTasks = this.getPersistableTasks();
    LocalStorageManager.tasks = persistableTasks;
    if (hasValidGoogleToken()) {
      if (!LocalStorageManager.googleDriveSyncEnabled) {
        this.emitGoogleDriveStatus({
          state: 'off',
          message: 'Google Drive: 同期OFF',
        });
        return;
      }

      this.emitGoogleDriveStatus({
        state: 'loading',
        message: 'Google Drive: 同期中...',
      });

      void syncTasksToGoogleDrive(persistableTasks)
        .then(() => {
          this.emitGoogleDriveStatus({
            state: 'success',
            message: 'Google Drive: 同期完了',
          });
        })
        .catch(error => {
          this.emitGoogleDriveStatus({
            state: 'error',
            message: isGoogleReloginRequiredError(error)
              ? 'Google Drive: 認証切れ（再ログインしてください）'
              : 'Google Drive: 同期失敗',
          });
        });
    }
  }

  async saveTasksWithSync(): Promise<void> {
    const persistableTasks = this.getPersistableTasks();
    LocalStorageManager.tasks = persistableTasks;
    if (!hasValidGoogleToken()) {
      return;
    }

    if (!LocalStorageManager.googleDriveSyncEnabled) {
      this.emitGoogleDriveStatus({
        state: 'off',
        message: 'Google Drive: 同期OFF',
      });
      return;
    }

    this.emitGoogleDriveStatus({
      state: 'loading',
      message: 'Google Drive: 同期中...',
    });

    try {
      await syncTasksToGoogleDrive(persistableTasks);
      this.emitGoogleDriveStatus({
        state: 'success',
        message: 'Google Drive: 同期完了',
      });
    } catch (error) {
      this.emitGoogleDriveStatus({
        state: 'error',
        message: isGoogleReloginRequiredError(error)
          ? 'Google Drive: 認証切れ（再ログインしてください）'
          : 'Google Drive: 同期失敗',
      });
      throw error;
    }
  }
}
