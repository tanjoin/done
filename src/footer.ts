const COMMIT_SHA =
  (globalThis as { __APP_GIT_COMMIT_SHA__?: string }).__APP_GIT_COMMIT_SHA__ ||
  'dev';

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
    const shortSha = COMMIT_SHA.length > 7 ? COMMIT_SHA.slice(0, 7) : COMMIT_SHA;
    const commitUrl = `https://github.com/tanjoin/done/commit/${COMMIT_SHA}`;
    this.innerHTML = `
      <footer class="app-footer">
        <div class="app-footer__spacer" aria-hidden="true"></div>
        <div class="app-footer__meta">
          <div class="app-footer__line app-footer__line--primary">
            <a href="https://github.com/tanjoin/done" target="_blank" rel="noopener noreferrer" style="text-decoration: none">GitHub</a>
            <span class="app-footer__separator">·</span>
            <span class="app-footer__copyright">&copy; 2026 done by tanjoin</span>
          </div>
          <div class="app-footer__line app-footer__line--commit">
            <a class="app-footer__commit" href="${commitUrl}" target="_blank" rel="noopener noreferrer">${shortSha}</a>
          </div>
        </div>
      </footer>
    `;
  }
}

if (!customElements.get(Footer.NAME)) {
  customElements.define(Footer.NAME, Footer);
}
