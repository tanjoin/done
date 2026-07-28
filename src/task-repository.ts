import DoneTask from './done-task';
import LocalStorageManager from './local-storage-manager';
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
    const savedTasks = LocalStorageManager.tasks;
    this._tasks = this.hydrateTasks(savedTasks || []);
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
  }
}
