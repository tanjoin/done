import './style.css';
import Footer from './footer';
import Header from './header';
import LocalStorageManager from './local-storage-manager';
import DoneTask from './done-task';
import {DoneTaskData} from './types';

class JsonOrganizer extends HTMLElement {
  private _tasks: DoneTaskData[] = [];

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
            保存前に JSON 整形で確認してください。
          </p>

          <div class="btn-group-wrap">
            <button id="jsonReloadTasksBtn" class="btn">再読込</button>
            <button id="jsonSaveAllTasksBtn" class="btn btn-action">done_tasks 全体を保存</button>
            <button id="jsonAddTaskBtn" class="btn">新規タスク追加</button>
            <button id="jsonDeleteTaskBtn" class="btn">選択タスク削除</button>
          </div>

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
        const tasksToSave = this._tasks.map(task => new DoneTask(task));
        LocalStorageManager.tasks = tasksToSave;
        this.setStatus('done_tasks 全体を保存しました。');
      },
    );

    this.getElement<HTMLButtonElement>('jsonAddTaskBtn').addEventListener(
      'click',
      () => {
        const newTask = this.createEmptyTask();
        this._tasks.push(newTask);
        this.renderTaskSelectOptions(newTask.id);
        this.renderSelectedTaskJson();
        this.setStatus('新規タスクを追加しました。内容を編集して保存してください。');
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

  private loadTasks(): void {
    this._tasks = LocalStorageManager.tasks;
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

  private createEmptyTask(): DoneTaskData {
    const now = Date.now();
    return {
      id: `task_${now}`,
      text: '新規タスク',
      group: 'その他',
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
      specificDate: '',
      endDate: '',
    };
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
