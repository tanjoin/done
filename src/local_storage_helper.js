class LocalStorageHelper {
  static get CALENDAR_APP_THEME() {
    return `calendar_app_theme`;
  }

  static get calendarAppTheme() {
    return localStorage.getItem(this.CALENDAR_APP_THEME);
  }

  static set calendarAppTheme(theme) {
    try {
      localStorage.setItem(this.CALENDAR_APP_THEME, theme);
    } catch (e) {
      // 無視: ローカルストレージ不可環境（プライベートブラウズ等）
      console.error(e);
    }
  }

  static get CALENDAR_TASKS_V3() {
    return `calendar_tasks_v3`;
  }

  static get calendarTasksV3() {
    const jsonString = localStorage.getItem(this.CALENDAR_TASKS_V3);
    if (!jsonString) {
      return null;
    }
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse calendarTasksV3 from localStorage:", e);
      return null;
    }
  }

  static set calendarTasksV3(jsonObject) {
    try {
      localStorage.setItem(this.CALENDAR_TASKS_V3, JSON.stringify(jsonObject));
    } catch (e) {
      console.error("Failed to stringify calendarTasksV3 for localStorage:", e);
    }
  }

  static removeCalendarTasksV3() {
    try {
      localStorage.removeItem(this.CALENDAR_TASKS_V3);
    } catch (e) {
      console.error("Failed to remove calendarTasksV3 from localStorage:", e);
    }
  }

  static getStoredBool(key, defaultValue = false) {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    return raw === "true";
  }

  static get NOTIFICATION_SOUND_KEY() {
    return "notification_sound";
  }

  static get notificationSound() {
    try {
      return localStorage.getItem(this.NOTIFICATION_SOUND_KEY) || "bell";
    } catch (e) {
      return "bell";
    }
  }

  static set notificationSound(val) {
    try {
      localStorage.setItem(this.NOTIFICATION_SOUND_KEY, val);
    } catch (e) {
      // ignore
    }
  }

  // --- localStorage 利用可否チェック ---
  static supportsLocalStorage() {
    try {
      const key = "__ls_test__";
      localStorage.setItem(key, key);
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default LocalStorageHelper;