import LocalStorageManager from './local-storage-manager.js';

export const TEMPORARY_HISTORY_TAG_NAME = 'done-temporary-history';
export const TEMPORARY_HISTORY_EVENT_HISTORY_ADD = 'done-temporary-history-add';
export const TEMPORARY_HISTORY_EVENT_RENDER_HISTORY = 'done-temporary-history-render-history';

export type TemporaryHistoryItem = {
  id: string;
  description: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  group: string | null;
  remindMinutesBefore: number | null;
  text: string;
  link: string | null;
  strictMode: boolean | null;
}

export class TemporaryHistory extends HTMLElement {

  private _tempHistory: TemporaryHistoryItem[] = [];

  static get NAME(): string {
    return TEMPORARY_HISTORY_TAG_NAME;
  }

  handleCopyToFormEvent(detail: TemporaryHistoryItem) {
    if (detail) {
      let keys = Object.keys(detail) as (keyof TemporaryHistoryItem)[];
      for (const inputId of keys) {
        const inputElement = document.getElementById(inputId) as HTMLInputElement | null;
        if (inputElement) {
          if (inputId === 'strictMode') {
            inputElement.checked = detail.strictMode || false;
          } else {
            inputElement.value = String(detail[inputId as keyof TemporaryHistoryItem] ?? '');
          }
        }
      }
    }
  }

  connectedCallback(): void {
    this.render();
    this.init();
  }

  init() {
    this.loadTempHistoryFromStorage();
    this.renderHistory();
    
    document.addEventListener(TEMPORARY_HISTORY_EVENT_HISTORY_ADD, (event: Event) => {
      const customEvent = event as CustomEvent<TemporaryHistoryItem>;
      this.addHistoryItem(customEvent.detail);
    });

    document.addEventListener(TEMPORARY_HISTORY_EVENT_RENDER_HISTORY, () => {
      this.renderHistory();
    });
  }

  addHistoryItem(item: TemporaryHistoryItem) {
    this._tempHistory.unshift(item);
    if (this._tempHistory.length > 20) {
      this._tempHistory.pop();
    }
    LocalStorageManager.temporaryInputHistory = this._tempHistory;
    alert('一時的タスクの履歴に追加しました。');
    this.renderHistory();
  }

  private loadTempHistoryFromStorage() {
    this._tempHistory = LocalStorageManager.temporaryInputHistory;
  }

  private render(): void {
    this.innerHTML = `
      <div style="margin-top: 40px; margin-bottom: 16px;">
          <h3 class="group-title">過去に追加した一時的タスク（クリックで内容をコピー）</h3>
          <div id="historyContainer" style="margin-top: 16px;"></div>
      </div>
    `;
  }

  // 過去履歴からパラメータをフォームにコピー（再利用）
  private copyTemplateToForm(id: string) {
    const item = this._tempHistory.find(t => t.id === id);
    if (!item) return;
    this.handleCopyToFormEvent(item);
    // 画面上部へスムーズにスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 履歴の削除
  private deleteHistory(id: string, event: Event) {
    event.stopPropagation(); // コピー処理の発火を防ぐ
    this._tempHistory = this._tempHistory.filter(t => t.id !== id);
    LocalStorageManager.temporaryInputHistory = this._tempHistory;
    this.renderHistory();
  }

  // 履歴一覧の描画
  private renderHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    container.innerHTML = '';

    if (this._tempHistory.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">過去に追加したタスク履歴はありません。</p>';
      return;
    }

    this._tempHistory.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';

      const timeStr = (item.startTime || item.endTime) ? ` (${item.startTime || '00:00'}〜${item.endTime || '23:59'})` : '';
      const remindStr = item.remindMinutesBefore !== null && item.remindMinutesBefore !== undefined
        ? `<br><small>通知: ${item.remindMinutesBefore} 分前</small>`
        : '';
      const groupStr = item.group ? `[${item.group}] ` : '';
      const endDateStr = item.endDate ? `<br><small>終了日: ${item.endDate}</small>` : '';

      div.innerHTML = `
            <div class="history-info">
                <strong>${groupStr}${item.text}</strong>${timeStr}
                ${remindStr}
                ${item.description ? `<br><small>${item.description}</small>` : ''}
                ${endDateStr}
            </div>
            <div>
                <button class="btn-reuse">再利用</button>
                <button class="btn-delete">削除</button>
            </div>
        `;
      div.querySelector('.btn-reuse')?.addEventListener('click', (event) => {
        this.copyTemplateToForm(item.id);
      });
      div.querySelector('.btn-delete')?.addEventListener('click', (event) => {
        this.deleteHistory(item.id, event);
      });
      container.appendChild(div);
    });
  }
}

if (!customElements.get(TEMPORARY_HISTORY_TAG_NAME)) {
  customElements.define(TEMPORARY_HISTORY_TAG_NAME, TemporaryHistory);
}
