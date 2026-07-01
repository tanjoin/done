import { DoneSwitchViewMode } from './types';
import LocalStorageManager from './local-storage-manager';

export default class IndexSwitchViewMode extends HTMLElement {

  static get NAME(): string {
    return 'done-index-switch-view-mode';
  }

  static get ELEMENT(): string {
    return `<${this.NAME}></${this.NAME}>`;
  }

  static get EVENT_VIEW_MODE_CHANGE(): string {
    return 'done-viewmodechange';
  }

  connectedCallback(): void {
    this.render();
    this.setupEvents();
  }

  private render(): void {
    this.innerHTML = `
      <div class="view-mode-switch" role="group" aria-label="表示モード切り替え">
        <span class="view-mode-label">表示モード</span>
        <label class="switch-pill" for="viewModeToggle">
          <input type="checkbox" id="viewModeToggle" />
          <span class="switch-track">
            <span class="switch-text-left">カード</span>
            <span class="switch-text-right">一覧</span>
            <span class="switch-thumb"></span>
          </span>
        </label>
      </div>
      `;
  }

  private setupEvents(): void {
    const viewModeToggle = this.querySelector('#viewModeToggle') as HTMLInputElement | null;
    if (!viewModeToggle) return;

    // 1. データの初期同期
    const savedViewMode = LocalStorageManager.taskViewMode || 'card';
    viewModeToggle.checked = savedViewMode === 'table';

    // 2. イベントリスナーの設定
    viewModeToggle.addEventListener('change', () => {
      const mode: DoneSwitchViewMode = viewModeToggle.checked ? 'table' : 'card';
      LocalStorageManager.taskViewMode = mode;

      // 外部にモード変更を通知（renderCards 等を動かすため）
      this.dispatchEvent(new CustomEvent(IndexSwitchViewMode.EVENT_VIEW_MODE_CHANGE, {
        detail: { mode },
        bubbles: true
      }));
    });
  }
};

if (!customElements.get(IndexSwitchViewMode.NAME)) {
  customElements.define(IndexSwitchViewMode.NAME, IndexSwitchViewMode);
}
