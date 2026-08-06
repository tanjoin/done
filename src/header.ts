import LocalStorageManager from './local-storage-manager';
import {
  clearGoogleToken,
  getGoogleAccessToken,
  GOOGLE_APP_SCOPES,
  hasValidGoogleToken,
} from './google-auth';
import SessionManager from './session-manager';

type HeaderNavLink = 'index' | 'settings' | 'json-organizer';

export default class Header extends HTMLElement {
  private _activeLink: HeaderNavLink = 'index';

  static get NAME(): string {
    return 'done-header';
  }

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
    this.setupGoogleLoginButton();
  }

  set active(link: HeaderNavLink) {
    this._activeLink = link;
    const links = this.querySelectorAll('.nav-link');
    links.forEach(el => el.classList.remove('active'));
    const activeLink = this.querySelector(`.nav-link[href="${link}.html"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  private render(): void {
    this.innerHTML = `
      <header class="nav-bar">
        <div class="nav-links">
          <a href="index.html" class="nav-link ${this._activeLink === 'index' ? 'active' : ''}">タスク一覧</a>
          <a href="json-organizer.html" class="nav-link ${this._activeLink === 'json-organizer' ? 'active' : ''}">JSON整理</a>
          <a href="settings.html" class="nav-link ${this._activeLink === 'settings' ? 'active' : ''}">設定・データ管理</a>
        </div>
        <button id="googleHeaderLoginBtn" class="google-header-login" type="button" aria-live="polite"></button>
      </header>
    `;
  }

  private setupGoogleLoginButton(): void {
    const button = this.querySelector(
      '#googleHeaderLoginBtn',
    ) as HTMLButtonElement | null;
    if (!button) {
      return;
    }

    const updateState = () => {
      const configured = Boolean(
        LocalStorageManager.googleClientIdEncrypted.trim(),
      );
      const loggedIn = hasValidGoogleToken();
      button.disabled = !configured;
      button.classList.toggle('is-connected', loggedIn);
      button.classList.toggle('is-error', configured && !loggedIn);
      button.textContent = !configured
        ? 'Google 未設定'
        : loggedIn
          ? 'Google 接続済み'
          : 'Google ログイン';
      button.title = loggedIn
        ? 'Google からログアウト'
        : configured
          ? 'Google にログイン'
          : '設定画面で OAuth Client ID を登録してください';
    };

    updateState();
    document.addEventListener(
      SessionManager.EVENT_GOOGLE_SESSION_STATE_CHANGED,
      updateState,
    );
    button.addEventListener('click', async () => {
      if (hasValidGoogleToken()) {
        clearGoogleToken();
        SessionManager.notifyGoogleSessionStateChanged();
        return;
      }

      button.disabled = true;
      button.textContent = 'Google 接続中...';
      try {
        await getGoogleAccessToken(GOOGLE_APP_SCOPES, true);
      } catch {
        button.classList.add('is-error');
      } finally {
        SessionManager.notifyGoogleSessionStateChanged();
      }
    });
  }
}

if (!customElements.get(Header.NAME)) {
  customElements.define(Header.NAME, Header);
}
