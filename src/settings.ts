import './style.css';
import Footer from './footer';
import Header from './header';
import TaskRepository from './task-repository';
import SettingsCalendarSection from './settings-calendar-section';
import SettingsDataSection from './settings-data-section';
import SettingsDisplaySection from './settings-display-section';
import SettingsNotificationSection from './settings-notification-section';
import SettingsThemeSection from './settings-theme-section';

class Settings extends HTMLElement {
  private readonly _taskRepository: TaskRepository = new TaskRepository();

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
        ${SettingsCalendarSection.render()}
        ${SettingsThemeSection.render()}
        ${SettingsDisplaySection.render()}
        ${SettingsNotificationSection.render()}
        ${SettingsDataSection.render()}
      </main>
    `;
  }

  private async setup(): Promise<void> {
    await this._taskRepository.loadTasks();
    SettingsThemeSection.setup(this);
    SettingsCalendarSection.setup(this);
    SettingsDisplaySection.setup(this);
    SettingsNotificationSection.setup(this);
    SettingsDataSection.setup(this, this._taskRepository);
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
