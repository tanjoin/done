import './style.css';
import {
  DoneSwitchViewMode,
  DoneTheme,
  TargetDayMap,
  DoneGroups as DoneGroups,
  DoneOverdueTask,
} from './types';
import DoneTask from './done-task';
import Footer from './footer';
import Header from './header';
import IndexSwitchViewMode from './index-switch-view-mode';
import IndexFilterControls from './index-filter-controls';
import IndexCalendarEvent from './index-calendar-event';
import LocalStorageManager from './local-storage-manager';
import NotificationManager from './notification-manager';
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

  private findTaskIndexById(taskId: string): number {
    return this._taskRepository.tasks.findIndex(task => task.id === taskId);
  }

  private parseDateKey(dateKey: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return null;
    }
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  private collectOverdueTasks(task: DoneTask): DoneOverdueTask[] {
    const referenceDate = this.parseDateKey(
      LocalStorageManager.overdueReferenceDate,
    );
    if (!referenceDate) {
      return [];
    }

    const yesterday = new Date();
    yesterday.setHours(12, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);

    if (referenceDate > yesterday) {
      return [];
    }

    const overdueTasks: DoneOverdueTask[] = [];
    const cursor = new Date(referenceDate);
    let guard = 0;
    while (cursor <= yesterday && guard < 370) {
      const dateKey = task.toKebabCase(cursor);
      if (!task.history[dateKey] && task.isTaskScheduledOnDate(cursor)) {
        overdueTasks.push({task, dateKey});
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }

    const todayDate = DateHelper.todayDate;
    const todayKey = task.toKebabCase(todayDate);
    const timeCheck = task.timeCheck();
    const alreadyAddedToday = overdueTasks.some(
      item => item.dateKey === todayKey,
    );
    if (
      !alreadyAddedToday &&
      !task.history[todayKey] &&
      task.isTaskScheduledOnDate(todayDate) &&
      !timeCheck.valid &&
      !timeCheck.ready
    ) {
      overdueTasks.push({task, dateKey: todayKey});
    }

    return overdueTasks;
  }

  private executeTask(
    taskId: string,
    isCancel: boolean,
    targetDateKey = DateHelper.today,
  ): void {
    const taskIndex = this.findTaskIndexById(taskId);
    if (taskIndex < 0) {
      return;
    }
    const task = this._taskRepository.tasks[taskIndex]!;

    task.history[targetDateKey] = isCancel ? 'cancelled' : 'completed';
    this._taskRepository.saveTasks();
    this.renderCards();

    const calendarTask = new DoneTask(task);
    const skipCalendarOnComplete = calendarTask.skipCalendarOnComplete === true;
    const shouldSkipCalendar =
      isCancel === true || skipCalendarOnComplete === true;
    if (shouldSkipCalendar) {
      return;
    }
    IndexCalendarEvent.open(calendarTask, isCancel);
  }

  private undoTask(taskId: string): void {
    const taskIndex = this.findTaskIndexById(taskId);
    if (taskIndex < 0) {
      return;
    }

    const TODAY = DateHelper.today;
    if (this._taskRepository.tasks[taskIndex]!.history[TODAY]) {
      delete this._taskRepository.tasks[taskIndex]!.history[TODAY];
      this._taskRepository.saveTasks();
      this.renderCards();
    }
  }

  private deleteTask(taskId: string): void {
    if (!confirm('この一時的タスクをリストから完全に削除しますか？')) {
      return;
    }

    this._taskRepository.tasks = this._taskRepository.tasks.filter(
      task => task.id !== taskId,
    );
    this._taskRepository.saveTasks();
    this.renderCards();
  }

  private handleTaskAction(
    action: string,
    taskId: string,
    targetDateKey?: string,
  ): void {
    if (action === 'complete') {
      this.executeTask(taskId, false, targetDateKey);
      return;
    }
    if (action === 'cancel') {
      this.executeTask(taskId, true, targetDateKey);
      return;
    }
    if (action === 'undo') {
      this.undoTask(taskId);
      return;
    }
    if (action === 'delete') {
      this.deleteTask(taskId);
    }
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
    const overdueGroups: Record<string, DoneOverdueTask[]> = {};

    const forceShowOverdue = LocalStorageManager.filterForceShowOverdue;

    this._taskRepository.tasks.forEach((task: DoneTask) => {
      task = new DoneTask(task);
      if (forceShowOverdue) {
        const overdueTasks = this.collectOverdueTasks(task);
        if (overdueTasks.length > 0) {
          const overdueGroup = task.normalizeGroup();
          if (!overdueGroups[overdueGroup]) {
            overdueGroups[overdueGroup] = [];
          }
          overdueGroups[overdueGroup]?.push(...overdueTasks);
        }
      }

      const isTargetDay = task.shouldShowTask();
      targetDayMap[task.id] = isTargetDay;
      // 該当日でないタスクを非表示にする設定が有効で、かつ該当日でない場合はスキップ
      if (!isTargetDay && LocalStorageManager.filterHideNonTargetDay) {
        return;
      }
      const todayStatus = task.history[TODAY];
      const timeCheck = task.timeCheck();
      // 完了済みタスクを非表示にする設定が有効で、かつ完了済みの場合はスキップ
      if (
        todayStatus === 'completed' &&
        LocalStorageManager.filterHideCompleted
      ) {
        return;
      }
      // キャンセル済みタスクを非表示にする設定が有効で、かつキャンセル済みの場合はスキップ
      if (
        todayStatus === 'cancelled' &&
        LocalStorageManager.filterHideCancelled
      ) {
        return;
      }
      // 時間外のタスクを非表示にする設定が有効で、かつ時間外であり、かつリマインドが設定されていない場合は非表示
      if (
        isTargetDay &&
        !todayStatus &&
        !timeCheck.valid &&
        LocalStorageManager.filterHideOutOfTime &&
        !task.hasExplicitReminderLead()
      ) {
        return;
      }

      filteredTasks.push(task);
      const groupName = task.normalizeGroup();
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName]?.push(task);
    });

    const overdueCount = Object.values(overdueGroups).reduce(
      (sum, items) => sum + items.length,
      0,
    );
    if (filteredTasks.length === 0 && overdueCount === 0) {
      container.innerHTML =
        '<p class="empty-task-msg">表示するタスクがありません。</p>';
      return;
    }

    const currentViewMode = LocalStorageManager.taskViewMode;
    document.body.classList.toggle(
      'table-view-mode',
      currentViewMode === 'table',
    );
    if (currentViewMode === 'table') {
      const overdueTasks = Object.values(overdueGroups)
        .flat()
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      this._tableManager.renderTableView(
        container,
        filteredTasks,
        targetDayMap,
        overdueTasks,
      );
      // SortManager.updateHeaderUI();
      return;
    }

    const groupNames = Array.from(
      new Set([...Object.keys(groups), ...Object.keys(overdueGroups)]),
    );

    for (const groupName of groupNames) {
      const groupedTasks = groups[groupName] || [];
      const overdueTasks = overdueGroups[groupName] || [];
      groupedTasks.sort((a, b) => {
        const countA = Object.values(a.history || {}).filter(
          status => status === 'completed',
        ).length;
        const countB = Object.values(b.history || {}).filter(
          status => status === 'completed',
        ).length;
        return countB - countA;
      });

      const groupSection = document.createElement('div');
      groupSection.className = 'group-section';

      const title = document.createElement('h3');
      title.className = 'group-title';
      title.innerText = groupName;
      groupSection.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'grid';

      groupedTasks.forEach(task => {
        const isTargetDay = targetDayMap[task.id] === true;
        const todayStatus = task.history[TODAY];
        const yesterdayStatus = task.history[YESTERDAY];
        const timeCheck = task.timeCheck();
        const statusInfo = task.getTaskStatusInfo(
          todayStatus,
          timeCheck,
          isTargetDay,
        );

        const totalCompleted = Object.values(task.history || {}).filter(
          status => status === 'completed',
        ).length;

        const card = document.createElement('div');
        card.className = 'card';
        if (todayStatus) {
          card.setAttribute('data-done', 'true');
        } else if (!timeCheck.valid) {
          card.setAttribute('data-out-of-time', 'true');
        }

        if (todayStatus) {
          const undoButton = document.createElement('button');
          undoButton.className = 'btn-undo';
          undoButton.textContent = '✕';
          undoButton.setAttribute('data-task-action', 'undo');
          undoButton.setAttribute('data-task-id', task.id);
          card.appendChild(undoButton);
        }

        const content = document.createElement('div');

        const cardTitle = document.createElement('h4');
        cardTitle.className = 'card-title';
        cardTitle.textContent = task.text;
        content.appendChild(cardTitle);

        const badge = document.createElement('span');
        badge.className = 'status-badge';
        if (todayStatus === 'completed') {
          badge.classList.add('status-completed');
        } else if (todayStatus === 'cancelled') {
          badge.classList.add('status-cancelled');
        } else if (statusInfo.className === 'chip-status-reminder') {
          badge.classList.add('status-reminder');
        }
        badge.textContent = statusInfo.label;
        content.appendChild(badge);

        if (task.startTime || task.endTime) {
          const timeInfo = document.createElement('div');
          const startNorm = DateHelper.normalizeTime(task.startTime || '00:00');
          const endNorm = DateHelper.normalizeTime(task.endTime || '23:59');
          const displayEnd =
            startNorm > endNorm
              ? `翌${task.endTime || '23:59'}`
              : task.endTime || '23:59';
          const modeLabel = task.strictMode ? ' (厳格)' : '';
          timeInfo.className = 'time-restriction';
          timeInfo.textContent = `${task.startTime || '00:00'} 〜 ${displayEnd}${modeLabel}`;
          content.appendChild(timeInfo);
        }

        if (task.description) {
          const description = document.createElement('div');
          description.className = 'task-description';
          description.textContent = task.description;
          content.appendChild(description);
        }

        if (task.link) {
          const link = document.createElement('a');
          link.href = task.link;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'task-link';
          link.textContent = '関連リンク ↗';
          content.appendChild(link);
        }

        const yesterdayInfo = document.createElement('div');
        yesterdayInfo.className = 'history-status';
        if (yesterdayStatus === 'completed') {
          yesterdayInfo.textContent = '昨日: 完了';
        } else if (yesterdayStatus === 'cancelled') {
          yesterdayInfo.textContent = '昨日: キャンセル';
        } else {
          yesterdayInfo.textContent = '昨日: 履歴なし';
        }
        content.appendChild(yesterdayInfo);

        card.appendChild(content);

        const actionContainer = document.createElement('div');
        actionContainer.className = 'card-actions';

        const mainButton = document.createElement('button');
        mainButton.className = 'btn btn-action';
        mainButton.textContent =
          task.skipCalendarOnComplete === true ? '完了' : '追加';
        mainButton.setAttribute('data-task-action', 'complete');
        mainButton.setAttribute('data-task-id', task.id);
        mainButton.setAttribute('data-task-date', TODAY);

        const isStrict = task.strictMode === true;
        if (statusInfo.locked || (!timeCheck.valid && isStrict)) {
          mainButton.disabled = true;
        }

        actionContainer.appendChild(mainButton);

        const secondaryButton = document.createElement('button');
        secondaryButton.className = task.specificDate
          ? 'btn'
          : 'btn btn-cancel';
        secondaryButton.textContent = task.specificDate ? '削除' : 'キャンセル';
        secondaryButton.setAttribute(
          'data-task-action',
          task.specificDate ? 'delete' : 'cancel',
        );
        secondaryButton.setAttribute('data-task-id', task.id);
        secondaryButton.setAttribute('data-task-date', TODAY);
        if (task.specificDate) {
          secondaryButton.style.backgroundColor = '#ef4444';
          secondaryButton.style.color = '#ffffff';
          secondaryButton.style.flex = '1';
        }
        if (statusInfo.locked) {
          secondaryButton.disabled = true;
        }

        actionContainer.appendChild(secondaryButton);
        card.appendChild(actionContainer);

        const footer = document.createElement('div');
        footer.className = 'card-footer';
        footer.textContent = `累計実績: ${totalCompleted} 回`;
        card.appendChild(footer);

        grid.appendChild(card);
      });

      overdueTasks
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
        .forEach(overdue => {
          const task = overdue.task;

          const totalCompleted = Object.values(task.history || {}).filter(
            status => status === 'completed',
          ).length;

          const card = document.createElement('div');
          card.className = 'card';
          card.setAttribute('data-overdue', 'true');

          const content = document.createElement('div');

          const overdueDate = document.createElement('div');
          overdueDate.className = 'overdue-date-label';
          overdueDate.textContent = `未完了日: ${overdue.dateKey}`;
          content.appendChild(overdueDate);

          const cardTitle = document.createElement('h4');
          cardTitle.className = 'card-title';
          cardTitle.textContent = task.text;
          content.appendChild(cardTitle);

          const badge = document.createElement('span');
          badge.className = 'status-badge';
          badge.textContent = '未実施';
          content.appendChild(badge);

          if (task.startTime || task.endTime) {
            const timeInfo = document.createElement('div');
            const startNorm = DateHelper.normalizeTime(
              task.startTime || '00:00',
            );
            const endNorm = DateHelper.normalizeTime(task.endTime || '23:59');
            const displayEnd =
              startNorm > endNorm
                ? `翌${task.endTime || '23:59'}`
                : task.endTime || '23:59';
            const modeLabel = task.strictMode ? ' (厳格)' : '';
            timeInfo.className = 'time-restriction';
            timeInfo.textContent = `${task.startTime || '00:00'} 〜 ${displayEnd}${modeLabel}`;
            content.appendChild(timeInfo);
          }

          if (task.description) {
            const description = document.createElement('div');
            description.className = 'task-description';
            description.textContent = task.description;
            content.appendChild(description);
          }

          if (task.link) {
            const link = document.createElement('a');
            link.href = task.link;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'task-link';
            link.textContent = '関連リンク ↗';
            content.appendChild(link);
          }

          card.appendChild(content);

          const actionContainer = document.createElement('div');
          actionContainer.className = 'card-actions';

          const mainButton = document.createElement('button');
          mainButton.className = 'btn btn-action';
          mainButton.textContent =
            task.skipCalendarOnComplete === true ? '完了' : '追加';
          mainButton.setAttribute('data-task-action', 'complete');
          mainButton.setAttribute('data-task-id', task.id);
          mainButton.setAttribute('data-task-date', overdue.dateKey);
          mainButton.setAttribute('data-task-overdue', 'true');
          actionContainer.appendChild(mainButton);

          const secondaryButton = document.createElement('button');
          secondaryButton.className = task.specificDate
            ? 'btn'
            : 'btn btn-cancel';
          secondaryButton.textContent = task.specificDate
            ? '削除'
            : 'キャンセル';
          secondaryButton.setAttribute(
            'data-task-action',
            task.specificDate ? 'delete' : 'cancel',
          );
          secondaryButton.setAttribute('data-task-id', task.id);
          secondaryButton.setAttribute('data-task-date', overdue.dateKey);
          secondaryButton.setAttribute('data-task-overdue', 'true');
          if (task.specificDate) {
            secondaryButton.style.backgroundColor = '#ef4444';
            secondaryButton.style.color = '#ffffff';
            secondaryButton.style.flex = '1';
          }
          actionContainer.appendChild(secondaryButton);

          card.appendChild(actionContainer);

          const footer = document.createElement('div');
          footer.className = 'card-footer';
          footer.textContent = `累計実績: ${totalCompleted} 回`;
          card.appendChild(footer);

          grid.appendChild(card);
        });

      groupSection.appendChild(grid);
      container.appendChild(groupSection);
    }
  }

  applyTheme(): void {
    const savedTheme: DoneTheme = LocalStorageManager.appTheme;
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
      taskContainer.addEventListener('click', event => {
        if (!(event.target instanceof HTMLElement)) {
          return;
        }

        const actionButton = event.target.closest(
          'button[data-task-action]',
        ) as HTMLButtonElement | null;
        if (actionButton) {
          const action = actionButton.getAttribute('data-task-action');
          const taskId = actionButton.getAttribute('data-task-id');
          const targetDate =
            actionButton.getAttribute('data-task-date') || undefined;
          if (action && taskId) {
            this.handleTaskAction(action, taskId, targetDate);
          }
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
      const banner = document.getElementById('notificationBanner');
      NotificationManager.syncBannerVisibility(banner);
    }
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
      let bodyText = `「${task.text}」が実施可能な時間になりました。${descText}`;
      if (candidate.leadMinutes !== null && candidate.leadMinutes > 0) {
        bodyText = `「${task.text}」の ${candidate.leadMinutes} 分前です（開始 ${candidate.startNorm}）。${descText}`;
      }

      NotificationManager.notifyTask(task, bodyText);

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

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('.container');
  if (container) {
    const header = document.createElement(Header.NAME) as Header;
    header.active = 'index';
    container.appendChild(header);

    const requestNotification = document.createElement(
      RequestNotification.NAME,
    ) as RequestNotification;
    container.appendChild(requestNotification);

    const index = document.createElement(Index.NAME) as Index;
    container.appendChild(index);
    await index.init();

    document.addEventListener(
      IndexSwitchViewMode.EVENT_VIEW_MODE_CHANGE,
      (event: Event) => {
        const customEvent = event as CustomEvent<{mode: DoneSwitchViewMode}>;
        index.mode = customEvent.detail.mode;
        console.log('View mode changed to:', index.mode);
        index.renderCards();
      },
    );

    document.addEventListener(
      IndexFilterControls.EVENT_FILTER_CHANGE,
      (event: Event) => {
        const customEvent = event as CustomEvent<{
          filter: string;
          isHidden: boolean;
        }>;
        console.log(
          'Filter changed:',
          customEvent.detail.filter,
          customEvent.detail.isHidden,
        );
        index.renderCards();
      },
    );

    const footer = document.createElement(Footer.NAME) as Footer;
    container.appendChild(footer);
  }
});
