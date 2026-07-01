export default class DateHelper {

  static get today(): string {
    return DateHelper.getFormattedDate();
  }

  static get todayDate(): Date {
    return new Date();
  }

  static get tomorrow(): string {
    return DateHelper.getFormattedDate(1);
  }

  static get tomorrowDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  static get yesterday(): string {
    return DateHelper.getFormattedDate(-1);
  }

  static get yesterdayDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }

  static normalizeDateString(date: Date): string {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }

  static normalizeTime(timeStr: string): string {
    const [hour, minute] = timeStr.split(':').map(Number);
    if (!hour && hour !== 0 || !minute && minute !== 0 || isNaN(hour) || isNaN(minute)) {
      return timeStr;
    }
    const normalizedHour = String(hour).padStart(2, '0');
    const normalizedMinute = String(minute).padStart(2, '0');
    return `${normalizedHour}:${normalizedMinute}`;
  }

  private static getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}