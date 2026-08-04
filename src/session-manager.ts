import LocalStorageManager from './local-storage-manager';
import {
  getGoogleAccessToken,
  hasValidGoogleToken,
  isGoogleTokenExpiringSoon,
} from './google-auth';

const GOOGLE_SESSION_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
];

export default class SessionManager {
  private static readonly REFRESH_INTERVAL_MS = 60 * 1000;
  private static keepaliveTimerId: number | null = null;
  private static refreshInFlight = false;

  static startGoogleSessionKeepAlive(): void {
    if (SessionManager.keepaliveTimerId !== null) {
      return;
    }

    SessionManager.keepaliveTimerId = window.setInterval(() => {
      void SessionManager.refreshGoogleTokenIfNeeded();
    }, SessionManager.REFRESH_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void SessionManager.refreshGoogleTokenIfNeeded();
      }
    });

    window.addEventListener('focus', () => {
      void SessionManager.refreshGoogleTokenIfNeeded();
    });

    void SessionManager.refreshGoogleTokenIfNeeded();
  }

  private static async refreshGoogleTokenIfNeeded(): Promise<void> {
    if (SessionManager.refreshInFlight) {
      return;
    }
    if (!LocalStorageManager.googleClientIdEncrypted.trim()) {
      return;
    }
    if (hasValidGoogleToken() && !isGoogleTokenExpiringSoon()) {
      return;
    }

    SessionManager.refreshInFlight = true;
    try {
      await getGoogleAccessToken(GOOGLE_SESSION_SCOPES, false, true);
    } catch {
      // getGoogleAccessToken が期限切れトークンを破棄し、状態変更を通知する。
    } finally {
      SessionManager.refreshInFlight = false;
    }
  }
}
