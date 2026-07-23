import NotificationManager from './notification-manager';

export default class RequestNotification extends HTMLElement {
  static get NAME(): string {
    return 'request-notification';
  }

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.setupEvents();
  }

  private render(): void {
    this.innerHTML = `
      <div id="notificationBanner" class="notification-banner" style="display: none">
        <span>タスクの時間になったらプッシュ通知でお知らせします</span>
        <button id="requestNotificationBtn" class="btn btn-cancel">通知を有効にする</button>
      </div>
    `;
  }

  private setupEvents(): void {
    const banner = this.querySelector(
      '#notificationBanner',
    ) as HTMLElement | null;
    const requestButton = this.querySelector(
      '#requestNotificationBtn',
    ) as HTMLButtonElement | null;

    NotificationManager.syncBannerVisibility(banner);

    if (!requestButton) {
      return;
    }

    requestButton.addEventListener('click', async () => {
      const permission = await NotificationManager.requestPermission();
      NotificationManager.syncBannerVisibility(banner);
      if (permission === 'granted') {
        alert('プッシュ通知が有効になりました！');
      }
    });
  }
}

if (!customElements.get(RequestNotification.NAME)) {
  customElements.define(RequestNotification.NAME, RequestNotification);
}
