import LocalStorageManager from './local-storage-manager';
import type {DoneTheme} from './types';

export default class SettingsThemeSection {
  static render(): string {
    return `
      <div class="data-box" id="themeSection">
        <h3 class="group-title">テーマ設定</h3>
        <form id="themeForm">
          <label class="theme-option">
            <input type="radio" name="theme" value="system" />
            <span>システム設定に従う</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="light" />
            <span>ライトモード</span>
          </label>
          <label class="theme-option">
            <input type="radio" name="theme" value="dark" />
            <span>ダークモード</span>
          </label>
        </form>
      </div>
    `;
  }

  static applyTheme(theme: DoneTheme): void {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      return;
    }
    root.setAttribute('data-theme', theme);
  }

  static setup(root: ParentNode): void {
    const selectedTheme = LocalStorageManager.appTheme;
    SettingsThemeSection.applyTheme(selectedTheme);

    const selectedRadio = root.querySelector(
      `input[name="theme"][value="${selectedTheme}"]`,
    ) as HTMLInputElement | null;

    if (selectedRadio) {
      selectedRadio.checked = true;
    }

    const radios = root.querySelectorAll('input[name="theme"]') as NodeListOf<HTMLInputElement>;

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        const theme = radio.value as DoneTheme;
        LocalStorageManager.appTheme = theme;
        SettingsThemeSection.applyTheme(theme);
      });
    });
  }
}
