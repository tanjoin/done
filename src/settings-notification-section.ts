import LocalStorageManager from './local-storage-manager';
import NotificationManager from './notification-manager';
import NotificationSound from './notification-sound';

export default class SettingsNotificationSection {
  static render(): string {
    return `
      ${SettingsNotificationSection.renderSound()}
      ${SettingsNotificationSection.renderNotification()}
    `;
  }

  private static renderSound(): string {
    const soundOptions = NotificationSound.options
      .map(option => `<option value="${option.value}">${option.label}</option>`)
      .join('');

    return `
      <div class="data-box" id="soundSection">
        <h3 class="group-title">通知音設定</h3>
        <p class="setting-desc">通知で使うサウンドを選択します。</p>
        <div class="setting-row">
          <label for="notificationSoundSelect">通知音</label>
          <select id="notificationSoundSelect" class="setting-input">
            ${soundOptions}
          </select>
        </div>
        <div class="btn-group-wrap">
          <button id="playSoundTestBtn" class="btn btn-action">サウンドをテスト</button>
        </div>
      </div>
    `;
  }

  private static renderNotification(): string {
    return `
      <div class="data-box" id="notificationSection">
        <h3 class="group-title">通知テスト</h3>
        <p class="setting-desc">
          ブラウザ通知が届くか確認できます。まず通知を有効にしてください。
        </p>
        <div class="btn-group-wrap">
          <button id="notificationEnableBtn" class="btn btn-cancel">通知を有効にする</button>
          <button id="sendTestNotificationBtn" class="btn btn-action">テスト通知を送信</button>
        </div>
      </div>
    `;
  }

  static setup(root: ParentNode): void {
    SettingsNotificationSection.setupSound(root);
    SettingsNotificationSection.setupNotification(root);
  }

  private static setupSound(root: ParentNode): void {
    const soundSelect = root.querySelector('#notificationSoundSelect') as HTMLSelectElement | null;
    const playBtn = root.querySelector('#playSoundTestBtn') as HTMLButtonElement | null;

    if (soundSelect) {
      soundSelect.value = LocalStorageManager.notificationSound;
      soundSelect.addEventListener('change', () => {
        LocalStorageManager.notificationSound = soundSelect.value;
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        NotificationSound.playSelected();
      });
    }
  }

  private static setupNotification(root: ParentNode): void {
    const notificationSection = root.querySelector('#notificationSection') as HTMLElement | null;
    const enableBtn = root.querySelector('#notificationEnableBtn') as HTMLButtonElement | null;
    const testBtn = root.querySelector('#sendTestNotificationBtn') as HTMLButtonElement | null;

    if (!NotificationManager.isSupported()) {
      if (notificationSection) {
        notificationSection.style.display = 'none';
      }
      return;
    }

    NotificationManager.syncTestButtons(enableBtn, testBtn);

    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        const permission = await NotificationManager.requestPermission();
        NotificationManager.syncTestButtons(enableBtn, testBtn);
        if (permission === 'granted') {
          alert('通知を有効にしました。');
        }
      });
    }

    if (testBtn) {
      testBtn.addEventListener('click', () => {
        if (!NotificationManager.sendTestNotification()) {
          alert('先に通知を有効にしてください。');
        }
      });
    }
  }
}
