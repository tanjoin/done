import LocalStorageManager from './local-storage-manager';

export default class IndexFilterControls extends HTMLElement {
  static get NAME(): string {
    return 'done-index-filter-controls';
  }

  static get ELEMENT(): string {
    return `<${this.NAME}></${this.NAME}>`;
  }

  static get EVENT_FILTER_CHANGE(): string {
    return 'done-filterchange';
  }

  connectedCallback(): void {
    this.render();
    this.setupEvents();
  }

  private render(): void {
    this.innerHTML = `
      <div id="filterControls" class="filter-controls">
        <div class="filter-button-item">
          <span class="view-mode-label">該当日外</span>
          <button id="hideNonTargetDayBtn" type="button" class="filter-toggle-btn" aria-pressed="false">
            表示
          </button>
        </div>
        <div class="filter-button-item">
          <span class="view-mode-label">時間外</span>
          <button id="hideOutOfTimeBtn" type="button" class="filter-toggle-btn" aria-pressed="false">
            表示
          </button>
        </div>
        <div class="filter-button-item">
          <span class="view-mode-label">追加済み</span>
          <button id="hideCompletedBtn" type="button" class="filter-toggle-btn" aria-pressed="false">
            表示
          </button>
        </div>
        <div class="filter-button-item">
          <span class="view-mode-label">キャンセル済</span>
          <button id="hideCancelledBtn" type="button" class="filter-toggle-btn" aria-pressed="false">
            表示
          </button>
        </div>
      </div>
      `;
  }

  private setupEvents(): void {
    this.setupHideNonTargetDayBtn();
    this.setupHideOutOfTimeBtn();
    this.setupHideCompletedBtn();
    this.setupHideCancelledBtn();
  }

  private setupHideNonTargetDayBtn(): void {
    const hideNonTargetDayBtn = this.querySelector(
      '#hideNonTargetDayBtn',
    ) as HTMLButtonElement | null;
    if (!hideNonTargetDayBtn) return;
    this.setFilterButtonState(
      hideNonTargetDayBtn,
      LocalStorageManager.filterHideNonTargetDay,
    );
    hideNonTargetDayBtn.addEventListener('click', () =>
      this.toggleFilterState(
        hideNonTargetDayBtn,
        LocalStorageManager.FILTER_HIDE_NON_TARGET_DAY_KEY,
      ),
    );
  }

  private setupHideOutOfTimeBtn(): void {
    const hideOutOfTimeBtn = this.querySelector(
      '#hideOutOfTimeBtn',
    ) as HTMLButtonElement | null;
    if (!hideOutOfTimeBtn) return;
    this.setFilterButtonState(
      hideOutOfTimeBtn,
      LocalStorageManager.filterHideOutOfTime,
    );
    hideOutOfTimeBtn.addEventListener('click', () =>
      this.toggleFilterState(
        hideOutOfTimeBtn,
        LocalStorageManager.FILTER_HIDE_OUT_OF_TIME_KEY,
      ),
    );
  }

  private setupHideCompletedBtn(): void {
    const hideCompletedBtn = this.querySelector(
      '#hideCompletedBtn',
    ) as HTMLButtonElement | null;
    if (!hideCompletedBtn) return;
    this.setFilterButtonState(
      hideCompletedBtn,
      LocalStorageManager.filterHideCompleted,
    );
    hideCompletedBtn.addEventListener('click', () =>
      this.toggleFilterState(
        hideCompletedBtn,
        LocalStorageManager.FILTER_HIDE_COMPLETED_KEY,
      ),
    );
  }

  private setupHideCancelledBtn(): void {
    const hideCancelledBtn = this.querySelector(
      '#hideCancelledBtn',
    ) as HTMLButtonElement | null;
    if (!hideCancelledBtn) return;
    this.setFilterButtonState(
      hideCancelledBtn,
      LocalStorageManager.filterHideCancelled,
    );
    hideCancelledBtn.addEventListener('click', () =>
      this.toggleFilterState(
        hideCancelledBtn,
        LocalStorageManager.FILTER_HIDE_CANCELLED_KEY,
      ),
    );
  }

  private setFilterButtonState(
    button: HTMLButtonElement,
    isHidden: boolean,
  ): void {
    if (!button) return;
    button.classList.toggle('is-hidden', isHidden);
    button.setAttribute('aria-pressed', String(isHidden));
    button.textContent = isHidden ? '非表示' : '表示';
  }

  private toggleFilterState(button: HTMLButtonElement, key: string): void {
    const newState = !LocalStorageManager.getFilter(key);
    LocalStorageManager.setFilter(key, newState);
    this.setFilterButtonState(button, newState);
    this.dispatchEvent(
      new CustomEvent(IndexFilterControls.EVENT_FILTER_CHANGE, {
        detail: {filter: button.id, isHidden: newState},
        bubbles: true,
      }),
    );
  }
}

if (!customElements.get(IndexFilterControls.NAME)) {
  customElements.define(IndexFilterControls.NAME, IndexFilterControls);
}
