import DoneTask from './done-task';
import LocalStorageManager from './local-storage-manager';
import {fetchTodoTasksFromGoogleCalendar} from './google-calendar-service';
import {
  loadTasksFromGoogleDrive,
  type GoogleDriveSyncSkippedReason,
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
  private _preferDriveOnNextCloudRefresh = false;
  private _defaultTasksCache: DoneTaskData[] | null = null;

  private static hasOAuthClientIdConfigured(): boolean {
    return Boolean(LocalStorageManager.googleClientIdEncrypted.trim());
  }

  private static redirectToSettingsForRelogin(): void {
    if (!TaskRepository.hasOAuthClientIdConfigured()) {
      return;
    }
    if (/\/settings\.html([?#].*)?$/i.test(window.location.pathname)) {
      return;
    }
    window.location.href = 'settings.html';
  }

  private static mapSyncSkippedReasonToMessage(
    reason: GoogleDriveSyncSkippedReason,
  ): string {
    if (reason === 'missing_local_updated_at') {
      return 'Google Drive: 最終更新日なし（上書き停止）';
    }
    if (reason === 'missing_remote_updated_at') {
      return 'Google Drive: 保存先に最終更新日なし（上書き停止）';
    }
    return 'Google Drive: 保存先の方が新しいため上書き停止';
  }

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

  private async getDefaultTasksFromJson(): Promise<DoneTaskData[] | null> {
    if (this._defaultTasksCache) {
      return this._defaultTasksCache;
    }

    try {
      const response = await fetch('tasks.json');
      if (!response.ok) {
        return null;
      }
      const parsed = (await response.json()) as DoneTaskData[];
      if (!Array.isArray(parsed)) {
        return null;
      }
      this._defaultTasksCache = this.stripGoogleTodoTasks(parsed);
      return this._defaultTasksCache;
    } catch {
      return null;
    }
  }

  private pickComparableTaskShape(task: DoneTaskData): string {
    const picked = {
      id: task.id || '',
      text: task.text || '',
      group: task.group || '',
      daysOfWeek: Array.isArray(task.daysOfWeek) ? task.daysOfWeek : [],
      daysOfMonth: Array.isArray(task.daysOfMonth) ? task.daysOfMonth : [],
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      strictMode: task.strictMode ?? null,
      skipCalendarOnComplete: task.skipCalendarOnComplete ?? null,
      createTaskViaUrl: task.createTaskViaUrl ?? null,
      specificDate: task.specificDate || '',
      endDate: task.endDate || '',
      sourceType: task.sourceType || 'local',
    };
    return JSON.stringify(picked);
  }

  private async shouldPreferDriveSnapshot(localTasks: DoneTaskData[]): Promise<boolean> {
    if (this._preferDriveOnNextCloudRefresh) {
      this._preferDriveOnNextCloudRefresh = false;
      return true;
    }

    if (localTasks.length === 0) {
      return true;
    }

    const defaultTasks = await this.getDefaultTasksFromJson();
    if (!defaultTasks || defaultTasks.length === 0) {
      return false;
    }

    if (defaultTasks.length !== localTasks.length) {
      return false;
    }

    const localComparable = localTasks
      .map(task => this.pickComparableTaskShape(task))
      .sort();
    const defaultComparable = defaultTasks
      .map(task => this.pickComparableTaskShape(task))
      .sort();

    return localComparable.every((value, index) => value === defaultComparable[index]);
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
    driveLoadSkippedByTimestamp: boolean;
  }> {
    let workingTasks = localTasks;
    let driveLoadFailed = false;
    let driveLoadAuthExpired = false;
    let driveLoadSkippedByTimestamp = false;

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
      if (fromDrive && fromDrive.tasks.length > 0) {
        const shouldPreferDrive = await this.shouldPreferDriveSnapshot(localTasks);
        const localUpdatedAt = LocalStorageManager.tasksLastUpdatedAt;
        if (shouldPreferDrive) {
          workingTasks = fromDrive.tasks;
          if (fromDrive.hasTimestamp) {
            LocalStorageManager.tasksLastUpdatedAt = fromDrive.updatedAt;
          }
        } else if (!fromDrive.hasTimestamp) {
          driveLoadSkippedByTimestamp = true;
        } else if (!localUpdatedAt || localUpdatedAt <= fromDrive.updatedAt) {
          workingTasks = fromDrive.tasks;
          LocalStorageManager.tasksLastUpdatedAt = fromDrive.updatedAt;
        } else {
          driveLoadSkippedByTimestamp = true;
          const syncResult = await syncTasksToGoogleDrive(localTasks);
          if (syncResult.uploaded) {
            this.emitGoogleDriveStatus({
              state: 'success',
              message: 'Google Drive: ローカルが新しいため上書き同期しました',
            });
            driveLoadSkippedByTimestamp = false;
          }
        }
      }
      if (LocalStorageManager.googleDriveSyncEnabled) {
        this.emitGoogleDriveStatus({
          state: driveLoadSkippedByTimestamp ? 'cached' : 'success',
          message: driveLoadSkippedByTimestamp
            ? 'Google Drive: 最終更新日比較でローカルを優先'
            : 'Google Drive: 読み込み完了',
        });
      }
    } catch (error) {
      // Google Drive が未設定/未認証の場合はローカルのみで継続する。
      driveLoadFailed = true;
      driveLoadAuthExpired = isGoogleReloginRequiredError(error);
      if (driveLoadAuthExpired) {
        TaskRepository.redirectToSettingsForRelogin();
      }
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
      if (todoFetchAuthExpired) {
        TaskRepository.redirectToSettingsForRelogin();
      }
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
      driveLoadSkippedByTimestamp,
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
    this._preferDriveOnNextCloudRefresh = true;
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
        .then(result => {
          if (!result.uploaded && result.skippedReason) {
            this.emitGoogleDriveStatus({
              state: 'error',
              message: TaskRepository.mapSyncSkippedReasonToMessage(
                result.skippedReason,
              ),
            });
            return;
          }
          this.emitGoogleDriveStatus({
            state: 'success',
            message: 'Google Drive: 同期完了',
          });
        })
        .catch(error => {
          if (isGoogleReloginRequiredError(error)) {
            TaskRepository.redirectToSettingsForRelogin();
          }
          this.emitGoogleDriveStatus({
            state: 'error',
            message: isGoogleReloginRequiredError(error)
              ? 'Google Drive: 認証切れ（再ログインしてください）'
              : 'Google Drive: 同期失敗',
          });
        });
    }
  }

  async saveTasksWithSync(forceOverwrite = false): Promise<void> {
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
      const result = await syncTasksToGoogleDrive(persistableTasks, {
        forceOverwrite,
      });
      if (!result.uploaded && result.skippedReason) {
        this.emitGoogleDriveStatus({
          state: 'error',
          message: TaskRepository.mapSyncSkippedReasonToMessage(
            result.skippedReason,
          ),
        });
        return;
      }
      this.emitGoogleDriveStatus({
        state: 'success',
        message: 'Google Drive: 同期完了',
      });
    } catch (error) {
      if (isGoogleReloginRequiredError(error)) {
        TaskRepository.redirectToSettingsForRelogin();
      }
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
