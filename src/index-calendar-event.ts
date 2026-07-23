import DateHelper from './date-helper';
import DoneTask from './done-task';
import LocalStorageManager from './local-storage-manager';

export default class IndexCalendarEvent {
  static open(task: DoneTask, isCancel: boolean): void {
    if (!isCancel && task.skipCalendarOnComplete === true) {
      return;
    }

    const startTime = DateHelper.todayUTC;
    const endTime = startTime;

    const groupName = task.normalizeGroup();
    let displayTitle = `[${groupName}] ${task.text}`;

    let details = '';
    if (task.description) {
      details += `${task.description}\n`;
    }
    if (task.link) {
      details += `${task.link}\n`;
    }

    if (isCancel) {
      displayTitle = `【未実施】[${groupName}] ${task.text}`;
      details += '※保存時に手動で「フラミンゴ」カラーへ変更してください。';
    }

    let baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const calendarId = LocalStorageManager.calendarTargetId;
    if (calendarId) {
      baseUrl += `&src=${encodeURIComponent(calendarId)}`;
    }

    const url = `${baseUrl}&text=${encodeURIComponent(displayTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}`;
    window.open(url, '_blank');
  }
}
