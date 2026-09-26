import './style.css';
import {
  DoneSwitchViewMode,
  DoneTheme,
  TargetDayMap,
  DoneGroups as DoneGroups,
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
import SessionManager from './session-manager';
import DateHelper from './date-helper';
import SortManager from './sort-manager';
import TableManager from './table-manager';
import {
  addEventToDoneCalendarFromTask,
  updateTodoEventDescription,
  updateTodoEventColor,
} from './google-calendar-service';
import {
  hasValidGoogleToken,
  isGoogleReloginRequiredError,
  handleGoogleAuthRedirect,
} from './google-auth';
import GoogleAuthAlertController, {
  renderGoogleAuthAlert,
} from './google-auth-alert';

class Index extends HTMLElement {
  private static readonly PAGE_ACTIVATION_REFRESH_COOLDOWN_MS = 3 * 60 * 1000;
  private _mode: DoneSwitchViewMode = 'card';
  private _theme: DoneTheme = 'system';
  private _taskRepository: TaskRepository = new TaskRepository();
  private _sortManager: SortManager = new SortManager();
  private _tableManager: TableManager = new TableManager();
  private _isLoading = false;
  private _cloudRefreshPromises = new Map<
    'all' | 'drive' | 'calendar',
    Promise<void>
  >();
  private _activeCloudRefreshes = 0;
  private _lastPageActivationRefreshAt = 0;
  private _googleAuthAlertController: GoogleAuthAlertController | null = null;
  private _taskActionVersions = new Map<string, number>();

  private static readonly TODO_CHECKBOX_LINE_RE = /^\s*-\s*\[( |x|X)\]\s*(.*)$/;

  private notifyGoogleReloginRequired(
    message = 'Google認証の有効期限が切れました。再ログインするにはここを押してください。',
  ): void {
    if (!LocalStorageManager.googleClientIdEncrypted.trim()) {
      return;
    }
    this._googleAuthAlertController?.show(message, true);
  }

  private openGoogleLogin(): void {
    const loginButton = document.querySelector(
      '#googleHeaderLoginBtn',
    ) as HTMLButtonElement | null;
    loginButton?.click();
  }

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

  private restoreFailedTaskAction(
    taskId: string,
    targetDateKey: string,
    previousStatus: 'completed' | 'cancelled' | undefined,
    currentStatus: 'completed' | 'cancelled',
    version: number,
  ): void {
    const actionKey = `${taskId}:${targetDateKey}`;
    const task = this._taskRepository.tasks.find(item => item.id === taskId);
    if (
      this._taskActionVersions.get(actionKey) !== version ||
      !task ||
      task.history[targetDateKey] !== currentStatus
    ) {
      return;
    }
    if (previousStatus) {
      task.history[targetDateKey] = previousStatus;
    } else {
      delete task.history[targetDateKey];
    }
    this._taskRepository.recordTaskMutation();
    if (!task.isGoogleTodoTask()) {
      this._taskRepository.saveTasks();
    }
    this.renderCards();
  }

  private runAfterNextPaint(callback: () => void): void {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => window.setTimeout(callback, 0));
      return;
    }
    window.setTimeout(callback, 0);
  }

  private updatePressedTaskItem(
    actionButton: HTMLButtonElement | undefined,
    task: DoneTask,
    isUndo: boolean,
    hideRow = false,
  ): void {
    if (!actionButton) {
      return;
    }

    const card = actionButton.closest('.card');
    const row = actionButton.closest('tr');
    const item = card || row;
    if (!item) {
      return;
    }

    const statusInfo = task.statusInfo;
    if (isUndo) {
      item.removeAttribute('data-done');
    } else {
      item.setAttribute('data-done', 'true');
      item.removeAttribute('data-overdue');
    }

    if (card) {
      const badge = card.querySelector('.status-badge');
      if (badge) {
        badge.className = 'status-badge';
        if (statusInfo.className === 'chip-status-done') {
          badge.classList.add('status-completed');
        } else if (statusInfo.className === 'chip-status-cancel') {
          badge.classList.add('status-cancelled');
        } else if (statusInfo.className === 'chip-status-todo') {
          badge.classList.add('status-todo');
        } else if (statusInfo.className === 'chip-status-reminder') {
          badge.classList.add('status-reminder');
        }
        badge.textContent = statusInfo.label;
      }
    } else if (row) {
      const status = row.querySelector('td:nth-child(5) .chip');
      if (status) {
        status.className = `chip ${statusInfo.className}`;
        status.textContent = statusInfo.label;
      }
    }

    if (row && hideRow) {
      row.remove();
    }
  }

  private executeTask(
    taskId: string,
    isCancel: boolean,
    primaryAction: 'complete' | 'add' | 'append' = 'complete',
    targetDateKey = DateHelper.today,
    actionButton?: HTMLButtonElement,
  ): void {
    const taskIndex = this.findTaskIndexById(taskId);
    if (taskIndex < 0) {
      return;
    }
    const task = this._taskRepository.tasks[taskIndex]!;

    const previousStatus = task.history[targetDateKey];
    const currentStatus = isCancel ? 'cancelled' : 'completed';
    const actionKey = `${taskId}:${targetDateKey}`;
    const version = (this._taskActionVersions.get(actionKey) || 0) + 1;
    this._taskActionVersions.set(actionKey, version);
    task.history[targetDateKey] = currentStatus;
    this._taskRepository.recordTaskMutation();
    const calendarTask = new DoneTask(task);
    this.updatePressedTaskItem(
      actionButton,
      calendarTask,
      false,
      isCancel
        ? LocalStorageManager.filterHideCancelled
        : LocalStorageManager.filterHideCompleted,
    );

    if (!calendarTask.isGoogleTodoTask()) {
      this.runAfterNextPaint(() => {
        void this._taskRepository.saveTasksWithSync().catch(error => {
          this.restoreFailedTaskAction(
            taskId,
            targetDateKey,
            previousStatus,
            currentStatus,
            version,
          );
          if (isGoogleReloginRequiredError(error)) {
            this.notifyGoogleReloginRequired();
            return;
          }
          alert('Google Drive への同期に失敗しました。');
        });
      });
    }

    void (async () => {
      const googleEnabled = hasValidGoogleToken();

      if (!googleEnabled) {
        if (!isCancel && calendarTask.skipCalendarOnComplete !== true) {
          await IndexCalendarEvent.open(calendarTask, false);
        }
        return;
      }

      if (isCancel) {
        if (calendarTask.isGoogleTodoTask()) {
          void updateTodoEventColor(calendarTask, '4').catch(error => {
            this.restoreFailedTaskAction(
              taskId,
              targetDateKey,
              previousStatus,
              currentStatus,
              version,
            );
            if (isGoogleReloginRequiredError(error)) {
              this.notifyGoogleReloginRequired();
              return;
            }
            alert('TODOカレンダーのキャンセル色更新に失敗しました。');
          });
        }
        return;
      }

      if (calendarTask.isGoogleTodoTask()) {
        void updateTodoEventColor(calendarTask, '8').catch(error => {
          this.restoreFailedTaskAction(
            taskId,
            targetDateKey,
            previousStatus,
            currentStatus,
            version,
          );
          if (isGoogleReloginRequiredError(error)) {
            this.notifyGoogleReloginRequired();
            return;
          }
          alert('TODOカレンダーの完了色更新に失敗しました。');
        });
        return;
      }

      if (primaryAction === 'add') {
        void addEventToDoneCalendarFromTask(calendarTask).catch(error => {
          this.restoreFailedTaskAction(
            taskId,
            targetDateKey,
            previousStatus,
            currentStatus,
            version,
          );
          if (isGoogleReloginRequiredError(error)) {
            this.notifyGoogleReloginRequired();
            return;
          }
          alert('DONEカレンダーへの追加に失敗しました。');
        });
        return;
      }

      if (primaryAction === 'append') {
        await IndexCalendarEvent.open(calendarTask, false);
      }
    })().catch(error => {
      this.restoreFailedTaskAction(
        taskId,
        targetDateKey,
        previousStatus,
        currentStatus,
        version,
      );
      if (isGoogleReloginRequiredError(error)) {
        this.notifyGoogleReloginRequired();
        return;
      }
      alert('カレンダーを開けませんでした。');
    });
  }

  private undoTask(
    taskId: string,
    targetDateKey = DateHelper.today,
    actionButton?: HTMLButtonElement,
  ): void {
    const taskIndex = this.findTaskIndexById(taskId);
    if (taskIndex < 0) {
      return;
    }

    const history = this._taskRepository.tasks[taskIndex]!.history;
    if (history[targetDateKey]) {
      const actionKey = `${taskId}:${targetDateKey}`;
      this._taskActionVersions.set(
        actionKey,
        (this._taskActionVersions.get(actionKey) || 0) + 1,
      );
      delete history[targetDateKey];
      this._taskRepository.recordTaskMutation();
      const task = new DoneTask(this._taskRepository.tasks[taskIndex]!);
      this.updatePressedTaskItem(actionButton, task, true);

      if (!task.isGoogleTodoTask()) {
        this.runAfterNextPaint(() => {
          void this._taskRepository.saveTasksWithSync().catch(error => {
            if (isGoogleReloginRequiredError(error)) {
              this.notifyGoogleReloginRequired();
              return;
            }
            alert('Google Drive への同期に失敗しました。');
          });
        });
      }
    }
  }

  private deleteTask(taskId: string): void {
    if (!confirm('この一時タスクをリストから完全に削除しますか？')) {
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
    actionButton?: HTMLButtonElement,
  ): void {
    if (action === 'complete' || action === 'add' || action === 'append') {
      this.executeTask(
        taskId,
        false,
        action as 'complete' | 'add' | 'append',
        targetDateKey,
        actionButton,
      );
      return;
    }
    if (action === 'cancel') {
      this.executeTask(taskId, true, 'complete', targetDateKey, actionButton);
      return;
    }
    if (action === 'undo') {
      this.undoTask(taskId, targetDateKey, actionButton);
      return;
    }
    if (action === 'delete') {
      this.deleteTask(taskId);
    }
  }

  private createTextWithLinks(text: string): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const anchorTagRe = /<a\b[^>]*href=(['"])(.*?)\1[^>]*>(.*?)<\/a>/gi;

    let lastIndex = 0;
    let matchedAnchor: RegExpExecArray | null = null;
    while ((matchedAnchor = anchorTagRe.exec(text)) !== null) {
      const start = matchedAnchor.index;
      if (start > lastIndex) {
        this.appendTextWithAutoLinks(fragment, text.slice(lastIndex, start));
      }

      const hrefRaw = matchedAnchor[2] || '';
      const linkTextRaw = matchedAnchor[3] || '';
      const normalizedHref = this.normalizeInlineUrl(hrefRaw);
      const linkText = this.decodeHtmlEntities(
        linkTextRaw.replace(/<[^>]+>/g, ''),
      ).trim();

      const anchor = document.createElement('a');
      anchor.href = normalizedHref;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'task-inline-link';
      anchor.textContent = linkText || normalizedHref;
      fragment.appendChild(anchor);

      lastIndex = start + matchedAnchor[0].length;
    }

    if (lastIndex < text.length) {
      this.appendTextWithAutoLinks(fragment, text.slice(lastIndex));
    }

    return fragment;
  }

  private appendTextWithAutoLinks(
    fragment: DocumentFragment,
    text: string,
  ): void {
    const urlRe = /(https?:\/\/[^\s<>"]+)/g;
    let lastIndex = 0;
    let matched: RegExpExecArray | null = null;

    while ((matched = urlRe.exec(text)) !== null) {
      const rawUrl = matched[1] || '';
      const start = matched.index;
      if (start > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, start)),
        );
      }

      let cleanedUrl = rawUrl;
      let trailing = '';
      while (/[).,!?;:'\]]$/.test(cleanedUrl)) {
        trailing = cleanedUrl.slice(-1) + trailing;
        cleanedUrl = cleanedUrl.slice(0, -1);
      }

      const normalizedHref = this.normalizeInlineUrl(cleanedUrl);
      const anchor = document.createElement('a');
      anchor.href = normalizedHref;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'task-inline-link';
      anchor.textContent = normalizedHref;
      fragment.appendChild(anchor);

      if (trailing) {
        fragment.appendChild(document.createTextNode(trailing));
      }

      lastIndex = start + rawUrl.length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  private decodeHtmlEntities(value: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  private normalizeInlineUrl(rawValue: string): string {
    let value = this.decodeHtmlEntities(rawValue).trim();

    const markdownWrapped = value.match(/\]\((https?:\/\/[^)\s]+)\)/i);
    if (markdownWrapped && markdownWrapped[1]) {
      value = markdownWrapped[1];
    }

    const firstUrl = value.match(/https?:\/\/[^\s'"<>]+/i);
    if (firstUrl && firstUrl[0]) {
      value = firstUrl[0];
    }

    try {
      const parsed = new URL(value);
      const host = parsed.hostname.toLowerCase();
      const isGoogleRedirect =
        (host === 'google.com' || host === 'www.google.com') &&
        parsed.pathname === '/url';
      if (isGoogleRedirect) {
        const target = parsed.searchParams.get('q');
        if (target) {
          const decodedTarget = this.decodeHtmlEntities(target).trim();
          const targetUrl = decodedTarget.match(/https?:\/\/[^\s'"<>]+/i);
          if (targetUrl && targetUrl[0]) {
            return targetUrl[0];
          }
          return decodedTarget;
        }
      }
      return parsed.toString();
    } catch {
      return value;
    }
  }

  private parseTodoChecklistLines(description: string): Array<{
    kind: 'check' | 'text';
    checked?: boolean;
    text: string;
  }> {
    return description.split(/\r?\n/).map(line => {
      const matched = line.match(Index.TODO_CHECKBOX_LINE_RE);
      if (!matched) {
        return {kind: 'text', text: line};
      }
      const marker = matched[1] || ' ';
      return {
        kind: 'check',
        checked: marker.toLowerCase() === 'x',
        text: matched[2] || '',
      };
    });
  }

  private updateTodoChecklistLine(
    description: string,
    checkIndex: number,
    checked: boolean,
  ): string | null {
    const lines = description.split(/\r?\n/);
    let currentCheckIndex = 0;
    const updated = lines.map(line => {
      const matched = line.match(Index.TODO_CHECKBOX_LINE_RE);
      if (!matched) {
        return line;
      }

      const nextLine =
        currentCheckIndex === checkIndex
          ? `- [${checked ? 'x' : ' '}] ${matched[2] || ''}`
          : line;
      currentCheckIndex += 1;
      return nextLine;
    });

    if (checkIndex < 0 || checkIndex >= currentCheckIndex) {
      return null;
    }
    return updated.join('\n');
  }

  private createTaskDescriptionElement(task: DoneTask): HTMLElement | null {
    const description = task.description || '';
    if (!description.trim()) {
      return null;
    }

    const parsedLines = this.parseTodoChecklistLines(description);
    const hasChecklist = parsedLines.some(line => line.kind === 'check');

    const wrapper = document.createElement('div');
    wrapper.className = 'task-description';

    // カード表示時のみ、TODOチェックリストを操作可能なチェックボックスで表示する。
    if (task.isGoogleTodoTask() && hasChecklist) {
      wrapper.classList.add('task-description-checklist');
      let checkIndex = 0;
      parsedLines.forEach(line => {
        if (line.kind === 'text') {
          const plainLine = document.createElement('div');
          plainLine.className = 'task-description-line';
          plainLine.appendChild(this.createTextWithLinks(line.text));
          wrapper.appendChild(plainLine);
          return;
        }

        const label = document.createElement('label');
        label.className = 'todo-check-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(line.checked);
        checkbox.className = 'todo-check-input';
        checkbox.setAttribute('data-todo-check-item', '1');
        checkbox.setAttribute('data-task-id', task.id);
        checkbox.setAttribute('data-check-index', String(checkIndex));

        const text = document.createElement('span');
        text.className = 'todo-check-text';
        text.appendChild(this.createTextWithLinks(line.text));
        if (line.checked) {
          text.classList.add('is-checked');
        }

        label.appendChild(checkbox);
        label.appendChild(text);
        wrapper.appendChild(label);
        checkIndex += 1;
      });
      return wrapper;
    }

    description.split(/\r?\n/).forEach(line => {
      const plainLine = document.createElement('div');
      plainLine.className = 'task-description-line';
      plainLine.appendChild(this.createTextWithLinks(line));
      wrapper.appendChild(plainLine);
    });
    return wrapper;
  }

  private createTodoLocationElement(task: DoneTask): HTMLElement | null {
    if (!task.isGoogleTodoTask()) {
      return null;
    }
    const location = task.location?.trim();
    if (!location) {
      return null;
    }

    const row = document.createElement('div');
    row.className = 'todo-location';

    const label = document.createElement('span');
    label.className = 'todo-location-label';
    label.textContent = '場所: ';
    row.appendChild(label);

    if (/^https?:\/\//i.test(location)) {
      const anchor = document.createElement('a');
      anchor.href = location;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'todo-location-link';
      anchor.textContent = location;
      row.appendChild(anchor);
    } else {
      const text = document.createElement('span');
      text.className = 'todo-location-text';
      text.appendChild(this.createTextWithLinks(location));
      row.appendChild(text);
    }

    return row;
  }

  private async handleTodoChecklistToggle(
    taskId: string,
    checkIndex: number,
    checked: boolean,
    inputEl: HTMLInputElement,
  ): Promise<void> {
    const taskIndex = this.findTaskIndexById(taskId);
    if (taskIndex < 0) {
      inputEl.checked = !checked;
      return;
    }

    const task = this._taskRepository.tasks[taskIndex];
    if (!task || !task.isGoogleTodoTask()) {
      inputEl.checked = !checked;
      return;
    }

    if (LocalStorageManager.taskViewMode !== 'card') {
      inputEl.checked = !checked;
      return;
    }

    if (!hasValidGoogleToken()) {
      inputEl.checked = !checked;
      this.notifyGoogleReloginRequired(
        'Google にログインしてからチェックを更新してください。',
      );
      return;
    }

    const currentDescription = task.description || '';
    const nextDescription = this.updateTodoChecklistLine(
      currentDescription,
      checkIndex,
      checked,
    );
    if (nextDescription === null) {
      inputEl.checked = !checked;
      return;
    }

    inputEl.disabled = true;
    try {
      await updateTodoEventDescription(new DoneTask(task), nextDescription);
      task.description = nextDescription;
      this.renderCards();
    } catch (error) {
      if (isGoogleReloginRequiredError(error)) {
        this.notifyGoogleReloginRequired();
      }
      inputEl.checked = !checked;
      if (!isGoogleReloginRequiredError(error)) {
        alert('TODOカレンダーのチェック状態更新に失敗しました。');
      }
    } finally {
      inputEl.disabled = false;
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
        <div id="taskLoadingIndicator" class="loading-inline" style="display: none;">
          <span class="loading-spinner" aria-hidden="true"></span>
          <span class="loading-text">データを同期中...</span>
        </div>
        <div id="todoCalendarLoadStatus" class="todo-load-status" style="display: none;">
          <button id="todoCalendarLoadStatusBtn" class="status-text-button" type="button"></button>
        </div>
        <div id="googleDriveStatus" class="todo-load-status" style="display: none;">
          <button id="googleDriveStatusBtn" class="status-text-button" type="button"></button>
        </div>
        ${renderGoogleAuthAlert({
          statusId: 'googleReloginStatus',
          messageId: 'googleReloginStatusMessage',
          actionButtonId: 'googleReloginStatusBtn',
          dismissButtonId: 'googleReloginDismissBtn',
          actionLabel: 'Google にログイン',
          dismissAriaLabel: '再ログイン通知を閉じる',
        })}
        <div id="taskContainer"></div>
      </main>
    `;
  }

  private setTodoCalendarLoadStatus(
    message: string,
    state: 'loading' | 'cached' | 'success' | 'error',
  ): void {
    const status = document.getElementById('todoCalendarLoadStatus');
    const statusBtn = document.getElementById(
      'todoCalendarLoadStatusBtn',
    ) as HTMLButtonElement | null;
    if (!status) {
      return;
    }
    if (!statusBtn) {
      return;
    }

    if (!hasValidGoogleToken()) {
      status.style.display = 'none';
      return;
    }

    statusBtn.textContent = message;
    status.classList.remove('is-error', 'is-loading');
    if (state === 'error') {
      status.classList.add('is-error');
    }
    if (state === 'loading') {
      status.classList.add('is-loading');
    }
    status.style.display = message ? 'block' : 'none';
  }

  private setGoogleDriveStatus(
    message: string,
    state: 'loading' | 'cached' | 'success' | 'error' | 'off',
  ): void {
    const status = document.getElementById('googleDriveStatus');
    const statusBtn = document.getElementById(
      'googleDriveStatusBtn',
    ) as HTMLButtonElement | null;
    if (!status) {
      return;
    }
    if (!statusBtn) {
      return;
    }

    if (!hasValidGoogleToken()) {
      status.style.display = 'none';
      return;
    }

    statusBtn.textContent = message;
    status.classList.remove('is-error', 'is-loading');
    if (state === 'error') {
      status.classList.add('is-error');
    }
    if (state === 'loading') {
      status.classList.add('is-loading');
    }
    status.style.display = message ? 'block' : 'none';
  }

  private setLoading(loading: boolean): void {
    this._isLoading = loading;
    const indicator = document.getElementById('taskLoadingIndicator');
    if (indicator) {
      indicator.style.display = loading ? 'flex' : 'none';
    }
  }

  renderCards(): void {
    const container = document.getElementById('taskContainer');
    if (!container) return;

    if (this._isLoading && this._taskRepository.tasks.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '';

    const YESTERDAY = DateHelper.yesterday;

    // // ソート条件が設定されていれば、描画の直前にデータをソート
    // if (SortState.column) {
    //     SortManager.sortTasks();
    // }

    const filteredTasks: DoneTask[] = [];
    const targetDayMap: TargetDayMap = {};
    const groups: DoneGroups = {};
    const overdueGroups = this._taskRepository.collectOverdueGroups();

    this._taskRepository.tasks.forEach((task: DoneTask) => {
      task = new DoneTask(task);

      if (
        task.shouldHidePastDoneGoogleTodo() ||
        task.shouldHideFromRegularListAsLongTermOverdue()
      ) {
        return;
      }

      if (task.isGoogleTodoTask() && LocalStorageManager.filterHideGoogleTodo) {
        return;
      }

      const isTargetDay = task.shouldShowTask();
      const isScheduledToday = task.isTaskScheduledOnDate(DateHelper.todayDate);
      const isDisplayTargetDay =
        isTargetDay ||
        (!LocalStorageManager.filterHideOutOfTime && isScheduledToday);
      targetDayMap[task.id] = isDisplayTargetDay;
      // 該当日でないタスクを非表示にする設定が有効で、かつ該当日でない場合はスキップ
      if (!isDisplayTargetDay && LocalStorageManager.filterHideNonTargetDay) {
        return;
      }
      const todayStatus = task.history[task.resolveStatusDateKey()];
      const timeCheck = task.timeCheck();
      const isUnprocessedAfterWindow =
        !todayStatus &&
        task.isTaskScheduledOnDate(DateHelper.todayDate) &&
        task.hasExecutionWindowEndedOnDate(DateHelper.todayDate, new Date());
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
      // 時間外のタスクを非表示にする設定が有効で、かつ時間外であり、かつリマインド時間帯でない場合は非表示
      if (
        isDisplayTargetDay &&
        !todayStatus &&
        !timeCheck.valid &&
        !isUnprocessedAfterWindow &&
        LocalStorageManager.filterHideOutOfTime &&
        !task.isReminderWindowActive()
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
      const overdueTasks = Object.values(overdueGroups).flat();
      this._sortManager.sortOverdueTasks(overdueTasks);
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
        const actionDateKey = task.resolveActionDateKey();
        const actionDateStatus = task.history[actionDateKey];
        const todayStatus = task.history[task.resolveStatusDateKey()];
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
        if (actionDateStatus) {
          card.setAttribute('data-done', 'true');
        } else if (statusInfo.className === 'chip-status-todo') {
          card.setAttribute('data-overdue', 'true');
        } else if (!timeCheck.valid) {
          card.setAttribute('data-out-of-time', 'true');
        }

        if (actionDateStatus) {
          const undoButton = document.createElement('button');
          undoButton.className = 'btn-undo';
          undoButton.textContent = '✕';
          undoButton.title = '戻す';
          undoButton.setAttribute('data-task-action', 'undo');
          undoButton.setAttribute('data-task-id', task.id);
          undoButton.setAttribute('data-task-date', actionDateKey);
          card.appendChild(undoButton);
        }

        const content = document.createElement('div');

        if (statusInfo.className === 'chip-status-todo') {
          const overdueDate = document.createElement('div');
          overdueDate.className = 'overdue-date-label';
          overdueDate.textContent = task.resolveDateLabelByStatus(statusInfo);
          content.appendChild(overdueDate);
        }

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
        } else if (statusInfo.className === 'chip-status-todo') {
          badge.classList.add('status-todo');
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

        const description = this.createTaskDescriptionElement(task);
        if (description) {
          content.appendChild(description);
        }

        const location = this.createTodoLocationElement(task);
        if (location) {
          content.appendChild(location);
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

        if (actionDateStatus) {
          const undoActionButton = document.createElement('button');
          undoActionButton.className = 'btn btn-cancel';
          undoActionButton.textContent = '戻す';
          undoActionButton.setAttribute('data-task-action', 'undo');
          undoActionButton.setAttribute('data-task-id', task.id);
          undoActionButton.setAttribute('data-task-date', actionDateKey);
          actionContainer.appendChild(undoActionButton);
        } else {
          const mainButton = document.createElement('button');
          const primaryAction = task.getPrimaryActionType();
          mainButton.className = `btn ${
            primaryAction === 'add'
              ? 'btn-add'
              : primaryAction === 'append'
                ? 'btn-append'
                : 'btn-action'
          }`;
          mainButton.textContent = task.getPrimaryActionLabel();
          mainButton.setAttribute('data-task-action', primaryAction);
          mainButton.setAttribute('data-task-id', task.id);
          mainButton.setAttribute('data-task-date', actionDateKey);

          const isStrict = task.strictMode === true;
          if (statusInfo.locked || (!timeCheck.valid && isStrict)) {
            mainButton.disabled = true;
          }

          actionContainer.appendChild(mainButton);

          const secondaryButton = document.createElement('button');
          const isDeleteAction = Boolean(
            task.specificDate && !task.isGoogleTodoTask(),
          );
          secondaryButton.className = isDeleteAction ? 'btn' : 'btn btn-cancel';
          secondaryButton.textContent = isDeleteAction ? '削除' : 'キャンセル';
          secondaryButton.setAttribute(
            'data-task-action',
            isDeleteAction ? 'delete' : 'cancel',
          );
          secondaryButton.setAttribute('data-task-id', task.id);
          secondaryButton.setAttribute('data-task-date', actionDateKey);
          if (isDeleteAction) {
            secondaryButton.style.backgroundColor = '#ef4444';
            secondaryButton.style.color = '#ffffff';
            secondaryButton.style.flex = '1';
          }
          if (statusInfo.locked) {
            secondaryButton.disabled = true;
          }

          actionContainer.appendChild(secondaryButton);
        }
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
          if (task.isSecondCalendarLongTermTask()) {
            overdueDate.textContent = `予定日: ${task.scheduleLabel}`;
          } else if (task.isGoogleTodoTask() && task.specificDate) {
            overdueDate.textContent =
              task.specificDate === overdue.dateKey
                ? task.formatUnfinishedDateLabel(overdue.dateKey)
                : `予定日: ${task.scheduleLabel} / ${task.formatUnfinishedDateLabel(overdue.dateKey)}`;
          } else {
            overdueDate.textContent = task.formatUnfinishedDateLabel(
              overdue.dateKey,
            );
          }
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

          const description = this.createTaskDescriptionElement(task);
          if (description) {
            content.appendChild(description);
          }

          const location = this.createTodoLocationElement(task);
          if (location) {
            content.appendChild(location);
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
          const primaryAction = task.getPrimaryActionType();
          mainButton.className = `btn ${
            primaryAction === 'add'
              ? 'btn-add'
              : primaryAction === 'append'
                ? 'btn-append'
                : 'btn-action'
          }`;
          mainButton.textContent = task.getPrimaryActionLabel();
          mainButton.setAttribute('data-task-action', primaryAction);
          mainButton.setAttribute('data-task-id', task.id);
          mainButton.setAttribute('data-task-date', overdue.dateKey);
          mainButton.setAttribute('data-task-overdue', 'true');
          actionContainer.appendChild(mainButton);

          const secondaryButton = document.createElement('button');
          const isDeleteAction = Boolean(
            task.specificDate && !task.isGoogleTodoTask(),
          );
          secondaryButton.className = isDeleteAction ? 'btn' : 'btn btn-cancel';
          secondaryButton.textContent = isDeleteAction ? '削除' : 'キャンセル';
          secondaryButton.setAttribute(
            'data-task-action',
            isDeleteAction ? 'delete' : 'cancel',
          );
          secondaryButton.setAttribute('data-task-id', task.id);
          secondaryButton.setAttribute('data-task-date', overdue.dateKey);
          secondaryButton.setAttribute('data-task-overdue', 'true');
          if (isDeleteAction) {
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
      document.addEventListener(
        TaskRepository.EVENT_TODO_CALENDAR_STATUS,
        (event: Event) => {
          const customEvent = event as CustomEvent<{
            state: 'loading' | 'cached' | 'success' | 'error';
            message: string;
          }>;
          this.setTodoCalendarLoadStatus(
            customEvent.detail.message,
            customEvent.detail.state,
          );
        },
      );

      document.addEventListener(
        TaskRepository.EVENT_GOOGLE_DRIVE_STATUS,
        (event: Event) => {
          const customEvent = event as CustomEvent<{
            state: 'loading' | 'cached' | 'success' | 'error' | 'off';
            message: string;
          }>;
          this.setGoogleDriveStatus(
            customEvent.detail.message,
            customEvent.detail.state,
          );
        },
      );

      document.addEventListener(
        TaskRepository.EVENT_GOOGLE_RELOGIN_NOTICE,
        (event: Event) => {
          const customEvent = event as CustomEvent<{message: string}>;
          this.notifyGoogleReloginRequired(customEvent.detail.message);
        },
      );

      document.addEventListener(
        SessionManager.EVENT_GOOGLE_RELOGIN_REQUIRED,
        () => {
          this.notifyGoogleReloginRequired();
        },
      );

      document.addEventListener(
        SessionManager.EVENT_GOOGLE_LOGIN_SUCCEEDED,
        () => {
          if (this._isLoading) {
            return;
          }
          this.setLoading(true);
          void this._taskRepository
            .refreshAfterGoogleLogin()
            .then(() => this.renderCards())
            .finally(() => this.setLoading(false));
        },
      );

      document.addEventListener(SessionManager.EVENT_PAGE_ACTIVATED, () => {
        if (this._isLoading) {
          return;
        }
        if (LocalStorageManager.taskSyncDirty) {
          this.setLoading(true);
          void this._taskRepository
            .saveTasksWithSync()
            .then(() => this.renderCards())
            .finally(() => this.setLoading(false));
          return;
        }
        const now = Date.now();
        if (
          now - this._lastPageActivationRefreshAt <
          Index.PAGE_ACTIVATION_REFRESH_COOLDOWN_MS
        ) {
          return;
        }
        this._lastPageActivationRefreshAt = now;
        void this.refreshCloudTasksWithLoading(false).then(() => {
          this.renderCards();
        });
      });

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
            this.handleTaskAction(action, taskId, targetDate, actionButton);
          }
          return;
        }

        const th = event.target.closest('th[data-sort-col]');
        if (th) {
          const colName = th.getAttribute('data-sort-col');
          if (colName) {
            const overdueTasks = this._taskRepository.getOverdueTasks();
            this._sortManager.handleSort(
              colName,
              this._taskRepository,
              overdueTasks,
            );
            this.renderCards();
          }
        }
      });

      taskContainer.addEventListener('change', event => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }
        if (target.getAttribute('data-todo-check-item') !== '1') {
          return;
        }

        const taskId = target.getAttribute('data-task-id') || '';
        const checkIndex = Number(target.getAttribute('data-check-index'));
        if (!taskId || !Number.isInteger(checkIndex) || checkIndex < 0) {
          return;
        }

        void this.handleTodoChecklistToggle(
          taskId,
          checkIndex,
          target.checked,
          target,
        );
      });

      this.renderCards();
      const banner = document.getElementById('notificationBanner');
      NotificationManager.syncBannerVisibility(banner);
    }

    const todoCalendarLoadStatusBtn = document.getElementById(
      'todoCalendarLoadStatusBtn',
    ) as HTMLButtonElement | null;
    if (todoCalendarLoadStatusBtn) {
      todoCalendarLoadStatusBtn.addEventListener('click', () => {
        this.setTodoCalendarLoadStatus(
          'TODOカレンダー: 再読み込み中...',
          'loading',
        );
        void this.refreshCloudTasksWithLoading(true, 'calendar').then(() => {
          this.renderCards();
        });
      });
    }

    const googleDriveStatusBtn = document.getElementById(
      'googleDriveStatusBtn',
    ) as HTMLButtonElement | null;
    if (googleDriveStatusBtn) {
      googleDriveStatusBtn.addEventListener('click', () => {
        this.setGoogleDriveStatus('Google Drive: 再読み込み中...', 'loading');
        void this.refreshCloudTasksWithLoading(true, 'drive').then(() => {
          this.renderCards();
        });
      });
    }

    if (!this._googleAuthAlertController) {
      this._googleAuthAlertController = new GoogleAuthAlertController({
        root: document,
        ids: {
          statusId: 'googleReloginStatus',
          messageId: 'googleReloginStatusMessage',
          actionButtonId: 'googleReloginStatusBtn',
          dismissButtonId: 'googleReloginDismissBtn',
        },
        onAction: () => {
          this.openGoogleLogin();
        },
      });
      this._googleAuthAlertController.setup();
    }
  }

  async loadTasks(): Promise<void> {
    await this._taskRepository.loadTasks();
  }

  private async refreshCloudTasksWithLoading(
    forceRefresh = false,
    target: 'all' | 'drive' | 'calendar' = 'all',
  ): Promise<void> {
    const inProgress = this._cloudRefreshPromises.get(target);
    if (inProgress) {
      return inProgress;
    }

    const refreshPromise = (async () => {
      this._activeCloudRefreshes++;
      this.setLoading(true);
      try {
        await this._taskRepository.refreshFromCloudIfNeeded(
          forceRefresh,
          target,
        );
      } finally {
        this._activeCloudRefreshes--;
        this.setLoading(this._activeCloudRefreshes > 0);
      }
    })();
    this._cloudRefreshPromises.set(target, refreshPromise);
    try {
      await refreshPromise;
    } finally {
      if (this._cloudRefreshPromises.get(target) === refreshPromise) {
        this._cloudRefreshPromises.delete(target);
      }
    }
  }

  registerNotification(): boolean {
    if (Notification.permission !== 'granted') {
      return false;
    }
    const now = new Date();
    let isUpdated = false;
    this._taskRepository.tasks.forEach((task: DoneTask) => {
      if (task.isGoogleTodoTask()) {
        return;
      }

      if (!task.startTime) {
        return;
      }
      const candidate = new DoneTask(task).toNotificationCandidate(now);
      if (!candidate) {
        return;
      }
      if (task.notifiedDate === candidate.scheduleDateKey) {
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
    return isUpdated;
  }

  async init(): Promise<void> {
    SessionManager.startGoogleSessionKeepAlive();
    this.applyTheme();

    // 先に localStorage の内容を描画し、クラウド同期は非同期で後追いする。
    this._taskRepository.hydrateFromLocal();

    if (
      this._taskRepository.tasks.length === 0 &&
      !LocalStorageManager.hasStoredTasksData()
    ) {
      await this._taskRepository.resetToDefault();
    }

    this.setupPageSpecifics();

    // リロード時のみ強制再取得し、設定画面から戻った直後はセッションキャッシュを優先する。
    const forceCloudRefresh =
      TaskRepository.shouldForceCloudRefreshOnIndexInit();
    void this.refreshCloudTasksWithLoading(forceCloudRefresh).then(() => {
      this.renderCards();
    });

    this.registerNotification();
    setInterval(() => {
      if (this.registerNotification()) {
        this.renderCards();
      }
    }, 60 * 1000);
  }

  async reset(): Promise<void> {
    this._taskRepository.tasks = null;
    this._taskRepository.hydrateFromLocal();
    this.renderCards();
    await this.refreshCloudTasksWithLoading(true);
    this.renderCards();
  }
}

if (!customElements.get(Index.NAME)) {
  customElements.define(Index.NAME, Index);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Google認証のリダイレクトパラメータ処理を実行
  handleGoogleAuthRedirect();

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
