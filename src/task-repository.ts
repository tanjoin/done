import DoneTask from './done-task';
import LocalStorageManager from './local-storage-manager';
import {fetchTodoTasksFromGoogleCalendar} from './google-calendar-service';
import {
  loadTasksFromGoogleDrive,
  syncTasksToGoogleDrive,
} from './google-drive-service';
import {hasValidGoogleToken} from './google-auth';
import type {DoneTaskData} from './types';

export default class TaskRepository {
  private static readonly CLOUD_CACHE_KEY = 'done_cloud_tasks_cache_v1';
  private static readonly CLOUD_CACHE_AT_KEY = 'done_cloud_tasks_cache_at_v1';
  private static readonly CLOUD_CACHE_TTL_MS = 3 * 60 * 1000;
  static readonly EVENT_TODO_CALENDAR_STATUS =
    'done-todo-calendar-load-status';

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

  private hydrateTasks(rawTasks: DoneTaskData[]): DoneTask[] {
    return rawTasks.map(task => new DoneTask(task));
  }

  private stripGoogleTodoTasks(tasks: DoneTaskData[]): DoneTaskData[] {
    return tasks.filter(task => task.sourceType !== 'google-todo');
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
  }> {
    let workingTasks = localTasks;

    try {
      const fromDrive = await loadTasksFromGoogleDrive();
      if (fromDrive && fromDrive.length > 0) {
        workingTasks = fromDrive;
      }
    } catch {
      // Google Drive が未設定/未認証の場合はローカルのみで継続する。
    }

    let googleTodoTasks: DoneTaskData[] = [];
    let todoFetchFailed = false;
    try {
      googleTodoTasks = await fetchTodoTasksFromGoogleCalendar();
    } catch {
      // Google Calendar が未設定/未認証の場合はローカルのみで継続する。
      googleTodoTasks = [];
      todoFetchFailed = true;
    }

    const googleTodoMap = new Map(googleTodoTasks.map(task => [task.id, task]));
    const localOnly = workingTasks.filter(
      task => task.sourceType !== 'google-todo',
    );

    return {
      mergedTasks: [...localOnly, ...Array.from(googleTodoMap.values())],
      todoCount: googleTodoTasks.length,
      todoFetchFailed,
    };
  }

  async refreshFromCloudIfNeeded(forceRefresh = false): Promise<boolean> {
    if (!hasValidGoogleToken()) {
      return false;
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
            message: 'TODOカレンダー: 読み込み失敗（ローカル表示中）',
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
    LocalStorageManager.tasks = this._tasks;
    if (hasValidGoogleToken()) {
      void syncTasksToGoogleDrive(this._tasks);
    }
  }
}
