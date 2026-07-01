import TaskRepository from "./task_repository.js";
import DateHelper from "./date_helper.js";
import SortState from "./sort_state.js";

/**
 * タスクのソートを管理するマネージャクラス
 */

// --- 【新規追加】ソート実行マネージャ ---
class SortManager {
  /**
   * ソートヘッダーがクリックされた際のハンドラ
   * @param {string} columnName - ソート対象列名 ('group', 'task', 'time', 'date', 'status')
   */
  static handleSort(columnName) {
    SortState.updateSortState(columnName);

    // タスクをソートして再描画
    SortManager.sortTasks();
    renderCards();
  }

  /**
   * 現在の SortState に基づいて tasks 配列を並び替える
   */
  static sortTasks() {
    const col = SortState.column;
    if (!col) return;

    const ascMult = SortState.ascending ? 1 : -1;
    const TODAY = DateHelper.today;

    TaskRepository.tasks.sort((a, b) => {
      let valA = "";
      let valB = "";

      switch (col) {
        case "group":
          valA = a.group || "";
          valB = b.group || "";
          break;
        case "task":
          valA = a.text || ""; // タスク名は `text` プロパティ
          valB = b.text || "";
          break;
        case "time":
          // テキストベースでのシンプルな文字列ソートに変更
          valA = a.startTime || "";
          valB = b.startTime || "";
          break;
        case "date":
          valA = SortManager.getScheduleSortValue(a);
          valB = SortManager.getScheduleSortValue(b);
          break;
        case "status":
          valA = a.history && a.history[TODAY] ? a.history[TODAY] : "";
          valB = b.history && b.history[TODAY] ? b.history[TODAY] : "";
          break;
        default:
          return 0;
      }

      if (valA < valB) return -1 * ascMult;
      if (valA > valB) return 1 * ascMult;
      return 0;
    });
  }

  /**
   * 各スケジュールの比較用文字列を取得
   */
  static getScheduleSortValue(task) {
    if (task.specificDate) {
      return task.specificDate;
    }
    if (task.daysOfWeek && task.daysOfWeek.length) {
      return "W-" + task.daysOfWeek.join(",");
    }
    if (task.daysOfMonth && task.daysOfMonth.length) {
      return (
        "M-" + task.daysOfMonth.map((n) => String(n).padStart(2, "0")).join(",")
      );
    }
    return "Daily";
  }

  /**
   * ソート状態のインジケータ表示をヘッダーUIに同期する
   */
  static updateHeaderUI() {
    const headers = document.querySelectorAll("th[data-sort-col]");
    headers.forEach((th) => {
      const col = th.getAttribute("data-sort-col");
      th.classList.remove("sort-asc", "sort-desc");
      const indicator = th.querySelector(".sort-indicator");
      if (indicator) indicator.textContent = "";

      if (col === SortState.column) {
        if (SortState.ascending) {
          th.classList.add("sort-asc");
          if (indicator) indicator.textContent = "▲";
        } else {
          th.classList.add("sort-desc");
          if (indicator) indicator.textContent = "▼";
        }
      }
    });
  }
}

export default SortManager;
