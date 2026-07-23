import LocalStorageManager from './local-storage-manager';

export default class SettingsCalendarSection {
  static render(): string {
    return `
      <div class="data-box" id="calendarSection">
        <h3 class="group-title">カレンダー連携設定</h3>
        <p class="setting-desc">
          特定のカレンダーに登録したい場合は、Googleカレンダーの設定と共有から確認できるカレンダーIDを入力してください。
        </p>
        <form id="calendarIdForm" class="setting-form">
          <input
            type="text"
            id="calendarIdInput"
            placeholder="カレンダーIDを入力（例: xxx@group.calendar.google.com）"
            class="setting-input"
          />
          <div class="form-actions-row">
            <button type="submit" class="btn btn-action">設定を保存する</button>
            <span id="saveStatus" class="save-status-msg">保存しました</span>
          </div>
        </form>
      </div>
    `;
  }

  static setup(root: ParentNode): void {
    const section = root.querySelector('#calendarSection') as HTMLElement | null;
    const input = root.querySelector('#calendarIdInput') as HTMLInputElement | null;
    const form = root.querySelector('#calendarIdForm') as HTMLFormElement | null;
    const saveStatus = root.querySelector('#saveStatus') as HTMLElement | null;

    const supportsStorage = LocalStorageManager.supportsLocalStorage();

    if (!supportsStorage) {
      if (section) {
        section.style.display = 'none';
      }
      return;
    }

    if (!input || !form) {
      return;
    }

    input.value = LocalStorageManager.calendarTargetId;

    form.addEventListener('submit', event => {
      event.preventDefault();
      LocalStorageManager.calendarTargetId = input.value.trim();
      if (saveStatus) {
        saveStatus.style.display = 'inline';
        setTimeout(() => {
          saveStatus.style.display = 'none';
        }, 2500);
      }
    });
  }
}
