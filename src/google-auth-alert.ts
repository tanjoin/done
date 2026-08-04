type GoogleAuthAlertIds = {
  statusId: string;
  messageId: string;
  actionButtonId: string;
  dismissButtonId: string;
};

type GoogleAuthAlertRenderOptions = GoogleAuthAlertIds & {
  actionLabel: string;
  dismissAriaLabel: string;
};

type GoogleAuthAlertControllerOptions = {
  root: ParentNode;
  ids: GoogleAuthAlertIds;
  onAction?: () => void;
};

export function renderGoogleAuthAlert(
  options: GoogleAuthAlertRenderOptions,
): string {
  return `
    <div id="${options.statusId}" class="google-relogin-alert" role="alert" hidden>
      <span id="${options.messageId}"></span>
      <div class="google-relogin-alert-actions">
        <button id="${options.actionButtonId}" class="btn btn-action" type="button">${options.actionLabel}</button>
        <button id="${options.dismissButtonId}" class="google-relogin-dismiss-btn" type="button" aria-label="${options.dismissAriaLabel}">×</button>
      </div>
    </div>
  `;
}

export default class GoogleAuthAlertController {
  private readonly _root: ParentNode;
  private readonly _ids: GoogleAuthAlertIds;
  private readonly _onAction: (() => void) | undefined;
  private _dismissed = false;

  constructor(options: GoogleAuthAlertControllerOptions) {
    this._root = options.root;
    this._ids = options.ids;
    this._onAction = options.onAction;
  }

  setup(): void {
    const actionBtn = this.query<HTMLButtonElement>(this._ids.actionButtonId);
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        this._onAction?.();
      });
    }

    const dismissBtn = this.query<HTMLButtonElement>(this._ids.dismissButtonId);
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this._dismissed = true;
        this.hide();
      });
    }
  }

  show(message: string, respectDismiss = false): void {
    const status = this.query<HTMLElement>(this._ids.statusId);
    const statusMessage = this.query<HTMLElement>(this._ids.messageId);
    if (!status || !statusMessage) {
      return;
    }
    if (respectDismiss && this._dismissed) {
      return;
    }

    statusMessage.textContent = message;
    status.hidden = false;
  }

  hide(): void {
    const status = this.query<HTMLElement>(this._ids.statusId);
    if (!status) {
      return;
    }
    status.hidden = true;
  }

  private query<T extends HTMLElement>(id: string): T | null {
    return this._root.querySelector(`#${id}`) as T | null;
  }
}