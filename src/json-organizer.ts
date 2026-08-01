import './style.css';
import Footer from './footer';
import Header from './header';
import LocalStorageManager from './local-storage-manager';
import DoneTask from './done-task';
import {DoneTaskData} from './types';
import {hasValidGoogleToken, isGoogleReloginRequiredError} from './google-auth';
import {syncTasksToGoogleDrive} from './google-drive-service';

class JsonOrganizer extends HTMLElement {
  private _tasks: DoneTaskData[] = [];

  private static excludeGoogleTodoTasks(tasks: DoneTaskData[]): DoneTaskData[] {
    return tasks.filter(task => task.sourceType !== 'google-todo');
  }

  static get NAME(): string {
    return 'done-json-organizer';
  }

  connectedCallback(): void {
    this.render();
    this.loadTasks();
    this.setupEvents();
  }

  private render(): void {
    this.innerHTML = `
      <main>
        <h3 class="group-title">タスク JSON 編集</h3>
        <div class="data-box">
          <p class="setting-desc">
            done_tasks を読み込み、1タスクずつ JSON で直接編集できます。<br />
            一時タスクは specificDate を設定したタスクとして管理します。<br />
            保存前に JSON 整形で確認してください。
          </p>

          <div class="btn-group-wrap">
            <button id="jsonReloadTasksBtn" class="btn">再読込</button>
            <button id="jsonSaveAllTasksBtn" class="btn btn-action">done_tasks 全体を保存</button>
            <button id="jsonAddTaskBtn" class="btn">タスク追加</button>
            <button id="jsonDeleteTaskBtn" class="btn">選択タスク削除</button>
          </div>

          <dialog id="jsonAddTaskDialog" class="task-type-dialog">
            <form method="dialog" class="task-type-dialog__form">
              <h4 class="task-type-dialog__title">追加するタスク種別を選択</h4>
              <p class="task-type-dialog__desc">通常タスクか一時タスクを明示的に選んでください。</p>
              <div class="task-type-dialog__actions">
                <button value="normal" class="btn task-type-dialog__choice-btn">通常タスク</button>
                <button value="temporary" class="btn task-type-dialog__choice-btn">一時タスク</button>
              </div>
              <div class="task-type-dialog__actions task-type-dialog__actions--cancel">
                <button value="cancel" class="btn btn-cancel">キャンセル</button>
              </div>
            </form>
          </dialog>

          <div class="setting-row">
            <label for="jsonTaskSelect">編集対象タスク</label>
            <select id="jsonTaskSelect" class="setting-input"></select>
          </div>

          <div class="setting-row">
            <label for="jsonTaskEditor">タスク JSON</label>
            <textarea id="jsonTaskEditor" class="setting-input json-editor" spellcheck="false"></textarea>
          </div>

          <div class="btn-group-wrap">
            <button id="jsonPrettyBtn" class="btn">JSON 整形</button>
            <button id="jsonApplyTaskBtn" class="btn btn-action">このタスクに反映</button>
          </div>

          <p id="jsonStatus" class="json-status-msg" aria-live="polite"></p>
        </div>
      </main>
    `;
  }

  private setupEvents(): void {
    this.getElement<HTMLButtonElement>('jsonReloadTasksBtn').addEventListener(
      'click',
      () => {
        this.loadTasks();
        this.setStatus('done_tasks を再読込しました。');
      },
    );

    this.getElement<HTMLButtonElement>('jsonSaveAllTasksBtn').addEventListener(
      'click',
      () => {
        void this.saveAllTasks();
      },
    );

    this.getElement<HTMLButtonElement>('jsonSaveAllTasksBtn').addEventListener(
      'keydown',
      event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void this.saveAllTasks();
        }
      },
    );

    this.getElement<HTMLButtonElement>('jsonAddTaskBtn').addEventListener(
      'click',
      async () => {
        const taskType = await this.openAddTaskDialog();
        if (!taskType) {
          this.setStatus('タスク追加をキャンセルしました。');
          return;
        }

        const isTemporaryTask = taskType === 'temporary';
        const newTask = this.createTaskTemplate(isTemporaryTask);
        this._tasks.push(newTask);
        this.renderTaskSelectOptions(newTask.id);
        this.renderSelectedTaskJson();
        this.setStatus(
          isTemporaryTask
            ? '一時タスクを追加しました。specificDate や時刻を調整して保存してください。'
            : '通常タスクを追加しました。繰り返し条件などを編集して保存してください。',
        );
      },
    );

    this.getElement<HTMLButtonElement>('jsonDeleteTaskBtn').addEventListener(
      'click',
      () => {
        const selectedIndex = this.getSelectedTaskIndex();
        if (selectedIndex < 0 || selectedIndex >= this._tasks.length) {
          this.setStatus('削除対象タスクを選択してください。', true);
          return;
        }

        const target = this._tasks[selectedIndex];
        if (!target) {
          this.setStatus('削除対象タスクを選択してください。', true);
          return;
        }

        const ok = confirm(`このタスクを削除しますか？\n[${target.group || 'その他'}] ${target.text}`);
        if (!ok) {
          return;
        }

        this._tasks.splice(selectedIndex, 1);
        this.renderTaskSelectOptions();
        this.renderSelectedTaskJson();
        this.setStatus('選択タスクを削除しました。保存ボタンで確定してください。');
      },
    );

    this.getElement<HTMLSelectElement>('jsonTaskSelect').addEventListener(
      'change',
      () => {
        this.renderSelectedTaskJson();
      },
    );

    this.getElement<HTMLButtonElement>('jsonPrettyBtn').addEventListener(
      'click',
      () => {
        const parsed = this.readTaskEditorJson();
        if (!parsed) return;
        this.setTaskEditorJson(parsed);
        this.setStatus('整形しました。');
      },
    );

    this.getElement<HTMLButtonElement>('jsonApplyTaskBtn').addEventListener(
      'click',
      () => {
        const selectedIndex = this.getSelectedTaskIndex();
        if (selectedIndex < 0 || selectedIndex >= this._tasks.length) {
          this.setStatus('編集対象タスクを選択してください。', true);
          return;
        }
        const parsed = this.readTaskEditorJson();
        if (!parsed) {
          return;
        }
        if (!this.isDoneTaskLike(parsed)) {
          this.setStatus('タスク形式ではありません（id, text, history は必須）。', true);
          return;
        }
        const prevId = this._tasks[selectedIndex]?.id || '';
        this._tasks[selectedIndex] = parsed;
        this.renderTaskSelectOptions(parsed.id || prevId);
        this.setTaskEditorJson(this._tasks[selectedIndex]);
        this.setStatus('選択タスクに反映しました。保存ボタンで確定してください。');
      },
    );
  }

  private async saveAllTasks(): Promise<void> {
    const tasksToSave = JsonOrganizer.excludeGoogleTodoTasks(this._tasks).map(
      task => new DoneTask(task),
    );
    LocalStorageManager.tasks = tasksToSave;

    if (!LocalStorageManager.googleDriveSyncEnabled || !hasValidGoogleToken()) {
      this.setStatus('done_tasks 全体を保存しました。');
      return;
    }

    try {
      const result = await syncTasksToGoogleDrive(tasksToSave);
      if (!result.uploaded && result.skippedReason) {
        if (result.skippedReason === 'missing_local_updated_at') {
          this.setStatus(
            'done_tasks は保存しました。Google Driveは最終更新日なしのため上書き停止しました。',
            true,
          );
          return;
        }
        if (result.skippedReason === 'missing_remote_updated_at') {
          this.setStatus(
            'done_tasks は保存しました。Google Drive保存先に最終更新日がないため上書き停止しました。',
            true,
          );
          return;
        }
        this.setStatus(
          'done_tasks は保存しました。Google Drive側が新しいため上書き停止しました。',
          true,
        );
        return;
      }
      this.setStatus('done_tasks 全体を保存し、Google Drive に同期しました。');
    } catch (error) {
      if (isGoogleReloginRequiredError(error)) {
        this.setStatus(
          'done_tasks は保存しました。Google認証が切れたため設定画面で再ログインしてください。',
          true,
        );
        if (LocalStorageManager.googleClientIdEncrypted.trim()) {
          window.location.href = 'settings.html';
        }
        return;
      }
      this.setStatus('done_tasks は保存しましたが、Google Drive同期に失敗しました。', true);
    }
  }

  private loadTasks(): void {
    this._tasks = JsonOrganizer.excludeGoogleTodoTasks(LocalStorageManager.tasks);
    this.renderTaskSelectOptions();
    this.renderSelectedTaskJson();
  }

  private renderTaskSelectOptions(preferredTaskId = ''): void {
    const select = this.getElement<HTMLSelectElement>('jsonTaskSelect');
    const currentValue = select.value;
    select.innerHTML = '';

    this._tasks.forEach((task, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const group = (task.group || 'その他').trim() || 'その他';
      option.textContent = `${index + 1}. [${group}] ${task.text}`;
      option.dataset.taskId = task.id;
      select.appendChild(option);
    });

    if (this._tasks.length === 0) {
      const option = document.createElement('option');
      option.value = '-1';
      option.textContent = 'タスクがありません';
      select.appendChild(option);
      select.value = '-1';
      return;
    }

    const preferredIndex = preferredTaskId
      ? this._tasks.findIndex(task => task.id === preferredTaskId)
      : -1;
    if (preferredIndex >= 0) {
      select.value = String(preferredIndex);
      return;
    }

    if (currentValue && Number(currentValue) >= 0 && Number(currentValue) < this._tasks.length) {
      select.value = currentValue;
      return;
    }

    select.value = '0';
  }

  private renderSelectedTaskJson(): void {
    const selectedIndex = this.getSelectedTaskIndex();
    const editor = this.getElement<HTMLTextAreaElement>('jsonTaskEditor');
    if (selectedIndex < 0 || selectedIndex >= this._tasks.length) {
      editor.value = '';
      this.setStatus('編集対象タスクを選択してください。', true);
      return;
    }
    this.setTaskEditorJson(this._tasks[selectedIndex]);
  }

  private setTaskEditorJson(data: unknown): void {
    const editor = this.getElement<HTMLTextAreaElement>('jsonTaskEditor');
    editor.value = JSON.stringify(data, null, 2);
  }

  private createTaskTemplate(isTemporaryTask: boolean): DoneTaskData {
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const idPrefix = isTemporaryTask ? 'temp' : 'task';
    return {
      id: `${idPrefix}_${now}`,
      text: isTemporaryTask ? '一時タスク' : '新規タスク',
      group: isTemporaryTask ? '一時' : 'その他',
      description: '',
      link: '',
      daysOfWeek: [],
      daysOfMonth: [],
      startTime: '',
      endTime: '',
      history: {},
      notifiedDate: '',
      remindMinutesBefore: null,
      skipCalendarOnComplete: false,
      strictMode: false,
      createTaskViaUrl: false,
      specificDate: isTemporaryTask ? today : '',
      endDate: '',
      sourceType: 'google-done',
    };
  }

  private openAddTaskDialog(): Promise<'normal' | 'temporary' | null> {
    const dialog = this.getElement<HTMLDialogElement>('jsonAddTaskDialog');
    if (typeof dialog.showModal !== 'function') {
      return Promise.resolve(null);
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return new Promise(resolve => {
      const handleClose = () => {
        dialog.removeEventListener('close', handleClose);
        if (dialog.returnValue === 'normal' || dialog.returnValue === 'temporary') {
          resolve(dialog.returnValue);
          return;
        }
        resolve(null);
      };
      dialog.addEventListener('close', handleClose);
    });
  }

  private readTaskEditorJson(): DoneTaskData | null {
    const source = this.getElement<HTMLTextAreaElement>('jsonTaskEditor').value.trim();
    if (!source) {
      this.setStatus('タスク JSON が空です。', true);
      return null;
    }
    try {
      const parsed = JSON.parse(source) as unknown;
      if (!this.isDoneTaskLike(parsed)) {
        this.setStatus('タスク形式ではありません（id, text, history は必須）。', true);
        return null;
      }
      return parsed;
    } catch {
      this.setStatus('タスク JSON の形式が不正です。', true);
      return null;
    }
  }

  private isDoneTaskLike(value: unknown): value is DoneTaskData {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.text === 'string' &&
      !!candidate.history &&
      typeof candidate.history === 'object'
    );
  }

  private setStatus(message: string, isError = false): void {
    const status = this.getElement<HTMLElement>('jsonStatus');
    status.textContent = message;
    status.classList.toggle('json-status-msg--error', isError);
  }

  private getElement<T extends HTMLElement>(id: string): T {
    const el = this.querySelector(`#${id}`);
    if (!el) {
      throw new Error(`Element not found: ${id}`);
    }
    return el as T;
  }

  private getSelectedTaskIndex(): number {
    const select = this.getElement<HTMLSelectElement>('jsonTaskSelect');
    const index = Number(select.value);
    if (!Number.isInteger(index)) {
      return -1;
    }
    return index;
  }
}

if (!customElements.get(JsonOrganizer.NAME)) {
  customElements.define(JsonOrganizer.NAME, JsonOrganizer);
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  if (!container) {
    return;
  }

  const header = document.createElement(Header.NAME) as Header;
  header.active = 'json-organizer';
  container.appendChild(header);

  const page = document.createElement(JsonOrganizer.NAME) as JsonOrganizer;
  container.appendChild(page);

  const footer = document.createElement(Footer.NAME) as Footer;
  container.appendChild(footer);
});
