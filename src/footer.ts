import packageJson from '../package.json';

const APP_VERSION = packageJson.version;

export default class Footer extends HTMLElement {
  static get NAME(): string {
    return 'done-footer';
  }

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    this.innerHTML = `
      <footer class="app-footer">
        <div class="app-footer__meta">
          <span class="app-footer__version">v${APP_VERSION}</span>
          <span class="app-footer__separator">·</span>
          <a href="https://github.com/tanjoin/done" target="_blank" rel="noopener noreferrer" style="text-decoration: none">GitHub</a>
          <span class="app-footer__copyright">&copy; 2026 done by tanjoin</span>
        </div>
      </footer>
    `;
  }
}

if (!customElements.get(Footer.NAME)) {
  customElements.define(Footer.NAME, Footer);
}
