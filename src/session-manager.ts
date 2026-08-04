import LocalStorageManager from './local-storage-manager';
import {
  getGoogleAccessToken,
  hasValidGoogleToken,
  isGoogleReloginRequired,
  isGoogleReloginRequiredError,
  isGoogleTokenExpiringSoon,
} from './google-auth';

const GOOGLE_SESSION_KEEPALIVE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
];

export default class SessionManager {
  static readonly EVENT_GOOGLE_RELOGIN_REQUIRED =
    'done-google-session-relogin-required';
  private static readonly KEEPALIVE_INTERVAL_MS = 60 * 1000;
  private static _keepaliveTimerId: number | null = null;
  private static _refreshInFlight = false;
  private static _reloginNoticeSent = false;

  static startGoogleSessionKeepAlive(): void {
    if (SessionManager._keepaliveTimerId !== null) {
      return;
    }

    SessionManager._keepaliveTimerId = window.setInterval(() => {
      void SessionManager.refreshGoogleSessionIfNeeded();
    }, SessionManager.KEEPALIVE_INTERVAL_MS);

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
    if (SessionManager._refreshInFlight || SessionManager._reloginNoticeSent) {
      return;
    }

    if (!LocalStorageManager.googleClientIdEncrypted.trim()) {
      return;
    }

    const hasToken = hasValidGoogleToken();
    if (!hasToken && !isGoogleReloginRequired()) {
      return;
    }

    if (hasToken && !isGoogleTokenExpiringSoon()) {
      return;
    }

    SessionManager._refreshInFlight = true;
    try {
      await getGoogleAccessToken(
        GOOGLE_SESSION_KEEPALIVE_SCOPES,
        false,
        true,
      );
    } catch (error) {
      if (isGoogleReloginRequiredError(error)) {
        SessionManager._reloginNoticeSent = true;
        document.dispatchEvent(
          new CustomEvent(SessionManager.EVENT_GOOGLE_RELOGIN_REQUIRED),
        );
      }
    } finally {
      SessionManager._refreshInFlight = false;
    }
  }
}
