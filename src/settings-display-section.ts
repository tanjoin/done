import LocalStorageManager from './local-storage-manager';

export default class SettingsDisplaySection {
  static render(): string {
    return `
      <div class="data-box" id="displaySection">
        <h3 class="group-title">表示設定</h3>
        <p class="setting-desc">
          前日以前の未完了タスクを表示する開始日を設定します。
        </p>
        <form id="overdueReferenceDateForm" class="setting-form">
          <input type="date" id="overdueReferenceDateInput" class="setting-input" />
          <div class="form-actions-row">
            <button type="submit" class="btn btn-action">表示基準日を保存する</button>
            <span id="displaySaveStatus" class="save-status-msg">保存しました</span>
          </div>
        </form>
      </div>
    `;
  }

  static setup(root: ParentNode): void {
    const input = root.querySelector(
      '#overdueReferenceDateInput',
    ) as HTMLInputElement | null;
    const form = root.querySelector(
      '#overdueReferenceDateForm',
    ) as HTMLFormElement | null;
    const saveStatus = root.querySelector(
      '#displaySaveStatus',
    ) as HTMLElement | null;

    if (!input || !form) {
      return;
    }

    input.value = LocalStorageManager.overdueReferenceDate;

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!input.value) {
        return;
      }
      LocalStorageManager.overdueReferenceDate = input.value;
      if (saveStatus) {
        saveStatus.style.display = 'inline';
        setTimeout(() => {
          saveStatus.style.display = 'none';
        }, 2500);
      }
    });
  }
}
