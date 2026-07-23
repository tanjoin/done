import DoneTask from './done-task';
import NotificationSound from './notification-sound';
import type {DoneTaskData} from './types';

const NOTIFICATION_ICON_URL = new URL('../public/icon-192.png', import.meta.url)
  .href;

export default class NotificationManager {
  static isSupported(): boolean {
    return (
      'Notification' in window &&
      typeof Notification.requestPermission === 'function'
    );
  }

  static syncBannerVisibility(banner: HTMLElement | null): void {
    if (!banner) {
      return;
    }
    if (!NotificationManager.isSupported()) {
      banner.style.display = 'none';
      return;
    }
    banner.style.display =
      Notification.permission === 'default' ? 'flex' : 'none';
  }

  static syncTestButtons(
    enableBtn: HTMLButtonElement | null,
    testBtn: HTMLButtonElement | null,
  ): void {
    if (!enableBtn) {
      return;
    }

    if (!NotificationManager.isSupported()) {
      enableBtn.style.display = 'none';
      if (testBtn) {
        testBtn.style.display = 'none';
      }
      return;
    }

    const isGranted = Notification.permission === 'granted';
    enableBtn.style.display = isGranted ? 'none' : 'inline-flex';
    if (testBtn) {
      testBtn.disabled = !isGranted;
      testBtn.title = isGranted ? '' : '先に通知を有効にしてください。';
    }
  }

  static async requestPermission(): Promise<NotificationPermission | null> {
    if (!NotificationManager.isSupported()) {
      return null;
    }
    return Notification.requestPermission();
  }

  static sendTestNotification(): boolean {
    if (
      !NotificationManager.isSupported() ||
      Notification.permission !== 'granted'
    ) {
      return false;
    }

    const notification = new Notification('通知テスト', {
      body: 'done からのテスト通知です。表示されていれば設定は正常です。',
      icon: NOTIFICATION_ICON_URL,
    });

    notification.onclick = (event: Event) => {
      event.preventDefault();
      window.focus();
    };

    NotificationSound.playSelected();
    return true;
  }

  static notifyTask(task: DoneTask | DoneTaskData, bodyText: string): void {
    const normalizedTask = task instanceof DoneTask ? task : new DoneTask(task);

    const notification = new Notification(
      `[${normalizedTask.normalizeGroup()}] タスクの時間です`,
      {
        body: bodyText,
        icon: NOTIFICATION_ICON_URL,
      },
    );

    notification.onclick = (event: Event) => {
      event.preventDefault();
      const targetUrl = new URL('/done', window.location.href).href;
      window.open(targetUrl, '_blank');
    };

    NotificationSound.playSelected();
  }
}
