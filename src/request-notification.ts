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
        <button class="btn btn-cancel" onclick="requestPermission()">通知を有効にする</button>
      </div>
    `;
  }

  private setupEvents(): void {
    RequestNotification.checkNotificationPermission();
  }

  static checkNotificationPermission(): void {
    const banner = document.getElementById('notificationBanner');
    if (!banner) return;
    if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
      banner.style.display = 'none';
      return;
    }
    banner.style.display = (Notification.permission === 'default') ? 'flex' : 'none';
  }
};

if (!customElements.get(RequestNotification.NAME)) {
  customElements.define(RequestNotification.NAME, RequestNotification);
}
