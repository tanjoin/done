import { TargetDayMap } from "./types";
import DoneTask from "./done-task";
import DateHelper from "./date-helper";

export default class TableManager {

  get headers(): Record<string, string>[] {
    return [
      { group: 'グループ', task: 'タスク', time: '時間', date: '日付', status: 'ステータス' }
    ];
  }


  renderTableView(container: HTMLElement, tasks: DoneTask[], targetDayMap: TargetDayMap): void {
    container.appendChild(this.createTableManager(tasks, targetDayMap));
  }

  createTableManager(tasks: DoneTask[], targetDayMap: TargetDayMap): HTMLElement {
    const tableWrapper = this.createTableWrapper();
    const table = this.createTaskTable();
    tableWrapper.appendChild(table);
    const thead = this.createTHeadTag();
    table.appendChild(thead);
    const tbody = this.createTableBody();
    table.appendChild(tbody);
    this.insertTasks(tasks, tbody, DateHelper.todayDate, DateHelper.yesterdayDate);
    return tableWrapper;
  }

  insertTasks(tasks: DoneTask[], tbody: HTMLElement, today: Date, yesterday: Date): void {
    tasks.forEach((task, idx) => {
      const row = document.createElement('tr');
      const currentTask = new DoneTask(task);
      const taskIndex = tasks.findIndex(t => t.id === task.id);
      currentTask.insertRowElements(row, taskIndex);
      tbody.appendChild(row);
    });
  }

  private createTableBody() {
    return document.createElement('tbody');
  }

  private createTableWrapper() {
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    return tableWrapper;
  }

  private createTaskTable() {
    const table = document.createElement('table');
    table.className = 'task-table';
    return table;
  }

  createTHeadTag(): HTMLElement {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');

    this.headers.forEach(header => {
      for (const key in header) {
        const th = document.createElement('th');

        th.textContent = header[key] ? header[key] : '';
        th.setAttribute('data-sort-col', key);
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';

        const sortIndicator = document.createElement('span');
        sortIndicator.className = 'sort-indicator';
        th.appendChild(sortIndicator);

        tr.appendChild(th);
      }
    });

    const operationHeader = document.createElement('th');
    operationHeader.textContent = '操作';
    tr.appendChild(operationHeader);

    thead.appendChild(tr);
    return thead;
  }
}