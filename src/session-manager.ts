import LocalStorageManager from './local-storage-manager';
import {
  getGoogleAccessToken,
  hasValidGoogleToken,
  isGoogleTokenExpiringSoon,
} from './google-auth';

const GOOGLE_SESSION_KEEPALIVE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
];

export default class SessionManager {
  private static readonly KEEPALIVE_INTERVAL_MS = 60 * 1000;
  private static _keepaliveTimerId: number | null = null;
  private static _refreshInFlight = false;

  static startGoogleSessionKeepAlive(): void {
    if (SessionManager._keepaliveTimerId !== null) {
      return;
    }

    SessionManager._keepaliveTimerId = window.setInterval(() => {
      void SessionManager.refreshGoogleSessionIfNeeded();
    }, SessionManager.KEEPALIVE_INTERVAL_MS);

    // 起動直後に一度だけ評価し、期限間近なら即時更新する。
    void SessionManager.refreshGoogleSessionIfNeeded();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void SessionManager.refreshGoogleSessionIfNeeded();
      }
    });

    window.addEventListener('focus', () => {
      void SessionManager.refreshGoogleSessionIfNeeded();
    });
  }

  private static async refreshGoogleSessionIfNeeded(): Promise<void> {
    if (SessionManager._refreshInFlight) {
      return;
    }

    if (!LocalStorageManager.googleClientIdEncrypted.trim()) {
      return;
    }

    if (!hasValidGoogleToken()) {
      return;
    }

    if (!isGoogleTokenExpiringSoon()) {
      return;
    }

    SessionManager._refreshInFlight = true;
    try {
      await getGoogleAccessToken(
        GOOGLE_SESSION_KEEPALIVE_SCOPES,
        false,
        true,
      );
    } catch {
      // 再認証が必要な場合は既存フロー側でハンドリングする。
    } finally {
      SessionManager._refreshInFlight = false;
    }
  }
}
