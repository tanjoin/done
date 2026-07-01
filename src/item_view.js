import DateHelper from "./date_helper.js";
import TaskRepository from "./task_repository.js";
import LocalStorageHelper from "./local_storage_helper.js";
import Task from "./task.js";

class ItemView {
  static undoTask(index) {
    const TODAY = DateHelper.today;
    if (TaskRepository.tasks[index].history[TODAY]) {
      delete TaskRepository.tasks[index].history[TODAY];
      LocalStorageHelper.calendarTasksV3 = TaskRepository.tasks;
      renderCards();
    }
  }

  // --- 一時的タスクの完全削除機能 ---
  static deleteActualTask(id) {
    if (confirm("この一時的タスクをリストから完全に削除しますか？")) {
      TaskRepository.tasks = TaskRepository.tasks.filter((t) => t.id !== id);
      LocalStorageHelper.calendarTasksV3 = TaskRepository.tasks;
      renderCards();
    }
  }

  static cancelTask(id) {
    const TODAY = DateHelper.today;
    const index = TaskRepository.tasks.findIndex((t) => t.id === id);
    TaskRepository.tasks[index].history[TODAY] = isCancel
      ? Task.TODAY_STATUS_CANCELLED
      : Task.TODAY_STATUS_COMPLETED;
    LocalStorageHelper.calendarTasksV3 = TaskRepository.tasks;
    renderCards();
  }
}

export default ItemView;
