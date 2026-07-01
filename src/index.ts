import './style.css';
import { DoneSwitchViewMode, DoneTheme, TargetDayMap, DoneGroups as DoneGroups } from './types';
import DoneTask from './done-task';
import Footer from './footer';
import Header from './header';
import IndexSwitchViewMode from './index-switch-view-mode';
import IndexFilterControls from './index-filter-controls';
import LocalStorageManager from './local-storage-manager';
import RequestNotification from './request-notification';
import TaskRepository from './task-repository';
import DateHelper from './date-helper';
import SortManager from './sort-manager';
import TableManager from './table-manager';

class Index extends HTMLElement {

  private _mode: DoneSwitchViewMode = 'card';
  private _theme: DoneTheme = 'system';
  private _taskRepository: TaskRepository = new TaskRepository();
  private _sortManager: SortManager = new SortManager();
  private _tableManager: TableManager = new TableManager();

  static get NAME(): string {
    return 'done-index';
  }

  get mode(): DoneSwitchViewMode {
    return this._mode;
  }

  set mode(value: DoneSwitchViewMode) {
    this._mode = value;
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    this.innerHTML = `
      <main>
        <div class="filter-wrapper">
          ${document.createElement(IndexSwitchViewMode.NAME).outerHTML}
          ${document.createElement(IndexFilterControls.NAME).outerHTML}
        </div>
        <div id="taskContainer"></div>
      </main>
    `;
  }

  renderCards(): void {
    const container = document.getElementById('taskContainer');
    if (!container) return;
    container.innerHTML = '';

    const TODAY = DateHelper.today;
    const YESTERDAY = DateHelper.yesterday;

    // // ソート条件が設定されていれば、描画の直前にデータをソート
    // if (SortState.column) {
    //     SortManager.sortTasks();
    // }

    const filteredTasks: DoneTask[] = [];
    const targetDayMap: TargetDayMap = {};
    const groups: DoneGroups = {};

    this._taskRepository.tasks.forEach((task: DoneTask) => {
      task = new DoneTask(task);
      const isTargetDay = task.shouldShowTask();
      targetDayMap[task.id] = isTargetDay;
      // 該当日でないタスクを非表示にする設定が有効で、かつ該当日でない場合はスキップ
      if (!isTargetDay && LocalStorageManager.filterHideNonTargetDay) {
        return;
      }
      const todayStatus = task.history[TODAY];
      const timeCheck = task.timeCheck();
      // 完了済みタスクを非表示にする設定が有効で、かつ完了済みの場合はスキップ
      if (todayStatus === 'completed' && LocalStorageManager.filterHideCompleted) {
        return;
      }
      // キャンセル済みタスクを非表示にする設定が有効で、かつキャンセル済みの場合はスキップ
      if (todayStatus === 'cancelled' && LocalStorageManager.filterHideCancelled) {
        return;
      }
      // 時間外のタスクを非表示にする設定が有効で、かつ時間外であり、かつリマインドが設定されていない場合は非表示
      if (isTargetDay && !todayStatus && !timeCheck.valid && LocalStorageManager.filterHideOutOfTime && !task.hasExplicitReminderLead()) {
        return;
      }

      filteredTasks.push(task);
      if (!groups[task.normalizeGroup]) {
        groups[task.normalizeGroup] = [];
      }
      groups[task.normalizeGroup]?.push(task);
    });

    if (filteredTasks.length === 0) {
      container.innerHTML = '<p class="no-tasks-message">表示するタスクがありません。</p>';
      return;
    }

    const currentViewMode = LocalStorageManager.taskViewMode;
    document.body.classList.toggle("table-view-mode", currentViewMode === 'table');
    if (currentViewMode === 'table') {
      this._tableManager.renderTableView(container, filteredTasks, targetDayMap);
      // SortManager.updateHeaderUI();
      return;
    }

    for (const groupName in groups) {

    }
  }

  applyTheme(): void {
    let savedTheme: DoneTheme = LocalStorageManager.appTheme;
    const root = document.documentElement;
    if (savedTheme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', savedTheme);
    }
    this._theme = savedTheme;
  }

  setupPageSpecifics(): void {
    const taskContainer = document.getElementById('taskContainer');
    if (taskContainer) {
      taskContainer.addEventListener('click', (event) => {
        if (!(event.target instanceof HTMLElement)) {
          return;
        }
        const th = event.target.closest('th[data-sort-col]');
        if (th) {
          const colName = th.getAttribute('data-sort-col');
          if (colName) {
            this._sortManager.handleSort(colName, this._taskRepository);
            this.renderCards();
          }
        }
      });

      this.renderCards();
      this.checkNotificationPermission();
    }

    // TODO: updateNotificationTestUI();

    // TODO: 
  }

  checkNotificationPermission(): void {
    const banner = document.getElementById('notificationBanner');
    if (!banner) return;
    if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
      banner.style.display = 'none';
      return;
    }
    banner.style.display = (Notification.permission === 'default') ? 'flex' : 'none';
  }

  async loadTasks(): Promise<void> {
    await this._taskRepository.loadTasks();
  }

  registerNotification(): void {
    if (Notification.permission !== 'granted') {
      return;
    }
    const now = new Date();
    let isUpdated = false;
    this._taskRepository.tasks.forEach((task: DoneTask) => {
      if (!task.startTime) {
        return;
      }
      const candidate = new DoneTask(task).toNotificationCandidate(now);
      if (!candidate) {
        return;
      }

      const descText = task.description ? `\n${task.description}` : '';
      let bodyText = `「${task.text}」が実行可能な時間になりました。${descText}`;
      if (candidate.leadMinutes !== null && candidate.leadMinutes > 0) {
        bodyText = `「${task.text}」の${candidate.leadMinutes}分前です（開始：${task.startTime}）。${descText}`;
      }

      const notification = new Notification(`[${task.normalizeGroup}] ${task.text} の時間です`, {
        body: bodyText,
        icon: "icon.png",
        badge: "badge.png"
      });

      notification.onclick = (event) => {
        event.preventDefault();
        const targetUrl = new URL('/done', window.location.href).href;
        window.open(targetUrl, '_blank');
      };

      // TODO: Notification.play();

      task.notifiedDate = candidate.scheduleDateKey;
      isUpdated = true;
    });

    if (isUpdated) {
      this._taskRepository.saveTasks();
    }
  }

  async init(): Promise<void> {
    this.applyTheme();
    await this.loadTasks();
    this.setupPageSpecifics();

    this.registerNotification();
    setInterval(() => {
      this.registerNotification();
      this.renderCards();
      console.log('Periodic render of cards');
    }, 60 * 1000);
  }

  async reset(): Promise<void> {
    this._taskRepository.tasks = null;
    await this.loadTasks();
  }
}

if (!customElements.get(Index.NAME)) {
  customElements.define(Index.NAME, Index);
}

function requestPermission(): void {
  if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
    alert('このブラウザは通知をサポートしていません。');
    return;
  }

  Notification.requestPermission().then(permission => {
    RequestNotification.checkNotificationPermission();
    // 設定画面で必要になる 
    // updateNotificationTestUI();
    if (permission === 'granted') {
      alert('プッシュ通知が有効になりました！');
    }
  });
}
(window as any).requestPermission = requestPermission;

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('.container');
  if (container) {
    const header = document.createElement(Header.NAME) as Header;
    header.active = 'index';
    container.appendChild(header);

    const requestNotification = document.createElement(RequestNotification.NAME) as RequestNotification;
    container.appendChild(requestNotification);

    const index = document.createElement(Index.NAME) as Index;
    container.appendChild(index);
    await index.init();

    document.addEventListener(IndexSwitchViewMode.EVENT_VIEW_MODE_CHANGE, (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: DoneSwitchViewMode }>;
      index.mode = customEvent.detail.mode;
      console.log('View mode changed to:', index.mode);
      index.renderCards();
    });

    document.addEventListener(IndexFilterControls.EVENT_FILTER_CHANGE, (event: Event) => {
      const customEvent = event as CustomEvent<{ filter: string, value: boolean }>;
      console.log('Filter changed:', customEvent.detail.filter, customEvent.detail.value);
      index.renderCards();
    });

    const footer = document.createElement(Footer.NAME) as Footer;
    container.appendChild(footer);
  }
});
