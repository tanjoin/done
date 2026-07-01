import './style.css';
import Header from './header';
import Footer from './footer';
import {
  TemporaryForm,
  TEMPORARY_FORM_RESET_FORM,
  TEMPORARY_FORM_GROUP_SUGGESTIONS_UPDATE,
} from './temporary-form';
import {
  TemporaryHistory,
  TemporaryHistoryItem,
  TEMPORARY_HISTORY_EVENT_HISTORY_ADD,
  TEMPORARY_HISTORY_EVENT_RENDER_HISTORY,
} from './temporary-history';
import LocalStorageManager from './local-storage-manager';
import DoneTask from './done-task';

export const TEMPORARY_EVENT_TASK_PUBLISHED = 'done-temporary-task-published';

export class Temporary extends HTMLElement {
  static get NAME(): string {
    return 'done-temporary';
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    this.innerHTML = `
      <main>
        <div class="data-box">
          ${document.createElement(TemporaryForm.NAME).outerHTML}
          ${document.createElement(TemporaryHistory.NAME).outerHTML}
        </div>
      </main>
    `;
  }

  static publishTemporaryTask(event: Event): void {
    event.preventDefault();

    const targetDate = Temporary.getInputElement('date').value;
    const endDateVal = Temporary.getInputElement('endDate').value;
    const groupVal = Temporary.getInputElement('group').value.trim();
    const textVal = Temporary.getInputElement('text').value.trim();
    const startVal = Temporary.getInputElement('startTime').value;
    const endVal = Temporary.getInputElement('endTime').value;
    const remindValRaw = Temporary.getInputElement('remindMinutesBefore').value;
    const descVal = Temporary.getInputElement('description').value.trim();
    const linkVal = Temporary.getInputElement('link').value.trim();
    const strictVal = Temporary.getInputElement('strictMode').checked;

    let remindVal = null;
    if (remindValRaw !== '') {
      const parsed = Number(remindValRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        alert('通知猶予は 0 以上の数値で入力してください。');
        return;
      }
      remindVal = Math.floor(parsed);
    }

    // 1. 本番のメインタスクデータをロード
    const mainTasks = LocalStorageManager.tasks;

    if (endDateVal && endDateVal < targetDate) {
      alert('終了日は開始日と同じかそれ以降の日付にしてください。');
      return;
    }
    // 2. 本番用の一時的タスクオブジェクトを作成
    const newTaskInstance = new DoneTask({
      id:
        'actual_temp_' +
        Date.now() +
        '_' +
        Math.random().toString(36).substring(2, 7),
      group: groupVal,
      text: textVal,
      startTime: startVal,
      endTime: endVal,
      remindMinutesBefore: remindVal,
      description: descVal,
      link: linkVal,
      strictMode: strictVal,
      history: {},
      notifiedDate: '',
      specificDate: targetDate,
      endDate: endDateVal,
    });

    mainTasks.push(newTaskInstance);
    LocalStorageManager.tasks = mainTasks;

    // 3. おまけの「入力履歴」にも保存して再利用できるようにする（重複はIDを分けて保持）
    const historyItem: TemporaryHistoryItem = {
      id: 'hist_' + Date.now(),
      group: groupVal,
      text: textVal,
      endDate: endDateVal,
      startTime: startVal,
      endTime: endVal,
      remindMinutesBefore: remindVal,
      description: descVal,
      link: linkVal,
      strictMode: strictVal,
    };

    document.dispatchEvent(
      new CustomEvent(TEMPORARY_HISTORY_EVENT_HISTORY_ADD, {
        detail: historyItem,
        bubbles: true,
      }),
    );
    document.dispatchEvent(
      new CustomEvent(TEMPORARY_FORM_RESET_FORM, {bubbles: true}),
    );
    document.dispatchEvent(
      new CustomEvent(TEMPORARY_HISTORY_EVENT_RENDER_HISTORY, {bubbles: true}),
    );
    document.dispatchEvent(
      new CustomEvent(TEMPORARY_FORM_GROUP_SUGGESTIONS_UPDATE, {bubbles: true}),
    );
  }

  private static getInputElement(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
  }
}

if (!customElements.get(Temporary.NAME)) {
  customElements.define(Temporary.NAME, Temporary);
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('.container');
  if (container) {
    const header = document.createElement(Header.NAME) as Header;
    header.active = 'temporary';
    container.appendChild(header);

    const sectionTitle = document.createElement('h3');
    sectionTitle.className = 'group-title';
    sectionTitle.textContent = '一時的タスクを追加する';
    container.appendChild(sectionTitle);

    const temporary = document.createElement(Temporary.NAME) as Temporary;
    container.appendChild(temporary);

    // フォーム送信イベント
    const taskForm = document.getElementById('taskForm') as HTMLFormElement;
    taskForm.addEventListener('submit', Temporary.publishTemporaryTask);

    const footer = document.createElement(Footer.NAME) as Footer;
    container.appendChild(footer);
  }
});
