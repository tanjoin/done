class StatusInfo {
  constructor(data) {
    this._data = {};
    if (!data || typeof data !== "object") {
      return;
    }
    if (data instanceof StatusInfo) {
      Object.assign(this._data, data._data);
    } else {
      Object.assign(this._data, data);
    }
  }

  static get CLASSNAME_DONE() {
    return "chip-status-done";
  }

  static get LABEL_DONE() {
    return "追加済み";
  }

  static get done() {
    return new StatusInfo({
      label: this.LABEL_DONE,
      className: this.CLASSNAME_DONE,
      locked: true,
    });
  }

  static get CLASSNAME_CANCELLED() {
    return "chip-status-cancel";
  }

  static get LABEL_CANCELLED() {
    return "キャンセル済";
  }

  static get cancelled() {
    return new StatusInfo({
      label: this.LABEL_CANCELLED,
      className: this.CLASSNAME_CANCELLED,
      locked: true,
    });
  }

  static get CLASSNAME_NONTARGET() {
    return "chip-status-nontarget";
  }

  static get LABEL_NONTARGET() {
    return "対象日外";
  }

  static get nontarget() {
    return new StatusInfo({
      label: this.LABEL_NONTARGET,
      className: this.CLASSNAME_NONTARGET,
      locked: true,
    });
  }

  static get CLASSNAME_ACTIVE() {
    return "chip-status-active";
  }

  static get LABEL_ACTIVE() {
    return "実施可能";
  }

  static get active() {
    return new StatusInfo({
      label: this.LABEL_ACTIVE,
      className: this.CLASSNAME_ACTIVE,
      locked: false,
    });
  }

  static get CLASSNAME_REMINDER() {
    return "chip-status-reminder";
  }

  static get LABEL_REMINDER() {
    return "リマインダー";
  }

  static get reminder() {
    return new StatusInfo({
      label: this.LABEL_REMINDER,
      className: this.CLASSNAME_REMINDER,
      locked: false,
    });
  }

  static get CLASSNAME_TODO() {
    return "chip-status-todo";
  }

  static get LABEL_TODO() {
    return "未実施";
  }

  static get todo() {
    return new StatusInfo({
      label: this.LABEL_TODO,
      className: this.CLASSNAME_TODO,
      locked: false,
    });
  }

  get label() {
    return this._data.label;
  }

  get className() {
    return this._data.className;
  }

  get locked() {
    return this._data.locked;
  }
}

export default StatusInfo;
