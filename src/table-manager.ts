import {DoneOverdueTask, TargetDayMap} from './types';
import DoneTask from './done-task';
import DateHelper from './date-helper';

export default class TableManager {
  get headers(): Record<string, string>[] {
    return [
      {
        group: 'グループ',
        task: 'タスク',
        time: '時間',
        date: '日付',
        status: 'ステータス',
      },
    ];
  }

  renderTableView(
    container: HTMLElement,
    tasks: DoneTask[],
    targetDayMap: TargetDayMap,
    overdueTasks: DoneOverdueTask[] = [],
  ): void {
    container.appendChild(
      this.createTableManager(tasks, targetDayMap, overdueTasks),
    );
  }

  createTableManager(
    tasks: DoneTask[],
    targetDayMap: TargetDayMap,
    overdueTasks: DoneOverdueTask[] = [],
  ): HTMLElement {
    const tableWrapper = this.createTableWrapper();
    const table = this.createTaskTable();
    tableWrapper.appendChild(table);
    const thead = this.createTHeadTag();
    table.appendChild(thead);
    const tbody = this.createTableBody();
    table.appendChild(tbody);
    this.insertTasks(
      tasks,
      tbody,
      DateHelper.todayDate,
      DateHelper.yesterdayDate,
    );
    this.insertOverdueTasks(overdueTasks, tbody);
    return tableWrapper;
  }

  insertTasks(
    tasks: DoneTask[],
    tbody: HTMLElement,
    today: Date,
    yesterday: Date,
  ): void {
    tasks.forEach(task => {
      const row = document.createElement('tr');
      const currentTask = new DoneTask(task);
      currentTask.insertRowElements(row);
      tbody.appendChild(row);
    });
  }

  insertOverdueTasks(
    overdueTasks: DoneOverdueTask[],
    tbody: HTMLElement,
  ): void {
    overdueTasks
      .sort((a, b) => {
        if (a.dateKey === b.dateKey) {
          return a.task.normalizeGroup().localeCompare(b.task.normalizeGroup());
        }
        return a.dateKey.localeCompare(b.dateKey);
      })
      .forEach(overdue => {
        const task = new DoneTask(overdue.task);
        const row = document.createElement('tr');
        row.setAttribute('data-overdue', 'true');

        const groupTd = document.createElement('td');
        groupTd.appendChild(task.groupChip);
        row.appendChild(groupTd);

        const taskNameTd = document.createElement('td');
        taskNameTd.className = 'task-name';
        taskNameTd.appendChild(task.taskNameElement);
        row.appendChild(taskNameTd);

        const timeTd = document.createElement('td');
        timeTd.textContent = task.timeLabel;
        row.appendChild(timeTd);

        const dateTd = document.createElement('td');
        dateTd.textContent = `未完了日: ${overdue.dateKey}`;
        row.appendChild(dateTd);

        const statusTd = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = 'chip chip-status-todo';
        statusSpan.textContent = '未実施';
        statusTd.appendChild(statusSpan);
        row.appendChild(statusTd);

        const actionTd = document.createElement('td');
        const actionContainer = document.createElement('div');
        actionContainer.className = 'table-actions';

        const completeBtn = document.createElement('button');
        completeBtn.className = 'table-btn table-btn-primary';
        completeBtn.textContent =
          task.skipCalendarOnComplete === true ? '完了' : '追加';
        completeBtn.setAttribute('data-task-action', 'complete');
        completeBtn.setAttribute('data-task-id', task.id);
        completeBtn.setAttribute('data-task-date', overdue.dateKey);
        completeBtn.setAttribute('data-task-overdue', 'true');
        actionContainer.appendChild(completeBtn);

        const secondaryBtn = document.createElement('button');
        secondaryBtn.className = task.specificDate
          ? 'table-btn table-btn-danger'
          : 'table-btn';
        secondaryBtn.textContent = task.specificDate ? '削除' : 'キャンセル';
        secondaryBtn.setAttribute(
          'data-task-action',
          task.specificDate ? 'delete' : 'cancel',
        );
        secondaryBtn.setAttribute('data-task-id', task.id);
        secondaryBtn.setAttribute('data-task-date', overdue.dateKey);
        secondaryBtn.setAttribute('data-task-overdue', 'true');
        actionContainer.appendChild(secondaryBtn);

        actionTd.appendChild(actionContainer);
        row.appendChild(actionTd);

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
