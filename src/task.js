import DateHelper from "./date_helper.js";
import TimeCheck from "./time_check.js";
import StatusInfo from "./status_info.js";
import ItemView from "./item_view.js";

class Task {
  constructor(data) {
    this._data = {};
    if (!data || typeof data !== "object") {
      return;
    }
    if (data instanceof Task) {
      Object.assign(this._data, data._data);
    } else {
      Object.assign(this._data, data);
    }
  }

  get history() {
    return this._data.history || {};
  }

  get todayStatus() {
    return this.history[DateHelper.today] || null;
  }

  get yesterdayStatus() {
    return this.history[DateHelper.yesterday] || null;
  }

  get startTime() {
    return this._data.startTime || null;
  }

  get startTimeString() {
    return this.startTime || "00:00";
  }

  get endTime() {
    return this._data.endTime || null;
  }

  get endTimeString() {
    return this.endTime || "23:59";
  }

  get timeLabel() {
    if (this.startTime || this.endTime) {
      return `${this.startTimeString} - ${this.endTimeString}`;
    }
    return "-";
  }

  get specificDate() {
    return this._data.specificDate || null;
  }

  static get TODAY_STATUS_COMPLETED() {
    return "completed";
  }

  static get TODAY_STATUS_CANCELLED() {
    return "cancelled";
  }

  // --- スケジュール合致判定 ---
  isTaskScheduledOnDate(date) {
    if (this._data.specificDate) {
      const dStr = DateHelper.toKebabCase(date);
      if (this._data.endDate) {
        const start = DateHelper.createStartDate(this._data);
        const end = DateHelper.createEndDate(this._data);

        // console.log(this._data.id, this._data.text, start, end, date);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
          return false;
        }
        if (date < start || date > end) {
          return false;
        }
        const todayCompleted =
          this._data.history && this._data.history[dStr] === "completed";
        if (todayCompleted) {
          return true;
        }
        const completedBeforeToday = Object.keys(this._data.history || {}).some(
          (histDate) => {
            if (this._data.history[histDate] !== "completed") return false;
            return histDate >= this._data.specificDate && histDate < dStr;
          },
        );
        return !completedBeforeToday;
      }
      return this._data.specificDate === dStr;
    }

    const currentDayOfWeek = date.getDay();
    const currentDayOfMonth = date.getDate();

    const noWeekRestriction =
      !this._data.daysOfWeek || this._data.daysOfWeek.length === 0;
    const noMonthRestriction =
      !this._data.daysOfMonth || this._data.daysOfMonth.length === 0;
    if (noWeekRestriction && noMonthRestriction) return true;

    if (
      this._data.daysOfWeek &&
      this._data.daysOfWeek.includes(currentDayOfWeek)
    )
      return true;
    if (
      this._data.daysOfMonth &&
      this._data.daysOfMonth.includes(currentDayOfMonth)
    )
      return true;

    return false;
  }

  shouldShowTask() {
    const now = new Date();
    if (this.isTaskScheduledOnDate(now)) {
      return true;
    }

    // 前日の履歴があり、かつ startTime > endTime の場合は、前日のタスクがまだ有効な時間帯にいる可能性がある
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (this.isTaskScheduledOnDate(yesterday)) {
      if (this._data.startTime && this._data.endTime) {
        const startNorm = DateHelper.normalizeTime(this._data.startTime);
        const endNorm = DateHelper.normalizeTime(this._data.endTime);
        if (startNorm > endNorm) {
          const currentStr =
            String(now.getHours()).padStart(2, "0") +
            ":" +
            String(now.getMinutes()).padStart(2, "0");
          if (currentStr <= endNorm) {
            return true;
          }
        }
      }
    }

    // 翌日以降でリマインダー設定があり、かつリマインダーの時間内であれば表示する
    if (this.hasExplicitReminderLead()) {
      const reminderLead = this.normalizeRemindMinutesBefore();
      if (reminderLead !== null) {
        const reminderTime = new Date(now.getTime() + reminderLead * 60000);
        if (this.isTaskScheduledOnDate(reminderTime)) {
          return true;
        }
      }
    }

    return false;
  }

  isWithinTime() {
    // startTime と endTime が両方とも未設定の場合は常に有効
    if (!this._data.startTime && !this._data.endTime) {
      return new TimeCheck({ valid: true, ready: false, msg: "" });
    }

    const now = new Date();
    const currentStr =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");

    const start = DateHelper.normalizeTime(this._data.startTime || "00:00");
    const end = DateHelper.normalizeTime(this._data.endTime || "23:59");

    if (start <= end) {
      // 通常の時間帯（同一日内）
      if (currentStr < start) {
        return new TimeCheck({
          valid: false,
          ready: true,
          msg: `時間外 (${start}から)`,
        });
      }
      if (currentStr > end) {
        return new TimeCheck({
          valid: false,
          ready: false,
          msg: `時間外 (${end}まで)`,
        });
      }
    } else {
      // 翌日をまたぐ時間帯（start > end）
      // 前日の履歴をチェック
      const hasYesterdayHistory =
        this._data.history && this._data.history[DateHelper.yesterday];

      // 前日の履歴がある場合のみ、startTimeまでを時間外にする
      if (hasYesterdayHistory && currentStr < start) {
        return new TimeCheck({
          valid: false,
          ready: true,
          msg: `時間外 (${start}から)`,
        });
      }
      // currentStr >= start OR currentStr <= end なら時間内
      if (currentStr < start && currentStr > end) {
        return new TimeCheck({
          valid: false,
          ready: true,
          msg: `時間外 (${start}〜翌${end})`,
        });
      }
    }
    return new TimeCheck({ valid: true, ready: false, msg: "" });
  }

  normalizeRemindMinutesBefore() {
    const rawValue = this._data?.remindMinutesBefore;
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return null;
    }

    const minutes = Number(rawValue);
    if (!Number.isFinite(minutes) || minutes < 0) {
      return null;
    }

    return Math.floor(minutes);
  }

  // 明示的なリマインド設定があるかどうか（0分も有効）
  hasExplicitReminderLead() {
    return this.normalizeRemindMinutesBefore() !== null;
  }

  get statusInfo() {
    return this.getTaskStatusInfo(
      this.todayStatus,
      this.timeCheck,
      this.isTaskScheduledOnDate(new Date()),
    );
  }

  getTaskStatusInfo(todayStatus, timeCheck, isTargetDay) {
    if (todayStatus === Task.TODAY_STATUS_COMPLETED) {
      return StatusInfo.done;
    }
    if (todayStatus === Task.TODAY_STATUS_CANCELLED) {
      return StatusInfo.cancelled;
    }
    if (!isTargetDay) {
      return StatusInfo.nontarget;
    }
    if (!timeCheck.valid && timeCheck.ready && this.hasExplicitReminderLead()) {
      return StatusInfo.reminder;
    }
    if (timeCheck.valid) {
      return StatusInfo.active;
    }
    return StatusInfo.todo;
  }

  get statusInfoSpan() {
    const statusSpan = document.createElement("span");
    const statusInfo = this.statusInfo;
    statusSpan.className = `chip ${statusInfo.className}`;
    statusSpan.textContent = statusInfo.label;
    return statusSpan;
  }

  get timeCheck() {
    return this.isWithinTime();
  }

  actionSecondary(taskIndex) {
    const button = document.createElement("button");
    button.className = "table-btn";
    button.disabled = this.statusInfo.locked;
    button.textContent = this.specificDate ? "削除" : "キャンセル";
    if (this.specificDate) {
      button.textContent = "削除";
      button.classList.add("table-btn-danger");
      button.onclick = () => ItemView.deleteActualTask(this._data.id);
    } else {
      button.textContent = "キャンセル";
      button.onclick = () => executeTask(taskIndex, true);
    }
    return button;
  }

  actionMain(taskIndex) {
    const button = document.createElement("button");
    button.className = "table-btn";
    if (this.todayStatus) {
      button.textContent = "戻す";
      button.onclick = () => ItemView.undoTask(taskIndex);
    } else {
      button.textContent = "追加";
      const isStrict =
        this._data.strictMode === true || this._data.strictMode === "true";
      const addDisabled =
        this.statusInfo.locked || (!this.timeCheck.valid && isStrict);
      button.disabled = addDisabled;
      button.classList.add("table-btn-primary");
      button.onclick = () => executeTask(taskIndex, false);
    }
    return button;
  }

  static get YESTERDAY_STATUS_COMPLETED() {
    return "completed";
  }

  static get YESTERDAY_STATUS_CANCELLED() {
    return "cancelled";
  }

  get groupChip() {
    const span = document.createElement("span");
    span.className = "chip chip-group";
    if (this.yesterdayStatus === Task.YESTERDAY_STATUS_COMPLETED) {
      span.classList.add("chip-group--completed-yesterday");
    } else if (this.yesterdayStatus === Task.YESTERDAY_STATUS_CANCELLED) {
      span.classList.add("chip-group--cancelled-yesterday");
    }
    if (this._data.group) {
      span.textContent = this._data.group;
    } else {
      span.textContent = "その他";
    }
    return span;
  }

  get taskNameElement() {
    if (this._data.link) {
      const link = document.createElement("a");
      link.href = this._data.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = this._data.text;
      return link;
    } else {
      const span = document.createElement("span");
      span.textContent = this._data.text;
      return span;
    }
  }

  get scheduleLabel() {
    if (this._data.specificDate) {
      if (this._data.endDate) {
        if (this._data.endDate === this._data.specificDate) {
          return this._data.specificDate;
        }
        return `${this._data.specificDate} 〜 ${this._data.endDate}`;
      }
      return this._data.specificDate;
    }
    if (this._data.daysOfWeek && this._data.daysOfWeek.length) {
      const labels = ["日", "月", "火", "水", "木", "金", "土"];
      return this._data.daysOfWeek.map((day) => labels[day] + "曜").join(", ");
    }
    if (this._data.daysOfMonth && this._data.daysOfMonth.length) {
      return this._data.daysOfMonth.map((day) => `${day}日`).join(", ");
    }
    return "毎日";
  }

  insertRowElements(row, taskIndex) {
    if (this.todayStatus) {
      row.setAttribute("data-done", "true");
    }
    const groupChipTd = document.createElement("td");
    groupChipTd.appendChild(this.groupChip);
    row.appendChild(groupChipTd);

    const taskNameTd = document.createElement("td");
    taskNameTd.className = "task-name";
    taskNameTd.appendChild(this.taskNameElement);
    row.appendChild(taskNameTd);

    const timeLabelTd = document.createElement("td");
    timeLabelTd.textContent = this.timeLabel;
    row.appendChild(timeLabelTd);

    const dateLabelTd = document.createElement("td");
    dateLabelTd.textContent = this.scheduleLabel;
    row.appendChild(dateLabelTd);

    const statusTd = document.createElement("td");
    const statusSpan = this.statusInfoSpan;
    statusTd.appendChild(statusSpan);
    row.appendChild(statusTd);

    const actionTd = document.createElement("td");
    const actionContainer = document.createElement("div");
    actionContainer.className = "table-actions";
    actionContainer.appendChild(this.actionMain(taskIndex));
    if (!this.todayStatus) {
      actionContainer.appendChild(this.actionSecondary(taskIndex));
    }
    actionTd.appendChild(actionContainer);
    row.appendChild(actionTd);
  }
}

export default Task;
