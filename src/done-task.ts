import type {
  DoneReminderCandidate,
  DoneTaskData,
  NormalizedTime,
  StatusInfo,
  TimeCheck,
  TodayStatus,
} from './types';
import DateHelper from './date-helper';
import {normalizeBoolean} from './boolean-helper';

export default class DoneTask implements DoneTaskData {
  id: string;
  text: string;
  description?: string | null;
  link?: string | null;
  group?: string;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  startTime?: string | null;
  endTime?: string | null;
  history: Record<string, TodayStatus>;
  notifiedDate?: string | null;
  remindMinutesBefore?: number | null;
  skipCalendarOnComplete?: boolean | null;
  strictMode?: boolean | null;
  specificDate?: string | null;
  endDate?: string | null;

  constructor(task: DoneTaskData) {
    this.id = task.id;
    this.text = task.text;
    this.description = task.description || null;
    this.link = task.link || null;
    this.group = task.group || '';
    this.daysOfWeek = task.daysOfWeek || [];
    this.daysOfMonth = task.daysOfMonth || [];
    this.startTime = task.startTime || null;
    this.endTime = task.endTime || null;
    this.history = task.history || {};
    this.notifiedDate = task.notifiedDate || null;
    this.remindMinutesBefore = task.remindMinutesBefore ?? null;
    this.skipCalendarOnComplete = normalizeBoolean(
      task.skipCalendarOnComplete,
      false,
    );
    this.strictMode = normalizeBoolean(task.strictMode, false);
    this.specificDate = task.specificDate || null;
    this.endDate = task.endDate || null;
  }

  hourOfStartTime(): number | null {
    if (!this.startTime) {
      return null;
    }
    const parts = this.startTime.split(':');
    if (!parts || parts.length !== 2 || !parts[0] || isNaN(Number(parts[0]))) {
      return null;
    }
    return Number(parts[0]);
  }

  minuteOfStartTime(): number | null {
    if (!this.startTime) {
      return null;
    }
    const parts = this.startTime.split(':');
    if (!parts || parts.length !== 2 || !parts[1] || isNaN(Number(parts[1]))) {
      return null;
    }
    return Number(parts[1]);
  }

  normalizeGroup(): string {
    return this.group ? this.group.trim() : 'その他';
  }

  normalizeRemindMinutesBefore(): number | null {
    const raw = this.remindMinutesBefore;
    if (raw === null || raw === undefined) {
      return null;
    }
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || minutes < 0) {
      return null;
    }
    return Math.floor(minutes);
  }

  normalizeStartTime(): string {
    if (!this.startTime) {
      return '';
    }
    const parts = this.startTime.split(':');
    if (
      !parts ||
      parts.length !== 2 ||
      !parts[0] ||
      !parts[1] ||
      isNaN(Number(parts[0])) ||
      isNaN(Number(parts[1]))
    ) {
      return this.startTime;
    }
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  normalizeEndTime(): string {
    if (!this.endTime) {
      return '';
    }
    const parts = this.endTime.split(':');
    if (
      !parts ||
      parts.length !== 2 ||
      !parts[0] ||
      !parts[1] ||
      isNaN(Number(parts[0])) ||
      isNaN(Number(parts[1]))
    ) {
      return this.endTime;
    }
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  createEndDate() {
    if (!this.endDate) {
      return null;
    }
    const [year, month, day]: number[] = this.endDate.split('-').map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  createStartDate() {
    if (!this.specificDate) {
      return null;
    }
    const [year, month, day]: number[] = this.specificDate
      .split('-')
      .map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  hasExplicitReminderLead() {
    return this.normalizeRemindMinutesBefore() !== null;
  }

  get todayStatus(): TodayStatus {
    return this.history ? this.history[DateHelper.today] : undefined;
  }

  get yesterdayStatus(): TodayStatus {
    return this.history ? this.history[DateHelper.yesterday] : undefined;
  }

  get groupChip() {
    const span = document.createElement('span');
    span.className = 'chip chip-group';
    if (this.yesterdayStatus === 'completed') {
      span.classList.add('chip-group--completed-yesterday');
    } else if (this.yesterdayStatus === 'cancelled') {
      span.classList.add('chip-group--cancelled-yesterday');
    }
    span.textContent = this.normalizeGroup();
    return span;
  }

  get taskNameElement() {
    if (this.link) {
      const link = document.createElement('a');
      link.href = this.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = this.text;
      return link;
    } else {
      const span = document.createElement('span');
      span.textContent = this.text;
      return span;
    }
  }

  get timeLabel() {
    if (this.startTime || this.endTime) {
      return `${this.startTime || '00:00'} - ${this.endTime || '23:59'}`;
    }
    return '-';
  }

  get scheduleLabel() {
    if (this.specificDate) {
      if (this.endDate) {
        if (this.endDate === this.specificDate) {
          return this.specificDate;
        }
        return `${this.specificDate} 〜 ${this.endDate}`;
      }
      return this.specificDate;
    }
    if (this.daysOfWeek && this.daysOfWeek.length) {
      const labels = ['日', '月', '火', '水', '木', '金', '土'];
      return this.daysOfWeek.map(day => labels[day] + '曜').join(', ');
    }
    if (this.daysOfMonth && this.daysOfMonth.length) {
      return this.daysOfMonth.map(day => `${day}日`).join(', ');
    }
    return '毎日';
  }

  get statusInfoSpan() {
    const statusSpan = document.createElement('span');
    const statusInfo = this.statusInfo;
    statusSpan.className = `chip ${statusInfo.className}`;
    statusSpan.textContent = statusInfo.label;
    return statusSpan;
  }

  get statusInfo() {
    return this.getTaskStatusInfo(
      this.todayStatus,
      this.timeCheck(),
      this.isTaskScheduledOnDate(new Date()),
    );
  }

  getTaskStatusInfo(
    todayStatus: TodayStatus,
    timeCheck: TimeCheck,
    isTargetDay: boolean,
  ): StatusInfo {
    if (todayStatus === 'completed') {
      return {label: '追加済み', className: 'chip-status-done', locked: true};
    }
    if (todayStatus === 'cancelled') {
      return {
        label: 'キャンセル済',
        className: 'chip-status-cancel',
        locked: true,
      };
    }
    if (!isTargetDay) {
      return {
        label: '対象日外',
        className: 'chip-status-nontarget',
        locked: true,
      };
    }
    if (
      this.isReminderActiveOnDate(DateHelper.todayDate, new Date()) ||
      this.isReminderActiveOnDate(DateHelper.tomorrowDate, new Date())
    ) {
      return {
        label: 'リマインダー',
        className: 'chip-status-reminder',
        locked: false,
      };
    }
    if (timeCheck.valid) {
      return {
        label: '実施可能',
        className: 'chip-status-active',
        locked: false,
      };
    }
    return {label: '時間外', className: 'chip-status-nontarget', locked: false};
  }

  isReminderActiveOnDate(targetDate: Date, now: Date): boolean {
    if (!this.hasExplicitReminderLead()) {
      return false;
    }
    const candidate = this.toReminderCandidate(targetDate);
    if (!candidate || candidate.leadMinutes === null) {
      return false;
    }
    const startAt = new Date(
      candidate.reminderAt.getTime() + candidate.leadMinutes * 60 * 1000,
    );
    return now >= candidate.reminderAt && now < startAt;
  }

  insertRowElements(row: HTMLElement): void {
    if (this.todayStatus) {
      row.setAttribute('data-done', 'true');
    }
    const groupChipTd = document.createElement('td');
    groupChipTd.appendChild(this.groupChip);
    row.appendChild(groupChipTd);

    const taskNameTd = document.createElement('td');
    taskNameTd.className = 'task-name';
    taskNameTd.appendChild(this.taskNameElement);
    row.appendChild(taskNameTd);

    const timeLabelTd = document.createElement('td');
    timeLabelTd.textContent = this.timeLabel;
    row.appendChild(timeLabelTd);

    const dateLabelTd = document.createElement('td');
    dateLabelTd.textContent = this.scheduleLabel;
    row.appendChild(dateLabelTd);

    const statusTd = document.createElement('td');
    const statusSpan = this.statusInfoSpan;
    statusTd.appendChild(statusSpan);
    row.appendChild(statusTd);

    const actionTd = document.createElement('td');
    const actionContainer = document.createElement('div');
    actionContainer.className = 'table-actions';

    const mainButton = document.createElement('button');
    mainButton.className = 'table-btn table-btn-primary';
    mainButton.textContent =
      this.skipCalendarOnComplete === true ? '完了' : '追加';
    mainButton.setAttribute('data-task-action', 'complete');
    mainButton.setAttribute('data-task-id', this.id);

    const statusInfo = this.statusInfo;
    const isStrict = this.strictMode === true;
    const timeCheck = this.timeCheck();
    if (statusInfo.locked || (!timeCheck.valid && isStrict)) {
      mainButton.disabled = true;
    }
    actionContainer.appendChild(mainButton);

    if (!this.todayStatus) {
      const secondaryButton = document.createElement('button');
      secondaryButton.className = this.specificDate
        ? 'table-btn table-btn-danger'
        : 'table-btn';
      secondaryButton.textContent = this.specificDate ? '削除' : 'キャンセル';
      secondaryButton.setAttribute(
        'data-task-action',
        this.specificDate ? 'delete' : 'cancel',
      );
      secondaryButton.setAttribute('data-task-id', this.id);
      if (statusInfo.locked) {
        secondaryButton.disabled = true;
      }
      actionContainer.appendChild(secondaryButton);
    }
    actionTd.appendChild(actionContainer);
    row.appendChild(actionTd);
  }

  isTaskScheduledOnDate(targetDate: Date): boolean {
    if (this.specificDate) {
      // 特定の日付が指定されている場合、その日付と比較する
      const dStr = this.toKebabCase(targetDate);
      if (!this.endDate) {
        return this.specificDate === dStr;
      }
      const start = this.specificDate;
      const end = this.endDate;
      if (!start || !end || end < start || dStr < start || dStr > end) {
        return false;
      }
      const todayCompleted = this.history && this.history[dStr] === 'completed';
      if (todayCompleted) {
        return true;
      }
      const specificDate = this.specificDate;
      // 過去に特定の日付以降で完了した履歴があるかどうかを確認する
      const completedBeforeToday = Object.keys(this.history || {}).some(
        (key): boolean => {
          if (this.history[key] !== 'completed') {
            return false;
          }
          return key >= specificDate && key < dStr;
        },
      );
      return !completedBeforeToday;
    }

    const currentDayOfWeek = targetDate.getDay(); // 0 (日曜日) から 6 (土曜日) の範囲で取得
    const currentDayOfMonth = targetDate.getDate(); // 1 から 31 の範囲で取得

    const noWeekRestriction = !this.daysOfWeek || this.daysOfWeek.length === 0;
    const noMonthRestriction =
      !this.daysOfMonth || this.daysOfMonth.length === 0;

    // 曜日制限も日付制限もない場合は、常にスケジュールされているとみなす
    if (noWeekRestriction && noMonthRestriction) return true;

    // 曜日制限がある場合、現在の曜日が制限に含まれているかを確認
    if (this.daysOfWeek && this.daysOfWeek.includes(currentDayOfWeek))
      return true;
    // 日付制限がある場合、現在の日付が制限に含まれているかを確認
    if (this.daysOfMonth && this.daysOfMonth.includes(currentDayOfMonth))
      return true;

    return false;
  }

  timeCheck(): TimeCheck {
    // startTime と endTime が両方とも未設定の場合は常に有効
    if (!this.startTime && !this.endTime) {
      return {valid: true, ready: false, msg: ''};
    }

    const now = new Date();
    const currentStr =
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0');

    const start = DateHelper.normalizeTime(this.startTime || '00:00');
    const end = DateHelper.normalizeTime(this.endTime || '23:59');

    if (start <= end) {
      // 通常の時間帯（同一日内）
      if (currentStr < start) {
        return {valid: false, ready: true, msg: `時間外 (${start}から)`};
      }
      if (currentStr > end) {
        return {valid: false, ready: false, msg: `時間外 (${end}まで)`};
      }
    } else {
      // 翌日をまたぐ時間帯（start > end）
      // 前日の履歴をチェック
      const hasYesterdayHistory =
        this.history && this.history[DateHelper.yesterday];

      // 前日の履歴がある場合のみ、startTimeまでを時間外にする
      if (hasYesterdayHistory && currentStr < start) {
        return {valid: false, ready: true, msg: `時間外 (${start}から)`};
      }
      // currentStr >= start OR currentStr <= end なら時間内
      if (currentStr < start && currentStr > end) {
        return {valid: false, ready: true, msg: `時間外 (${start}〜翌${end})`};
      }
    }
    return {valid: true, ready: false, msg: ''};
  }

  shouldShowTask(): boolean {
    const now = new Date();
    // タスクが特定の日付にスケジュールされている場合、その日付と現在の日付を比較する
    if (this.isTaskScheduledOnDate(now)) {
      return true;
    }

    const yesterday = DateHelper.yesterdayDate;
    // 前日の履歴があり、かつ startTime > endTime の場合は、前日のタスクがまだ有効な時間帯にいる可能性がある
    if (
      this.isTaskScheduledOnDate(yesterday) &&
      this.startTime &&
      this.endTime
    ) {
      const startNorm = this.normalizeStartTime();
      const endNorm = this.normalizeEndTime();
      if (startNorm > endNorm) {
        const currentStr = DateHelper.normalizeDateString(now);
        if (currentStr <= endNorm) {
          return true;
        }
      }
    }

    // 明示的なリマインド時間が設定されている場合、その時間を考慮してタスクを表示するかどうかを判断する
    if (this.hasExplicitReminderLead()) {
      const reminderLead = this.normalizeRemindMinutesBefore();
      if (reminderLead !== null) {
        const reminderTime = new Date(now.getTime() + reminderLead * 60 * 1000);
        if (this.isTaskScheduledOnDate(reminderTime)) {
          return true;
        }
      }
    }

    return false;
  }

  toKebabCase(date: Date): string {
    return date
      .toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\//g, '-');
  }

  toNotificationCandidate(now: Date): DoneReminderCandidate | null {
    const dateOffsets = [0, 1];

    for (const offset of dateOffsets) {
      // スケジュールされている日付を計算
      const scheduledDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
        12,
        0,
        0,
        0,
      );
      if (!this.isTaskScheduledOnDate(scheduledDate)) {
        continue;
      }
      const candidate = this.toReminderCandidate(scheduledDate);
      if (!candidate) {
        continue;
      }

      console.log(`${this.notifiedDate} === ${candidate.scheduleDateKey} ?`);
      if (this.notifiedDate === candidate.scheduleDateKey) {
        continue;
      }
      if (this.history && this.history[candidate.scheduleDateKey]) {
        continue;
      }
      if (now < candidate.reminderAt) {
        continue;
      }
      return candidate;
    }
    return null;
  }

  toReminderCandidate(scheduledDate: Date): DoneReminderCandidate | null {
    if (!this.startTime) {
      return null;
    }
    const normalizedStartTime = this.validateAndNormalizeStartTime();
    if (!normalizedStartTime) {
      return null;
    }
    const leadMinutes = this.normalizeRemindMinutesBefore();
    const remindMinutes = leadMinutes !== null ? leadMinutes : 0;

    const startAt = new Date(
      scheduledDate.getFullYear(),
      scheduledDate.getMonth(),
      scheduledDate.getDate(),
      Math.floor(normalizedStartTime.startMinutes / 60),
      normalizedStartTime.startMinutes % 60,
      0,
      0,
    );
    const reminderAt = new Date(startAt.getTime() - remindMinutes * 60 * 1000);
    return {
      scheduleDateKey: this.toKebabCase(scheduledDate),
      startNorm: normalizedStartTime.normalizedStart,
      leadMinutes,
      reminderAt,
    };
  }

  validateAndNormalizeStartTime(): NormalizedTime | null {
    const hour = this.hourOfStartTime();
    const minute = this.minuteOfStartTime();
    if (
      hour === null ||
      minute === null ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute)
    ) {
      return null;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return {
      normalizedStart: this.normalizeStartTime(),
      startMinutes: hour * 60 + minute,
    };
  }
}
