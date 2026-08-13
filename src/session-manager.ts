import LocalStorageManager from './local-storage-manager';
import {
  GOOGLE_APP_SCOPES,
  getGoogleAccessToken,
  hasValidGoogleToken,
  isGoogleReloginRequired,
  isGoogleReloginRequiredError,
  isGoogleTokenExpiringSoon,
} from './google-auth';

export default class SessionManager {
  static readonly EVENT_GOOGLE_RELOGIN_REQUIRED =
    'done-google-session-relogin-required';
  static readonly EVENT_GOOGLE_SESSION_STATE_CHANGED =
    'done-google-session-state-changed';
  static readonly EVENT_GOOGLE_LOGIN_SUCCEEDED =
    'done-google-session-login-succeeded';
  static readonly EVENT_PAGE_ACTIVATED = 'done-page-activated';
  private static _started = false;
  private static _refreshInFlight = false;
  private static _pageActivationInFlight = false;
  private static _reloginNoticeSent = false;

  static startGoogleSessionKeepAlive(): void {
    if (SessionManager._started) {
      return;
    }
    SessionManager._started = true;

    void SessionManager.refreshGoogleSessionIfNeeded();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void SessionManager.handlePageActivation();
      }
    });

    window.addEventListener('focus', () => {
      void SessionManager.handlePageActivation();
    });
  }

  private static async handlePageActivation(): Promise<void> {
    if (SessionManager._pageActivationInFlight) {
      return;
    }

    SessionManager._pageActivationInFlight = true;
    try {
      await SessionManager.refreshGoogleSessionIfNeeded();
    } finally {
      SessionManager._pageActivationInFlight = false;
      document.dispatchEvent(
        new CustomEvent(SessionManager.EVENT_PAGE_ACTIVATED),
      );
    }
  }

  private static async refreshGoogleSessionIfNeeded(): Promise<void> {
    if (SessionManager._refreshInFlight || SessionManager._reloginNoticeSent) {
      SessionManager.notifyGoogleSessionStateChanged();
      return;
    }

    if (!LocalStorageManager.googleClientIdEncrypted.trim()) {
      SessionManager.notifyGoogleSessionStateChanged();
      return;
    }

    const hasToken = hasValidGoogleToken();
    if (!hasToken && !isGoogleReloginRequired()) {
      SessionManager.notifyGoogleSessionStateChanged();
      return;
    }

    if (hasToken && !isGoogleTokenExpiringSoon()) {
      SessionManager.notifyGoogleSessionStateChanged();
      return;
    }

    SessionManager._refreshInFlight = true;
    try {
      await getGoogleAccessToken(
        GOOGLE_APP_SCOPES,
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
      SessionManager.notifyGoogleSessionStateChanged();
    }
  }

  static notifyGoogleSessionStateChanged(): void {
    document.dispatchEvent(
      new CustomEvent(SessionManager.EVENT_GOOGLE_SESSION_STATE_CHANGED),
    );
  }

  static notifyGoogleLoginSucceeded(): void {
    document.dispatchEvent(
      new CustomEvent(SessionManager.EVENT_GOOGLE_LOGIN_SUCCEEDED),
    );
  }
}
