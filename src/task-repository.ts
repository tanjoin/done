import DoneTask from './done-task';
import LocalStorageManager from './local-storage-manager';

export default class TaskRepository {
  private _tasks: DoneTask[] = [];

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
    this._tasks = savedTasks || [];
    if (this._tasks.length === 0) {
      const response = await fetch('tasks.json');
      if (response.ok) {
        const tasksFromJson: DoneTask[] = await response.json();
        this._tasks = tasksFromJson;
        LocalStorageManager.tasks = tasksFromJson;
      } else {
        throw new Error('Failed to load tasks.json', {
          cause: response.statusText,
        });
      }
    }
  }

  saveTasks(): void {
    LocalStorageManager.tasks = this._tasks;
  }
}
