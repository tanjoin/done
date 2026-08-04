import './style.css';
import Footer from './footer';
import Header from './header';
import TaskRepository from './task-repository';
import SettingsCalendarSection from './settings-calendar-section';
import SettingsDataSection from './settings-data-section';
import SettingsDisplaySection from './settings-display-section';
import SettingsNotificationSection from './settings-notification-section';
import SettingsThemeSection from './settings-theme-section';
import SessionManager from './session-manager';
import GoogleAuthAlertController, {
  renderGoogleAuthAlert,
} from './google-auth-alert';

class Settings extends HTMLElement {
  private readonly _taskRepository: TaskRepository = new TaskRepository();
  private _googleAuthAlertController: GoogleAuthAlertController | null = null;

  static get NAME(): string {
    return 'done-settings';
  }

  connectedCallback(): void {
    this.render();
    void this.setup();
  }

  private render(): void {
    this.innerHTML = `
      <main>
        ${renderGoogleAuthAlert({
          statusId: 'googleAuthStatus',
          messageId: 'googleAuthStatusMessage',
          actionButtonId: 'googleAuthStatusActionBtn',
          dismissButtonId: 'googleAuthStatusDismissBtn',
          actionLabel: 'Google にログイン',
          dismissAriaLabel: 'Google認証通知を閉じる',
        })}
        ${SettingsCalendarSection.render()}
        ${SettingsThemeSection.render()}
        ${SettingsDisplaySection.render()}
        ${SettingsNotificationSection.render()}
        ${SettingsDataSection.render()}
      </main>
    `;
  }

  private async setup(): Promise<void> {
    SessionManager.startGoogleSessionKeepAlive();
    this._taskRepository.hydrateFromLocal();

    this._googleAuthAlertController = new GoogleAuthAlertController({
      root: this,
      ids: {
        statusId: 'googleAuthStatus',
        messageId: 'googleAuthStatusMessage',
        actionButtonId: 'googleAuthStatusActionBtn',
        dismissButtonId: 'googleAuthStatusDismissBtn',
      },
      onAction: () => {
        const googleLoginButton = this.querySelector(
          '#googleLoginBtn',
        ) as HTMLButtonElement | null;
        if (googleLoginButton) {
          void googleLoginButton.click();
        }
      },
    });
    this._googleAuthAlertController.setup();

    SettingsThemeSection.setup(this);
    SettingsCalendarSection.setup(this, this._googleAuthAlertController);
    SettingsDisplaySection.setup(this);
    SettingsNotificationSection.setup(this);
    SettingsDataSection.setup(this, this._taskRepository);

    document.addEventListener(
      TaskRepository.EVENT_GOOGLE_RELOGIN_NOTICE,
      (event: Event) => {
        const customEvent = event as CustomEvent<{message: string}>;
        this._googleAuthAlertController?.show(customEvent.detail.message);
      },
    );

    document.addEventListener(
      SessionManager.EVENT_GOOGLE_RELOGIN_REQUIRED,
      () => {
        this._googleAuthAlertController?.show(
          'Google認証の有効期限が切れました。設定画面で再ログインしてください。',
        );
      },
    );

    document.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const link = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!link) {
        return;
      }
      if (link.getAttribute('href') !== 'index.html') {
        return;
      }
      TaskRepository.markNextIndexNavigationFromSettings();
    });

    void this._taskRepository.refreshFromCloudIfNeeded();
  }
}

if (!customElements.get(Settings.NAME)) {
  customElements.define(Settings.NAME, Settings);
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('.container');
  if (!container) {
    return;
  }

  const header = document.createElement(Header.NAME) as Header;
  header.active = 'settings';
  container.appendChild(header);

  const settings = document.createElement(Settings.NAME) as Settings;
  container.appendChild(settings);

  const footer = document.createElement(Footer.NAME) as Footer;
  container.appendChild(footer);
});
