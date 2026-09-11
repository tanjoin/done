import DateHelper from './date-helper';
import DoneTask from './done-task';
import type {DoneOverdueTask} from './types';
import TaskRepository from './task-repository';

export default class SortManager {
  private _column: string | null = null;
  private _ascending: boolean = true;

  updateSortState(columnName: string): void {
    if (this._column === columnName) {
      this._ascending = !this._ascending;
    } else {
      this._column = columnName;
      this._ascending = true;
    }
  }

  handleSort(
    columnName: string,
    taskRepository: TaskRepository,
    overdueTasks: DoneOverdueTask[] = [],
  ): void {
    this.updateSortState(columnName);
    this.sortTasks(taskRepository.tasks);
    if (overdueTasks.length > 0) {
      this.sortOverdueTasks(overdueTasks);
    }
  }

  sortOverdueTasks(overdueTasks: DoneOverdueTask[]): void {
    const col = this._column;
    if (overdueTasks.length === 0) return;

    if (!col) {
      overdueTasks.sort((a, b) => {
        if (a.dateKey === b.dateKey) {
          return a.task.normalizeGroup().localeCompare(b.task.normalizeGroup());
        }
        return a.dateKey.localeCompare(b.dateKey);
      });
      return;
    }

    const ascMult = this._ascending ? 1 : -1;
    const TODAY = DateHelper.today;

    overdueTasks.sort((a, b) => {
      const taskA = a.task;
      const taskB = b.task;
      let valA = '';
      let valB = '';

      switch (col) {
        case 'group':
          valA = taskA.group || '';
          valB = taskB.group || '';
          break;
        case 'task':
          valA = taskA.text || '';
          valB = taskB.text || '';
          break;
        case 'time':
          valA = taskA.startTime || '';
          valB = taskB.startTime || '';
          break;
        case 'date':
          valA = a.dateKey;
          valB = b.dateKey;
          break;
        case 'status':
          valA = taskA.history && taskA.history[TODAY] ? taskA.history[TODAY] : '';
          valB = taskB.history && taskB.history[TODAY] ? taskB.history[TODAY] : '';
          break;
        default:
          return 0;
      }

      if (valA < valB) return -1 * ascMult;
      if (valA > valB) return 1 * ascMult;
      return 0;
    });
  }

  sortTasks(tasks: DoneTask[]): void {
    const col = this._column;
    if (!col) return;

    const ascMult = this._ascending ? 1 : -1;
    const TODAY = DateHelper.today;

    tasks.sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (col) {
        case 'group':
          valA = a.group || '';
          valB = b.group || '';
          break;
        case 'task':
          valA = a.text || ''; // タスク名は `text` プロパティ
          valB = b.text || '';
          break;
        case 'time':
          // テキストベースでのシンプルな文字列ソートに変更
          valA = a.startTime || '';
          valB = b.startTime || '';
          break;
        case 'date':
          valA = this.getScheduleSortValue(a);
          valB = this.getScheduleSortValue(b);
          break;
        case 'status':
          valA = a.history && a.history[TODAY] ? a.history[TODAY] : '';
          valB = b.history && b.history[TODAY] ? b.history[TODAY] : '';
          break;
        default:
          return 0;
      }

      if (valA < valB) return -1 * ascMult;
      if (valA > valB) return 1 * ascMult;
      return 0;
    });
  }

  getScheduleSortValue(task: DoneTask): string {
    if (task.specificDate) {
      return task.specificDate;
    }
    if (task.daysOfWeek && task.daysOfWeek.length) {
      return 'W-' + task.daysOfWeek.join(',');
    }
    if (task.daysOfMonth && task.daysOfMonth.length) {
      return (
        'M-' + task.daysOfMonth.map(n => String(n).padStart(2, '0')).join(',')
      );
    }
    return 'Daily';
  }
}
