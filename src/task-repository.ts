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
  private _tasks: DoneTask[] = [];

  private hydrateTasks(rawTasks: DoneTaskData[]): DoneTask[] {
    return rawTasks.map(task => new DoneTask(task));
  }

  get tasks(): DoneTask[] {
    return this._tasks;
  }

  set tasks(value: DoneTask[] | null) {
    if (value === null) {
      this._tasks = [];
      LocalStorageManager.tasks = null;
    } else {
      this._tasks = value;
      LocalStorageManager.tasks = value;
    }
  }

  async loadTasks(): Promise<void> {
    const localTasks = LocalStorageManager.tasks;
    let workingTasks = localTasks || [];

    const googleEnabled = hasValidGoogleToken();

    if (googleEnabled) {
      try {
        const fromDrive = await loadTasksFromGoogleDrive();
        if (fromDrive && fromDrive.length > 0) {
          workingTasks = fromDrive;
          LocalStorageManager.tasks = fromDrive;
        }
      } catch {
        // Google Drive が未設定/未認証の場合はローカルのみで継続する。
      }
    }

    let googleTodoTasks: DoneTaskData[] = [];
    if (googleEnabled) {
      try {
        googleTodoTasks = await fetchTodoTasksFromGoogleCalendar();
      } catch {
        // Google Calendar が未設定/未認証の場合はローカルのみで継続する。
        googleTodoTasks = [];
      }
    }
    const googleTodoMap = new Map(googleTodoTasks.map(task => [task.id, task]));

    const localOnly = workingTasks.filter(
      task => task.sourceType !== 'google-todo',
    );
    const merged = [...localOnly, ...Array.from(googleTodoMap.values())];

    this._tasks = this.hydrateTasks(merged);
    if (this._tasks.length === 0 && !LocalStorageManager.hasStoredTasksData()) {
      await this.resetToDefault();
    }
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
  }

  saveTasks(): void {
    LocalStorageManager.tasks = this._tasks;
    if (hasValidGoogleToken()) {
      void syncTasksToGoogleDrive(this._tasks);
    }
  }
}
