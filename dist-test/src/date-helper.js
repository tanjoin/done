"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DateHelper {
    static get today() {
        return DateHelper.getFormattedDate();
    }
    static get todayDate() {
        return new Date();
    }
    static get tomorrow() {
        return DateHelper.getFormattedDate(1);
    }
    static get tomorrowDate() {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
    }
    static get yesterday() {
        return DateHelper.getFormattedDate(-1);
    }
    static get yesterdayDate() {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
    }
    static get todayUTC() {
        return DateHelper.formatDateTimeUTC(new Date());
    }
    static normalizeDateString(date) {
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${hour}:${minute}`;
    }
    static normalizeTime(timeStr) {
        const [hour, minute] = timeStr.split(':').map(Number);
        if ((!hour && hour !== 0) ||
            (!minute && minute !== 0) ||
            isNaN(hour) ||
            isNaN(minute)) {
            return timeStr;
        }
        const normalizedHour = String(hour).padStart(2, '0');
        const normalizedMinute = String(minute).padStart(2, '0');
        return `${normalizedHour}:${normalizedMinute}`;
    }
    static formatDateTimeUTC(date) {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
    static getFormattedDate(offset = 0) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}
exports.default = DateHelper;
