import LocalStorageManager from './local-storage-manager';
import DateHelper from './date-helper';

export const TEMPORARY_FORM_TAG_NAME = 'done-temporary-form';
export const TEMPORARY_FORM_RESET_FORM = 'done-temporary-form-reset';
export const TEMPORARY_FORM_GROUP_SUGGESTIONS_UPDATE =
  'done-temporary-form-group-suggestions-update';

export class TemporaryForm extends HTMLElement {
  static get NAME(): string {
    return TEMPORARY_FORM_TAG_NAME;
  }

  connectedCallback(): void {
    const form = this.renderForm();
    this.renderDate(form);
    this.renderGroup(form);
    this.renderText(form);
    this.renderTime(form);
    this.renderRemindMinutesBefore(form);
    this.renderDescription(form);
    this.renderLink(form);
    this.renderSkipCalendarOnComplete(form);
    this.renderStrictMode(form);
    this.renderSubmitButton(form);
    this.setup();
  }

  private setup(): void {
    this.setupTheme();
    this.setupDefaultDate();
    this.setupGroupSuggestions();

    document.addEventListener(TEMPORARY_FORM_RESET_FORM, () => {
      this.resetForm();
    });
    document.addEventListener(TEMPORARY_FORM_GROUP_SUGGESTIONS_UPDATE, () => {
      this.setupGroupSuggestions();
    });
  }

  // 既存のメインタスクからグループ名を抽出してサジェストにセット
  private setupGroupSuggestions(): void {
    const datalist = document.getElementById('groupSuggestions');
    if (!datalist) return;
    datalist.innerHTML = '';

    const savedMainTasks = LocalStorageManager.tasks;
    if (!savedMainTasks) return;

    try {
      if (Array.isArray(savedMainTasks)) {
        // 重複のないグループ名リストを作成
        const groups = new Set<string>();
        savedMainTasks.forEach(t => {
          if (t.group && t.group.trim() !== '') {
            groups.add(t.group.trim());
          }
        });

        // datalistにoptionとして追加
        groups.forEach((groupName: string) => {
          const option = document.createElement('option') as HTMLOptionElement;
          option.value = groupName;
          datalist.appendChild(option);
        });
      }
    } catch {
      // groupsの作成中にエラーが発生した場合は無視
    }
  }

  private resetForm(): void {
    // フォームをリセット（日付は維持）
    (document.getElementById('group') as HTMLInputElement).value = '';
    (document.getElementById('text') as HTMLInputElement).value = '';
    (document.getElementById('endDate') as HTMLInputElement).value = '';
    (document.getElementById('startTime') as HTMLInputElement).value = '';
    (document.getElementById('endTime') as HTMLInputElement).value = '';
    (document.getElementById('remindMinutesBefore') as HTMLInputElement).value =
      '';
    (document.getElementById('description') as HTMLInputElement).value = '';
    (document.getElementById('link') as HTMLInputElement).value = '';
    (document.getElementById('skipCalendarOnComplete') as HTMLInputElement).checked = false;
    (document.getElementById('strictMode') as HTMLInputElement).checked = false;
  }

  private setupDefaultDate(): void {
    (document.getElementById('date') as HTMLInputElement).value =
      DateHelper.today;
    (document.getElementById('endDate') as HTMLInputElement).value = '';
  }

  private setupTheme(): void {
    try {
      const savedTheme = LocalStorageManager.appTheme;
      if (savedTheme && savedTheme !== 'system') {
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch {
      // LocalStorageManager のアクセスエラーを無視
    }
  }

  private renderDate(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.display = 'flex';
    div.style.gap = '16px';
    div.style.flexWrap = 'wrap';
    div.innerHTML = `
        <div style="flex: 1; min-width: 220px;">
            <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">開始日 *</label>
            <input type="date" id="date" required class="setting-input">
        </div>
        <div style="flex: 1; min-width: 220px;">
            <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">終了日（省略可）</label>
            <input type="date" id="endDate" class="setting-input">
        </div>
        <p style="margin-top: 10px; color: var(--text-secondary); font-size: 13px;">終了日を設定すると、開始日から終了日の間に1回だけ実施すればOKになります。</p>
    `;
    form.appendChild(div);
  }

  private renderGroup(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.innerHTML = `
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">グループ（カテゴリー）</label>
        <input type="text" id="group" placeholder="例: 突発、買い物、通院" list="groupSuggestions" class="setting-input">
        <datalist id="groupSuggestions"></datalist>
    `;
    form.appendChild(div);
  }

  private renderText(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.innerHTML = `
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">タイトル（タスク名）</label>
        <input type="text" id="text" required placeholder="例: 役所で書類の申請" class="setting-input">
    `;
    form.appendChild(div);
  }

  private renderTime(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.display = 'flex';
    div.style.gap = '16px';
    div.innerHTML = `
        <div style="flex: 1;">
            <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">開始時刻（省略可）</label>
            <input type="time" id="startTime" class="setting-input">
        </div>
        <div style="flex: 1;">
            <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">終了時刻（省略可）</label>
            <input type="time" id="endTime" class="setting-input">
        </div>
    `;
    form.appendChild(div);
  }

  private renderRemindMinutesBefore(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.innerHTML = `
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">通知猶予（分, 省略可）</label>
        <input type="number" id="remindMinutesBefore" min="0" step="1" placeholder="例: 10（空欄で開始時刻ジャスト通知）" class="setting-input">
    `;
    form.appendChild(div);
  }

  private renderDescription(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.innerHTML = `
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">説明（省略可）</label>
        <textarea id="description" rows="2" placeholder="持ち物やメモなど" class="setting-input" style="font-family: inherit; resize: vertical;"></textarea>
    `;
    form.appendChild(div);
  }

  private renderLink(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.innerHTML = `
        <label style="font-size: 13px; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: 6px;">関連リンク（省略可）</label>
        <input type="url" id="link" placeholder="https://..." class="setting-input">
    `;
    form.appendChild(div);
  }

  private renderSkipCalendarOnComplete(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.marginTop = '4px';
    div.style.marginBottom = '8px';
    div.innerHTML = `
        <label class="theme-option" style="margin-bottom: 0;">
            <input type="checkbox" id="skipCalendarOnComplete">
            <span>完了時にGoogleカレンダーへ追加しない</span>
        </label>
    `;
    form.appendChild(div);
  }

  private renderStrictMode(form: HTMLFormElement): void {
    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.marginTop = '4px';
    div.style.marginBottom = '8px';
    div.innerHTML = `
        <label class="theme-option" style="margin-bottom: 0;">
            <input type="checkbox" id="strictMode">
            <span>時間外の操作を禁止する（厳格モード）</span>
        </label>
    `;
    form.appendChild(div);
  }

  private renderSubmitButton(form: HTMLFormElement): void {
    const button = document.createElement('button');
    button.type = 'submit';
    button.className = 'btn btn-action';
    button.style.width = '100%';
    button.style.padding = '12px';
    button.textContent = '本番リストに追加する';
    form.appendChild(button);
  }

  private renderForm(): HTMLFormElement {
    const form = document.createElement('form') as HTMLFormElement;
    form.id = 'taskForm';
    form.classList.add('setting-form');
    form.style.marginTop = '24px';
    this.appendChild(form);
    return form;
  }
}

if (!customElements.get(TEMPORARY_FORM_TAG_NAME)) {
  customElements.define(TEMPORARY_FORM_TAG_NAME, TemporaryForm);
}
