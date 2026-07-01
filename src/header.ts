type HeaderNavLink = 'index' | 'temporary' | 'settings';

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
      <a href="index.html" class="nav-link ${this._activeLink === 'index' ? 'active' : ''}">タスク一覧</a>
      <a href="temporary.html" class="nav-link ${this._activeLink === 'temporary' ? 'active' : ''}">一時的タスク</a>
      <a href="settings.html" class="nav-link ${this._activeLink === 'settings' ? 'active' : ''}">設定・データ管理</a>
      </header>
    `;
  }
}

if (!customElements.get(Header.NAME)) {
  customElements.define(Header.NAME, Header);
}
