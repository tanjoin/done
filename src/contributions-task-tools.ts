import './contributions-task-tools.css';
import {handleGoogleAuthRedirect} from './google-auth';
import LocalStorageManager from './local-storage-manager';
import SessionManager from './session-manager';
import TaskRepository from './task-repository';
import type {DoneTaskData} from './types';

handleGoogleAuthRedirect();

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] || character;
  });
}

class ContributionsTaskTools {
  private readonly repository = new TaskRepository();
  private readonly dialog = document.createElement('dialog');
  private readonly content = document.createElement('div');
  private readonly observer: MutationObserver;
  private selectedTaskId = '';
  private selectedDate = '';
  private selectedLogDate = '';
  private editDate = '';
  private year = new Date().getFullYear();

  constructor(private readonly page: HTMLElement) {
    this.dialog.className = 'task-history-dialog';
    this.dialog.setAttribute('aria-labelledby', 'taskHistoryTitle');
    this.dialog.append(this.content);
    document.body.append(this.dialog);
    this.observer = new MutationObserver(() => this.renderSelectedActivity());
    this.observer.observe(page, {childList: true, subtree: true});
    page.addEventListener('click', event => this.handlePageClick(event));
    this.dialog.addEventListener('click', event => this.handleDialogClick(event));
    this.dialog.addEventListener('change', event =>
      this.handleDialogChange(event),
    );
    this.dialog.addEventListener('close', () => {
      this.selectedTaskId = '';
    });
    SessionManager.startGoogleSessionKeepAlive();
    this.renderSelectedActivity();
  }

  private renderSelectedActivity(forceUpdate = false): void {
    const section = this.page.querySelector<HTMLElement>('.selected-activity');
    const activeDate = this.page
      .querySelector<HTMLButtonElement>('button[data-date][aria-pressed="true"]')
      ?.dataset.date;
    if (activeDate) {
      this.selectedLogDate = activeDate;
    }
    const selectedDate = activeDate || this.selectedLogDate;
    if (
      !section ||
      !selectedDate ||
      (!forceUpdate && section.dataset.renderedDate === selectedDate)
    ) {
      return;
    }
    const dateTasks = LocalStorageManager.tasks.filter(task => {
      const status = task.history?.[selectedDate];
      return status === 'completed' || status === 'cancelled';
    });
    const completedCount = dateTasks.filter(
      task => task.history[selectedDate] === 'completed',
    ).length;
    const cancelledCount = dateTasks.length - completedCount;
    const list = dateTasks.length
      ? `<ul class="activity-task-list">${dateTasks
          .map(task => {
            const status = task.history[selectedDate];
            const statusLabel = status === 'completed' ? '完了' : 'キャンセル';
            const statusClass = status === 'completed' ? 'is-completed' : 'is-cancelled';
            const group = task.group?.trim();
            return `<li data-history-task-id="${escapeHtml(task.id)}">
              <div class="activity-task-main">
                <span class="activity-task-name">${escapeHtml(task.text || '名称未設定')}</span>
                ${group ? `<span class="activity-task-meta">${escapeHtml(group)}</span>` : ''}
              </div>
              <div class="activity-task-controls">
                <span class="activity-task-status ${statusClass}">${statusLabel}</span>
                <button type="button" class="task-history-open" data-task-history-open data-task-id="${escapeHtml(task.id)}" data-date="${selectedDate}" aria-label="${escapeHtml(task.text || '名称未設定')}のステータスを変更">ステータスを変更</button>
              </div>
            </li>`;
          })
          .join('')}</ul>`
      : '<p class="activity-empty">この日の完了・キャンセル履歴はありません。</p>';

    section.innerHTML = `
      <div class="selected-activity__heading">
        <div>
          <p class="contributions-eyebrow">SELECTED DAY</p>
          <h2>${new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          }).format(new Date(`${selectedDate}T00:00:00`))}</h2>
        </div>
        <strong>${completedCount}件完了 ・ ${cancelledCount}件キャンセル</strong>
      </div>
      ${list}
    `;
    section.dataset.renderedDate = selectedDate;
  }

  private handlePageClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>(
      'button[data-task-history-open]',
    );
    if (!button) {
      return;
    }
    this.selectedTaskId = button.dataset.taskId || '';
    this.selectedDate = button.dataset.date || toDateKey(new Date());
    this.editDate = this.selectedDate;
    this.year = Number(this.editDate.slice(0, 4));
    this.renderDialog();
    this.dialog.showModal();
  }

  private handleDialogClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled) {
      return;
    }
    const action = button.dataset.action;
    if (action === 'close') {
      this.dialog.close();
    } else if (action === 'year-step') {
      const nextYear = this.year + Number(button.dataset.step);
      if (nextYear >= this.firstHistoryYear() && nextYear <= new Date().getFullYear()) {
        this.year = nextYear;
        this.renderDialog();
      }
    } else if (action === 'history-date') {
      this.editDate = button.dataset.date || this.editDate;
      this.renderDialog();
    } else if (action === 'save') {
      void this.saveStatus(button);
    }
  }

  private handleDialogChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'date') {
      return;
    }
    if (!isValidDateKey(target.value)) {
      return;
    }
    this.editDate = target.value;
    this.year = Number(this.editDate.slice(0, 4));
    this.renderDialog();
  }

  private task(): DoneTaskData | undefined {
    return LocalStorageManager.tasks.find(task => task.id === this.selectedTaskId);
  }

  private firstHistoryYear(): number {
    const task = this.task();
    const years = Object.keys(task?.history || {})
      .filter(isValidDateKey)
      .map(dateKey => Number(dateKey.slice(0, 4)));
    return years.length > 0 ? Math.min(...years) : this.year;
  }

  private renderDialog(): void {
    const task = this.task();
    if (!task) {
      this.content.innerHTML = '<p>タスクが見つかりません。</p>';
      return;
    }
    const status = task.history?.[this.editDate] || '';
    const statusLabel = status === 'completed' ? '完了' : status === 'cancelled' ? 'キャンセル' : '未実施';
    const firstYear = this.firstHistoryYear();
    const currentYear = new Date().getFullYear();

    this.content.innerHTML = `
      <header class="task-history-heading">
        <div>
          <p class="contributions-eyebrow">TASK HISTORY</p>
          <h2 id="taskHistoryTitle">${escapeHtml(task.text || '名称未設定')}</h2>
          <p>${escapeHtml(task.group?.trim() || 'グループなし')} ・ ${this.year}年</p>
        </div>
        <button type="button" class="task-history-close" data-action="close" aria-label="閉じる">閉じる</button>
      </header>
      <div class="task-history-year">
        <button type="button" data-action="year-step" data-step="-1" aria-label="前年" ${this.year <= firstYear ? 'disabled' : ''}>前年</button>
        <strong>${this.year}年</strong>
        <button type="button" data-action="year-step" data-step="1" aria-label="翌年" ${this.year >= currentYear ? 'disabled' : ''}>翌年</button>
      </div>
      <div class="task-history-graph-wrap">${this.renderTaskGraph(task)}</div>
      <div class="task-history-legend" aria-label="ステータスの凡例">
        <span><i class="task-history-cell is-uncompleted"></i>未実施</span>
        <span><i class="task-history-cell is-completed"></i>完了</span>
        <span><i class="task-history-cell is-cancelled"></i>キャンセル</span>
      </div>
      <section class="task-history-editor" aria-label="ステータス編集">
        <h3>ステータスを編集</h3>
        <label>日付<input type="date" data-edit-date value="${this.editDate}" /></label>
        <label>ステータス
          <select data-edit-status>
            <option value="" ${status === '' ? 'selected' : ''}>未実施</option>
            <option value="completed" ${status === 'completed' ? 'selected' : ''}>完了</option>
            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>キャンセル</option>
          </select>
        </label>
        <button type="button" class="task-history-save" data-action="save">ステータス変更</button>
        <p class="task-history-message" aria-live="polite">${this.editDate} の状態: ${statusLabel}</p>
      </section>
    `;
  }

  private renderTaskGraph(task: DoneTaskData): string {
    const firstDay = new Date(this.year, 0, 1);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());
    const lastDay = new Date(this.year, 11, 31);
    lastDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    const weeks: Date[][] = [];
    const cursor = new Date(firstDay);
    while (cursor <= lastDay) {
      const week: Date[] = [];
      for (let day = 0; day < 7; day += 1) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    const monthLabels = weeks
      .map((week, weekIndex) => {
        const firstMonthDay = week.find(
          date => date.getFullYear() === this.year && date.getDate() === 1,
        );
        return firstMonthDay
          ? `<span style="grid-column:${weekIndex + 1}">${new Intl.DateTimeFormat('ja-JP', {month: 'short'}).format(firstMonthDay)}</span>`
          : '';
      })
      .join('');
    const columns = weeks
      .map((week, weekIndex) => {
        const cells = week
          .map(date => {
            const dateKey = toDateKey(date);
            if (date.getFullYear() !== this.year) {
              return '<span class="task-history-cell is-outside" aria-hidden="true"></span>';
            }
            const value = task.history?.[dateKey];
            const statusClass = value === 'completed' ? ' is-completed' : value === 'cancelled' ? ' is-cancelled' : ' is-uncompleted';
            const label = value === 'completed' ? '完了' : value === 'cancelled' ? 'キャンセル' : '未実施';
            return `<button type="button" class="task-history-cell${statusClass}${dateKey === this.editDate ? ' is-selected' : ''}" data-action="history-date" data-date="${dateKey}" aria-label="${dateKey}: ${label}" title="${dateKey}: ${label}"></button>`;
          })
          .join('');
        return `<div class="task-history-week" style="grid-column:${weekIndex + 2}">${cells}</div>`;
      })
      .join('');
    return `<div class="task-history-graph" style="grid-template-columns:32px repeat(${weeks.length}, 12px)">
      <div class="task-history-months" style="grid-template-columns:repeat(${weeks.length}, 12px)">${monthLabels}</div>
      <span class="task-history-weekday task-history-weekday--mon">月</span>
      <span class="task-history-weekday task-history-weekday--wed">水</span>
      <span class="task-history-weekday task-history-weekday--fri">金</span>
      ${columns}
    </div>`;
  }

  private async saveStatus(button: HTMLButtonElement): Promise<void> {
    const task = this.task();
    const status = this.dialog.querySelector<HTMLSelectElement>('[data-edit-status]')?.value;
    const message = this.dialog.querySelector<HTMLElement>('.task-history-message');
    if (!task || !message || !isValidDateKey(this.editDate)) {
      return;
    }
    this.repository.hydrateFromLocal();
    const editableTask = this.repository.tasks.find(item => item.id === this.selectedTaskId);
    if (!editableTask) {
      message.textContent = 'タスクが見つかりません。';
      return;
    }
    if (status === 'completed' || status === 'cancelled') {
      editableTask.history[this.editDate] = status;
    } else {
      delete editableTask.history[this.editDate];
    }
    this.repository.recordTaskMutation();
    button.disabled = true;
    const savePromise = this.repository.saveTasksWithSync();
    window.dispatchEvent(new Event('storage'));
    this.renderDialog();
    this.renderSelectedActivity(true);
    const saveButton = this.dialog.querySelector<HTMLButtonElement>('[data-action="save"]');
    if (saveButton) {
      saveButton.disabled = true;
    }
    try {
      await savePromise;
      window.dispatchEvent(new Event('storage'));
      this.renderDialog();
      this.renderSelectedActivity(true);
      const updatedMessage = this.dialog.querySelector<HTMLElement>(
        '.task-history-message',
      );
      if (updatedMessage) {
        updatedMessage.textContent = `${this.editDate} の状態を保存しました。`;
      }
    } catch {
      window.dispatchEvent(new Event('storage'));
      this.renderDialog();
      this.renderSelectedActivity(true);
      const updatedMessage = this.dialog.querySelector<HTMLElement>(
        '.task-history-message',
      );
      if (updatedMessage) {
        updatedMessage.textContent = '端末には保存済みですが、Drive 同期に失敗しました。';
      }
    } finally {
      const currentSaveButton = this.dialog.querySelector<HTMLButtonElement>(
        '[data-action="save"]',
      );
      if (currentSaveButton) {
        currentSaveButton.disabled = false;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector<HTMLElement>('done-contributions');
  if (page) {
    new ContributionsTaskTools(page);
  }
});