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
        <a href="https://github.com/tanjoin/done" target="_blank" rel="noopener noreferrer" style="text-decoration: none">GitHub</a> &copy; 2026 done by tanjoin
      </footer>
    `;
  }
}

if (!customElements.get(Footer.NAME)) {
  customElements.define(Footer.NAME, Footer);
}
