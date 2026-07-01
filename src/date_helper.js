// --- 日付ヘルパー関数 ---
class DateHelper {
  static get today() {
    return this._getFormattedDate(0);
  }

  static get yesterday() {
    return this._getFormattedDate(-1);
  }

  static _getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  static get todayUTC() {
    return this._formatDateTimeUTC(new Date());
  }

  static _formatDateTimeUTC(date) {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  // --- 1桁の時刻（6:00等）を比較・判定用に2桁（06:00）に正規化するヘルパー ---
  static normalizeTime(timeStr) {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length !== 2) return timeStr;
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }

  /**
   * 指定された日付の「一日の始まり (00:00:00.000)」のDateオブジェクトを生成します。
   * @param {Object} task - タスクオブジェクト
   * @param {string} task.specificDate - 'YYYY-MM-DD' 形式の文字列
   * @returns {Date}
   */
  static createStartDate(task) {
    if (!task?.specificDate) return null; // バリデーション（必要に応じて）

    const [year, month, day] = task.specificDate.split("-").map(Number);
    // 月は 0 から始まるため -1 する
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * 指定された日付の「一日の終わり (23:59:59.999)」のDateオブジェクトを生成します。
   * @param {Object} task - タスクオブジェクト
   * @param {string} task.endDate - 'YYYY-MM-DD' 形式の文字列
   * @returns {Date}
   */
  static createEndDate(task) {
    if (!task?.endDate) return null; // バリデーション（必要に応じて）

    const [year, month, day] = task.endDate.split("-").map(Number);
    // ミリ秒までしっかり含めて 23:59:59.999 に設定
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  /**
   * Dateオブジェクトを 'YYYY-MM-DD' 形式の文字列に変換します。
   * @param {Date} date
   * @returns {string} '2026-06-12'
   * @link https://developer.mozilla.org/ja/docs/Glossary/Kebab_case
   */
  static toKebabCase(date) {
    if (!(date instanceof Date) || isNaN(date)) return ""; // 不正な入力のガード

    // 日本のロケール（sv-SEでも可）を指定して YYYY-MM-DD 形式で出力
    return date
      .toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-"); // 「/」を「-」に置換
  }
}

export default DateHelper;
