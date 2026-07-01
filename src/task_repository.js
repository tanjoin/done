import Task from "./task.js";
import LocalStorageHelper from "./local_storage_helper.js";

let tasks = [];

class TaskRepository {
  // TODO: tasks を中で管理したい

  static get tasks() {
    return tasks;
  }

  static set tasks(array) {
    tasks = Array.isArray(array)
      ? array.map((task) => ({
          ...task,
          remindMinutesBefore: new Task(task).normalizeRemindMinutesBefore(),
        }))
      : [];
  }

  static async loadDefaultTasksFromJSON() {
    try {
      const response = await fetch("tasks.json");
      if (!response.ok) throw new Error("Network error");
      TaskRepository.tasks = await response.json();
      LocalStorageHelper.calendarTasksV3 = TaskRepository.tasks;
    } catch (error) {
      console.error("デフォルトタスクJSONの読み込みに失敗しました:", error);
      TaskRepository.tasks = [];
    }
  }

  static async reset() {
    LocalStorageHelper.removeCalendarTasksV3();
    await this.loadDefaultTasksFromJSON();
  }
}

export default TaskRepository;
