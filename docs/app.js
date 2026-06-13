let tasks = [];

// --- テーブルソート状態 ---
let sortState = {
    column: null,      // ソート対象の列 ('group', 'task', 'time', 'date', 'status')
    ascending: true    // true: 昇順, false: 降順
};

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
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    static get todayUTC() {
        return this._formatDateTimeUTC(new Date());
    }

    static _formatDateTimeUTC(date) {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    // --- 1桁の時刻（6:00等）を比較・判定用に2桁（06:00）に正規化するヘルパー ---
    static normalizeTime(timeStr) {
        if (!timeStr) return "";
        const parts = timeStr.split(':');
        if (parts.length !== 2) return timeStr;
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }

    /**
     * 指定された日付の「一日の始まり (00:00:00.000)」のDateオブジェクトを生成します。
     * @param {Object} task - タスクオブジェクト
     * @param {string} task.specificDate - 'YYYY-MM-DD' 形式の文字列
     * @returns {Date}
     */
    static createStartDate(task) {
        if (!task?.specificDate) return null; // バリデーション（必要に応じて）
        
        const [year, month, day] = task.specificDate.split('-').map(Number);
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
        
        const [year, month, day] = task.endDate.split('-').map(Number);
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
        if (!(date instanceof Date) || isNaN(date)) return ''; // 不正な入力のガード

        // 日本のロケール（sv-SEでも可）を指定して YYYY-MM-DD 形式で出力
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-'); // 「/」を「-」に置換
    }
}

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
        return localStorage.getItem(this.CALENDAR_TASKS_V3);
    }

    static set calendarTasksV3(json) {
        localStorage.setItem(this.CALENDAR_TASKS_V3, JSON.stringify(tasks));
    }

    static removeCalendarTasksV3() {
        localStorage.removeItem(this.CALENDAR_TASKS_V3);
    }

    static getStoredBool(key, defaultValue = false) {
        const raw = localStorage.getItem(key);
        if (raw === null) {
            return defaultValue;
        }
        return raw === 'true';
    }

    static get NOTIFICATION_SOUND_KEY() {
        return 'notification_sound';
    }

    static get notificationSound() {
        try {
            return localStorage.getItem(this.NOTIFICATION_SOUND_KEY) || 'bell';
        } catch (e) {
            return 'bell';
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
            const key = '__ls_test__';
            localStorage.setItem(key, key);
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }
}

class FilterManager {
    static get hideNonTargetDay() {
        return LocalStorageHelper.getStoredBool('filter_hide_non_target_day', true);
    }
    static get hideOutOfTime() {
        return LocalStorageHelper.getStoredBool('filter_hide_out_of_time', false);
    }
    static get hideCompleted() {
        return LocalStorageHelper.getStoredBool('filter_hide_completed', false);
    }
    static get hideCancelled() {
        return LocalStorageHelper.getStoredBool('filter_hide_cancelled', false);
    }
}

class SettingsView {
    // --- テーマ適用 ---
    static applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'system') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', theme);
        }
    }

    // --- テーマ変更 ---
    // dependency in settings.html
    static handleThemeChange(theme) {
        SettingsView.applyTheme(theme);
        LocalStorageHelper.calendarAppTheme = theme;
    }

    static async resetToDefault() {
        if (confirm('すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？')) {
            await TaskRepository.reset();
            alert('初期設定に戻しました。');
            if (document.getElementById('taskContainer')) renderCards();
        }
    }

    // --- ファイルからデータをインポート ---

    static triggerImport() { 
        document.getElementById('fileInput').click(); 
    }

    static importJSONFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    TaskRepository.tasks = importedData;
                    LocalStorageHelper.calendarTasksV3 = JSON.stringify(tasks);
                    alert('インポートが完了しました。');
                    if (document.getElementById('taskContainer')) {
                        renderCards();
                    }
                } else {
                    alert('無効なJSONフォーマットです。');
                }
            } catch (err) {
                alert('JSONの解析に失敗しました。');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    static async importJSONFromClipboard() {
        if (!navigator.clipboard || !window.isSecureContext) {
            alert('この環境ではクリップボード操作が利用できません。https環境またはlocalhostでお試しください。');
            return;
        }

        try {
            const clipboardText = await navigator.clipboard.readText();
            if (!clipboardText || !clipboardText.trim()) {
                alert('クリップボードが空です。');
                return;
            }

            const importedData = JSON.parse(clipboardText);
            if (!Array.isArray(importedData)) {
                alert('無効なJSONフォーマットです。');
                return;
            }

            TaskRepository.tasks = importedData;
            LocalStorageHelper.calendarTasksV3 = JSON.stringify(tasks);
            alert('クリップボードからインポートが完了しました。');
            if (document.getElementById('taskContainer')) {
                renderCards();
            }
        } catch (error) {
            console.error('クリップボードからのインポートに失敗しました:', error);
            alert('クリップボードの読み込みまたはJSON解析に失敗しました。');
        }
    }

    static async copyJSONToClipboard() {
        if (!navigator.clipboard || !window.isSecureContext) {
            alert('この環境ではクリップボード操作が利用できません。https環境またはlocalhostでお試しください。');
            return;
        }

        try {
            await navigator.clipboard.writeText(JSON.stringify(TaskRepository.tasks, null, 2));
            alert('JSONをクリップボードにコピーしました。');
        } catch (error) {
            console.error('クリップボードへのコピーに失敗しました:', error);
            alert('クリップボードへのコピーに失敗しました。');
        }
    }

    // --- データ管理 ---
    static exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(TaskRepository.tasks, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `task_settings_and_history.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }
}

class ItemView {
    static undoTask(index) {
        const TODAY = DateHelper.today;
        if (tasks[index].history[TODAY]) {
            delete tasks[index].history[TODAY];
            localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
            renderCards();
        }
    }

    // --- 一時的タスクの完全削除機能 ---
    static deleteActualTask(id) {
        if (confirm('この一時的タスクをリストから完全に削除しますか？')) {
            tasks = tasks.filter(t => t.id !== id);
            localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
            renderCards();
        }
    }
}
 
class MainController {
    // --- アプリ初期起動 ---
    static async initApp() {
        let savedTheme = 'system';
        try {
            const raw = LocalStorageHelper.calendarAppTheme;
            if (raw) savedTheme = raw;
        } catch (e) {
            // localStorage が利用できない環境では system を使う
            savedTheme = 'system';
        }
        SettingsView.applyTheme(savedTheme);

        const savedTasks = LocalStorageHelper.calendarTasksV3;
        if (savedTasks) {
            try {
                TaskRepository.tasks = JSON.parse(savedTasks);
            } catch (e) {
                await TaskRepository.loadDefaultTasksFromJSON();
            }
        } else {
            await TaskRepository.loadDefaultTasksFromJSON();
        }

        setupPageSpecifics(savedTheme);
        initNotificationTimer();
    }
}

class TaskRepository {

    // TODO: tasks を中で管理したい

    static get tasks() {
        return tasks;
    }

    static set tasks(array) {
        tasks = Array.isArray(array)
            ? array.map(task => ({
                ...task,
                remindMinutesBefore: normalizeRemindMinutesBefore(task?.remindMinutesBefore)
            }))
            : [];
    }

    static async loadDefaultTasksFromJSON() {
        try {
            const response = await fetch('tasks.json');
            if (!response.ok) throw new Error('Network error');
            TaskRepository.tasks = await response.json();
            LocalStorageHelper.calendarTasksV3 = JSON.stringify(tasks);
        } catch (error) {
            console.error('デフォルトタスクJSONの読み込みに失敗しました:', error);
            TaskRepository.tasks = [];
        }
    }

    static async reset() {
        LocalStorageHelper.removeCalendarTasksV3();
        await this.loadDefaultTasksFromJSON();    
    }
}

function normalizeRemindMinutesBefore(rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
        return null;
    }

    const minutes = Number(rawValue);
    if (!Number.isFinite(minutes) || minutes < 0) {
        return null;
    }

    return Math.floor(minutes);
}

function hasExplicitReminderLead(task) {
    return normalizeRemindMinutesBefore(task?.remindMinutesBefore) !== null;
}

function parseStartTimeToMinutes(startTime) {
    if (!startTime) return null;

    const normalizedStart = DateHelper.normalizeTime(startTime);
    const [hourStr, minuteStr] = normalizedStart.split(':');
    const hour = Number(hourStr);
    const minute = Number(minuteStr);

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
        return null;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }

    return {
        normalizedStart,
        startMinutes: (hour * 60) + minute
    };
}

function buildReminderCandidate(task, scheduledDate) {
    if (!task?.startTime) return null;

    const parsed = parseStartTimeToMinutes(task.startTime);
    if (!parsed) return null;

    const leadMinutes = normalizeRemindMinutesBefore(task.remindMinutesBefore);
    const remindMinutes = leadMinutes === null ? 0 : leadMinutes;

    const startAt = new Date(
        scheduledDate.getFullYear(),
        scheduledDate.getMonth(),
        scheduledDate.getDate(),
        Math.floor(parsed.startMinutes / 60),
        parsed.startMinutes % 60,
        0,
        0
    );

    const reminderAt = new Date(startAt.getTime() - (remindMinutes * 60 * 1000));

    return {
        scheduledDateKey: DateHelper.toKebabCase(scheduledDate),
        startNorm: parsed.normalizedStart,
        leadMinutes,
        reminderAt
    };
}

function getNotificationCandidate(task, now) {
    const dateOffsets = [0, 1];

    for (const offset of dateOffsets) {
        const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12, 0, 0, 0);
        if (!isTaskScheduledOnDate(task, scheduledDate)) continue;

        const candidate = buildReminderCandidate(task, scheduledDate);
        if (!candidate) continue;

        if (task.notifiedDate === candidate.scheduledDateKey) continue;
        if (task.history && task.history[candidate.scheduledDateKey]) continue;
        if (now < candidate.reminderAt) continue;

        return candidate;
    }

    return null;
}

// --- 【新規追加】ソート実行マネージャ ---
class SortManager {
    /**
     * ソートヘッダーがクリックされた際のハンドラ
     * @param {string} columnName - ソート対象列名 ('group', 'task', 'time', 'date', 'status')
     */
    static handleSort(columnName) {
        if (sortState.column === columnName) {
            sortState.ascending = !sortState.ascending;
        } else {
            sortState.column = columnName;
            sortState.ascending = true;
        }

        // タスクをソートして再描画
        SortManager.sortTasks();
        renderCards();
    }

    /**
     * 現在の sortState に基づいて tasks 配列を並び替える
     */
    static sortTasks() {
        const col = sortState.column;
        if (!col) return;

        const ascMult = sortState.ascending ? 1 : -1;
        const TODAY = DateHelper.today;

        tasks.sort((a, b) => {
            let valA = '';
            let valB = '';

            switch (col) {
                case 'group':
                    valA = a.group || '';
                    valB = b.group || '';
                    break;
                case 'task':
                    valA = a.text || ''; // タスク名は `text` プロパティ
                    valB = b.text || '';
                    break;
                case 'time':
                    // テキストベースでのシンプルな文字列ソートに変更
                    valA = a.startTime || '';
                    valB = b.startTime || '';
                    break;
                case 'date':
                    valA = SortManager.getScheduleSortValue(a);
                    valB = SortManager.getScheduleSortValue(b);
                    break;
                case 'status':
                    valA = (a.history && a.history[TODAY]) ? a.history[TODAY] : '';
                    valB = (b.history && b.history[TODAY]) ? b.history[TODAY] : '';
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return -1 * ascMult;
            if (valA > valB) return 1 * ascMult;
            return 0;
        });
    }

    /**
     * 各スケジュールの比較用文字列を取得
     */
    static getScheduleSortValue(task) {
        if (task.specificDate) {
            return task.specificDate;
        }
        if (task.daysOfWeek && task.daysOfWeek.length) {
            return 'W-' + task.daysOfWeek.join(',');
        }
        if (task.daysOfMonth && task.daysOfMonth.length) {
            return 'M-' + task.daysOfMonth.map(n => String(n).padStart(2, '0')).join(',');
        }
        return 'Daily';
    }

    /**
     * ソート状態のインジケータ表示をヘッダーUIに同期する
     */
    static updateHeaderUI() {
        const headers = document.querySelectorAll('th[data-sort-col]');
        headers.forEach(th => {
            const col = th.getAttribute('data-sort-col');
            th.classList.remove('sort-asc', 'sort-desc');
            const indicator = th.querySelector('.sort-indicator');
            if (indicator) indicator.textContent = '';

            if (col === sortState.column) {
                if (sortState.ascending) {
                    th.classList.add('sort-asc');
                    if (indicator) indicator.textContent = '▲';
                } else {
                    th.classList.add('sort-desc');
                    if (indicator) indicator.textContent = '▼';
                }
            }
        });
    }
}

function setupPageSpecifics(currentTheme) {
    // --- タスク一覧画面用の初期化 ---
    if (document.getElementById('taskContainer')) {
        const viewModeToggle = document.getElementById('viewModeToggle');
        const hideNonTargetDayBtn = document.getElementById('hideNonTargetDayBtn');
        const hideOutOfTimeBtn = document.getElementById('hideOutOfTimeBtn');
        const hideCompletedBtn = document.getElementById('hideCompletedBtn');
        const hideCancelledBtn = document.getElementById('hideCancelledBtn');

        const setFilterButtonState = (btn, isHidden) => {
            if (!btn) return;
            btn.classList.toggle('is-hidden', isHidden);
            btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
            btn.innerText = isHidden ? '非表示' : '表示';
        };

        const toggleFilterState = (storageKey, btn) => {
            const current = localStorage.getItem(storageKey) === 'true';
            const next = !current;
            localStorage.setItem(storageKey, next);
            setFilterButtonState(btn, next);
            renderCards();
        };

        if (viewModeToggle) {
            const savedViewMode = localStorage.getItem('task_view_mode') || 'card';
            viewModeToggle.checked = savedViewMode === 'table';
            viewModeToggle.addEventListener('change', () => {
                const mode = viewModeToggle.checked ? 'table' : 'card';
                localStorage.setItem('task_view_mode', mode);
                renderCards();
            });
        }

        setFilterButtonState(hideNonTargetDayBtn, LocalStorageHelper.getStoredBool('filter_hide_non_target_day', true));
        setFilterButtonState(hideOutOfTimeBtn, LocalStorageHelper.getStoredBool('filter_hide_out_of_time', false));
        setFilterButtonState(hideCompletedBtn, LocalStorageHelper.getStoredBool('filter_hide_completed', false));
        setFilterButtonState(hideCancelledBtn, LocalStorageHelper.getStoredBool('filter_hide_cancelled', false));

        if (hideNonTargetDayBtn) {
            hideNonTargetDayBtn.addEventListener('click', () => toggleFilterState('filter_hide_non_target_day', hideNonTargetDayBtn));
        }
        if (hideOutOfTimeBtn) {
            hideOutOfTimeBtn.addEventListener('click', () => toggleFilterState('filter_hide_out_of_time', hideOutOfTimeBtn));
        }
        if (hideCompletedBtn) {
            hideCompletedBtn.addEventListener('click', () => toggleFilterState('filter_hide_completed', hideCompletedBtn));
        }
        if (hideCancelledBtn) {
            hideCancelledBtn.addEventListener('click', () => toggleFilterState('filter_hide_cancelled', hideCancelledBtn));
        }

        // --- テーブルソートイベントのイベント委譲によるバインド ---
        const taskContainer = document.getElementById('taskContainer');
        if (taskContainer) {
            taskContainer.addEventListener('click', (e) => {
                const th = e.target.closest('th[data-sort-col]');
                if (th) {
                    const colName = th.getAttribute('data-sort-col');
                    SortManager.handleSort(colName);
                }
            });
        }

        renderCards();
        checkNotificationPermission();
    }

    updateNotificationTestUI();
    
    // --- 通知音の設定セレクタ初期化 ---
    const soundSelect = document.getElementById('notificationSoundSelect');
    if (soundSelect) {
        try {
            soundSelect.value = LocalStorageHelper.notificationSound || 'bell';
        } catch (e) {
            soundSelect.value = 'bell';
        }
        soundSelect.addEventListener('change', (e) => {
            LocalStorageHelper.notificationSound = e.target.value;
        });
    }
    
    // --- 設定画面用の初期化 ---
    const themeForm = document.getElementById('themeForm');
    if (themeForm) {
        const radio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
        if (radio) radio.checked = true;
        // 安全のため、フォーム内の input にもイベントリスナを登録
        document.querySelectorAll('input[name="theme"]').forEach(inp => {
            inp.addEventListener('change', (e) => {
                SettingsView.handleThemeChange(e.target.value);
            });
        });
    }

    const calendarSection = document.getElementById('calendarSection');
    const notificationSection = document.getElementById('notificationSection');
    const supportsLS = LocalStorageHelper.supportsLocalStorage();
    const supportsNotification = ('Notification' in window) && typeof Notification.requestPermission === 'function';

    if (!supportsLS && calendarSection) {
        calendarSection.style.display = 'none';
    }
    if (!supportsNotification && notificationSection) {
        notificationSection.style.display = 'none';
    }

    const calendarIdForm = document.getElementById('calendarIdForm');
    const calendarIdInput = document.getElementById('calendarIdInput');
    const saveStatus = document.getElementById('saveStatus');

    if (calendarIdInput) {
        if (supportsLS) {
            calendarIdInput.value = localStorage.getItem('calendar_target_id') || '';
        } else {
            calendarIdInput.value = '';
            calendarIdInput.placeholder = 'この環境ではカレンダー設定は利用できません';
            calendarIdInput.disabled = true;
        }
    }

    if (calendarIdForm && calendarIdInput && supportsLS) {
        calendarIdForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const inputVal = calendarIdInput.value.trim();
            localStorage.setItem('calendar_target_id', inputVal);
            if (saveStatus) {
                saveStatus.style.display = 'inline';
                setTimeout(() => {
                    saveStatus.style.display = 'none';
                }, 3000);
            }
        });
    }
}

// --- プッシュ通知 ---
function checkNotificationPermission() {
    const banner = document.getElementById('notificationBanner');
    if (!banner) return;
    if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
        banner.style.display = 'none';
        return;
    }
    banner.style.display = (Notification.permission === 'default') ? 'flex' : 'none';
}

function updateNotificationTestUI() {
    const enableBtn = document.getElementById('notificationEnableBtn');
    if (!enableBtn) return;
    const testBtn = document.getElementById('sendTestNotificationBtn');
    if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
        enableBtn.style.display = 'none';
        if (testBtn) testBtn.style.display = 'none';
        return;
    }

    const isGranted = Notification.permission === 'granted';
    enableBtn.style.display = isGranted ? 'none' : 'inline-flex';
    if (testBtn) {
        testBtn.disabled = !isGranted;
        testBtn.title = isGranted ? '' : '先に通知を有効にしてください。';
    }
}

function requestPermission() {
    if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
        alert('このブラウザは通知をサポートしていません。');
        return;
    }

    Notification.requestPermission().then(permission => {
        checkNotificationPermission();
        updateNotificationTestUI();
        if (permission === 'granted') {
            alert('プッシュ通知が有効になりました！');
        }
    });
}

function sendTestNotification() {
    if (!('Notification' in window)) {
        alert('このブラウザは通知に対応していません。');
        return;
    }

    if (Notification.permission !== 'granted') {
        alert('先に「通知を有効にする」を押してください。');
        return;
    }

    const notification = new Notification('通知テスト', {
        body: 'done からのテスト通知です。表示されていれば設定は正常です。',
        icon: 'https://calendar.google.com/calendar/images/favicon_v2014_3.ico'
    });

    notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
    };

    NotificationSound.play();
}

// --- スケジュール合致判定 ---
function isTaskScheduledOnDate(task, date) {

    if (task.specificDate) {
        const dStr = DateHelper.toKebabCase(date);
        if (task.endDate) {
            const start = DateHelper.createStartDate(task);
            const end = DateHelper.createEndDate(task);
            console.log(task.id, task.text, start, end, date);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
                return false;
            }
            if (date < start || date > end) {
                return false;
            }
            const todayCompleted = task.history && task.history[dStr] === 'completed';
            if (todayCompleted) {
                return true;
            }
            const completedBeforeToday = Object.keys(task.history || {}).some(histDate => {
                if (task.history[histDate] !== 'completed') return false;
                return histDate >= task.specificDate && histDate < dStr;
            });
            return !completedBeforeToday;
        }
        return task.specificDate === dStr;
    }

    const currentDayOfWeek = date.getDay();  
    const currentDayOfMonth = date.getDate(); 

    const noWeekRestriction = !task.daysOfWeek || task.daysOfWeek.length === 0;
    const noMonthRestriction = !task.daysOfMonth || task.daysOfMonth.length === 0;
    if (noWeekRestriction && noMonthRestriction) return true;

    if (task.daysOfWeek && task.daysOfWeek.includes(currentDayOfWeek)) return true;
    if (task.daysOfMonth && task.daysOfMonth.includes(currentDayOfMonth)) return true;

    return false;
}

function shouldShowTask(task) {
    const now = new Date();
    if (isTaskScheduledOnDate(task, now)) return true;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (isTaskScheduledOnDate(task, yesterday)) {
        if (task.startTime && task.endTime) {
            const startNorm = DateHelper.normalizeTime(task.startTime);
            const endNorm = DateHelper.normalizeTime(task.endTime);
            if (startNorm > endNorm) {
                const currentStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
                if (currentStr <= endNorm) {
                    return true;
                }
            }
        }
    }
    return false;
}

// タイマー周期処理内で画面表示（renderCards）も更新するように拡張
function initNotificationTimer() {
    checkAndSendNotifications();
    setInterval(() => {
        checkAndSendNotifications();
        renderCards(); // 1分ごとに画面を自動再描画してステータスを同期
    }, 60000);
}

// 再利用できる音声音源ユーティリティ
class NotificationSound {
    /**
     * AudioContext の作成（ブラウザ互換性対応）
     */
    static createAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        return new AudioContext();
    }

    /**
     * MIDIノート番号を周波数に変換
     * @param {number} n - MIDIノート番号 (69 = A4 = 440Hz)
     */
    static noteToFreq(n) {
        return 440 * Math.pow(2, (n - 69) / 12);
    }

    /**
     * オリジナルチャイム (ウェストミンスター寺院の鐘風、伝統的な学校チャイム)
     * テンポと音色を美しく整えた4打点×2構成
     */
    static playOriginal() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const beatDuration = 0.2; // テンポ調整
            const noteToFreq = NotificationSound.noteToFreq;
            // ウェストミンスター・チャイムの音階 (キートランスポーズ：E5, C5, D5, G4...)
            const chimeNotes = [
                { beat: 0, note: 64 }, { beat: 1, note: 60 }, { beat: 2, note: 62 }, { beat: 3, note: 55 }, // キンコンカンコン
                { beat: 5, note: 55 }, { beat: 6, note: 62 }, { beat: 7, note: 64 }, { beat: 8, note: 60 }  // コンカンキンコン
            ];
            const startTime = ctx.currentTime + 0.05;

            chimeNotes.forEach(item => {
                const time = startTime + (item.beat * beatDuration);
                const duration = 1.8;
                // 倍音構成（オルゴール・鐘のような温かみのある響き）
                const partials = [
                    { ratio: 1.0, vol: 0.20 },
                    { ratio: 2.0, vol: 0.08 },
                    { ratio: 3.0, vol: 0.03 },
                    { ratio: 4.0, vol: 0.01 }
                ];
                partials.forEach(partial => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = noteToFreq(item.note) * partial.ratio;
                    
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(partial.vol, time + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(time);
                    osc.stop(time + duration);
                });
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 深みのあるお寺の鐘・重厚なベル (bell)
     */
    static playBell() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const time = ctx.currentTime + 0.02;
            const duration = 4.0;
            const rootNote = 52; // 低めのE

            // 鐘の複雑な非調和倍音構成
            const partials = [
                { ratio: 0.5, vol: 0.25 }, // ハム（低域のうなり）
                { ratio: 1.0, vol: 0.35 }, // プライム（基本音）
                { ratio: 1.2, vol: 0.15 }, // サード（短三度：鐘特有の悲しげな響き）
                { ratio: 1.5, vol: 0.15 }, // フィフス
                { ratio: 2.0, vol: 0.10 }, // オクターブ
                { ratio: 3.0, vol: 0.05 }
            ];

            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0, time);
            masterGain.gain.linearRampToValueAtTime(0.8, time + 0.01);
            masterGain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
            masterGain.connect(ctx.destination);

            partials.forEach((partial) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                // わずかにデチューンさせて揺らぎを作る
                const detune = 1 + (Math.random() - 0.5) * 0.003;
                osc.frequency.value = noteToFreq(rootNote) * partial.ratio * detune;

                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(partial.vol, time + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.00001, time + duration * (1 / partial.ratio)); // 高域ほど早く減衰

                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(time);
                osc.stop(time + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 高音できらびやかなフロントエンド・クリスタルベル (bell-high)
     */
    static playBellHigh() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const time = ctx.currentTime + 0.02;
            const duration = 2.5;
            const notes = [76, 79, 83]; // E5, G5, B5 (Emの上品な和音アルペジオ)

            notes.forEach((note, i) => {
                const noteTime = time + (i * 0.08);
                const partials = [
                    { ratio: 1.0, vol: 0.25 },
                    { ratio: 2.0, vol: 0.12 },
                    { ratio: 3.0, vol: 0.05 },
                    { ratio: 4.0, vol: 0.02 }
                ];

                const masterGain = ctx.createGain();
                masterGain.gain.setValueAtTime(0, noteTime);
                masterGain.gain.linearRampToValueAtTime(0.4, noteTime + 0.01);
                masterGain.gain.exponentialRampToValueAtTime(0.00001, noteTime + duration);
                masterGain.connect(ctx.destination);

                partials.forEach(partial => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = noteToFreq(note) * partial.ratio;

                    gain.gain.setValueAtTime(0, noteTime);
                    gain.gain.linearRampToValueAtTime(partial.vol, noteTime + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.00001, noteTime + duration * (0.8 / partial.ratio));

                    osc.connect(gain);
                    gain.connect(masterGain);
                    osc.start(noteTime);
                    osc.stop(noteTime + duration);
                });
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 控えめで上品な「ポロン」というツイン・サインベル (soft)
     */
    static playSoft() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const now = ctx.currentTime + 0.02;
            const freqs = [76, 81]; // Mi, La の心地よい完全4度上昇

            freqs.forEach((n, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const time = now + i * 0.08;
                const duration = 0.5;

                osc.frequency.value = noteToFreq(n);
                
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.15, time + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);

                // 角をとるローパスフィルター
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 1500;

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(time);
                osc.stop(time + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 警告レベルのクラクション・アラートノイズ (loud)
     */
    static playLoud() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const t = ctx.currentTime + 0.02;
            const duration = 0.4;

            const master = ctx.createGain();
            master.gain.setValueAtTime(0, t);
            master.gain.linearRampToValueAtTime(0.6, t + 0.01);
            master.gain.exponentialRampToValueAtTime(0.00001, t + duration);
            master.connect(ctx.destination);

            // 激しい矩形波
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.linearRampToValueAtTime(180, t + duration); // わずかにピッチダウンさせて威嚇感を出す

            // メタルノイズ（金属的な衝突音）を混ぜる
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 1000;
            noiseFilter.Q.value = 2;

            osc.connect(master);
            noise.connect(noiseFilter);
            noiseFilter.connect(master);

            osc.start(t);
            osc.stop(t + duration);
            noise.start(t);
            noise.stop(t + duration);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 高音の警告・ホイッスル風電子アラーム (loud-high)
     */
    static playLoudHigh() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const t = ctx.currentTime + 0.02;
            const duration = 0.5;

            const master = ctx.createGain();
            master.gain.setValueAtTime(0, t);
            master.gain.linearRampToValueAtTime(0.5, t + 0.01);
            master.gain.exponentialRampToValueAtTime(0.00001, t + duration);
            master.connect(ctx.destination);

            // 高ピッチの矩形波 + スイープ
            const osc1 = ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(880, t);
            osc1.frequency.linearRampToValueAtTime(1200, t + duration); // 駆け上がるピッチ

            const osc2 = ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(885, t); // デチューンによるうなり

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 2500;

            osc1.connect(lp);
            osc2.connect(lp);
            lp.connect(master);

            osc1.start(t);
            osc1.stop(t + duration);
            osc2.start(t);
            osc2.stop(t + duration);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * iPhoneでお馴染みの代表的サウンド「トライトーン」 (bright)
     * 音階: ソ(G5:79) -> ミ(E5:76) -> ド(C5:72)
     * 3音の独立したオシレーターによるポリフォニック・美しいハーモニー残響を完全再現。
     */
    static playIphone() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [79, 76, 72]; // G5, E5, C5 (トライトーン)
            const start = ctx.currentTime + 0.02;

            seq.forEach((n, i) => {
                const t = start + i * 0.15;
                const duration = 1.5; // 余韻を長めにとりポリフォニー化

                const osc = ctx.createOscillator();
                const overtone = ctx.createOscillator(); // 豊かな倍音をわずかに合成
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                overtone.type = 'sine';
                overtone.frequency.value = noteToFreq(n) * 2; // オクターブ上の倍音

                // アタックを少し柔らかくしてリッチにする
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.20, t + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                // 高音の艶を出すためのバンドパスフィルタ
                const filt = ctx.createBiquadFilter();
                filt.type = 'bandpass';
                filt.frequency.value = noteToFreq(n);
                filt.Q.value = 1.8;

                osc.connect(filt);
                overtone.connect(filt);
                filt.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                overtone.start(t);
                osc.stop(t + duration);
                overtone.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * Android系でよく聴く、丸みのあるピコピコした未来系チャイム (pulse)
     */
    static playAndroid() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const pattern = [72, 76, 79, 84]; // C5 -> E5 -> G5 -> C6 (アルペジオ)
            const start = ctx.currentTime + 0.02;

            pattern.forEach((n, i) => {
                const t = start + i * 0.07;
                const duration = 0.4;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                // 丸い矩形波（ローパスで高域を大きく削る）
                osc.type = 'triangle';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 1800;

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * マクドナルドのポテト揚がった音「ティロリ♪」の完全再現 (potato)
     * 正確な音階: F#5 (78) -> D#5 (75) -> F#5 (78) を2連射。アタックとスタッカートの長さを極限調律。
     */
    static playMcd() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            
            // F#5, D#5, F#5 の「ティロリ」を2回繰り返す
            const sequence = [
                { note: 78, delay: 0.00 },
                { note: 75, delay: 0.10 },
                { note: 78, delay: 0.20 },
                
                { note: 78, delay: 0.45 },
                { note: 75, delay: 0.55 },
                { note: 78, delay: 0.65 }
            ];

            sequence.forEach((step) => {
                const t = start + step.delay;
                const duration = 0.09; // 歯切れの良い完璧なスタッカート

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                // 実機に近い少しチープで丸いサイン波
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(step.note);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.004);
                gain.gain.setValueAtTime(0.25, t + duration - 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration + 0.01);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * ファミコン版マリオの「コイン」獲得音の完全再現 (coin)
     * 1音目: B6 (95)が約0.07秒。2音目: E7 (100)が約0.38秒。
     * 矩形波アタック感と2A03音源独自の音量ステップ・エンベロープを完璧にシミュレート。
     */
    static playMario() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;

            const notes = [
                { note: 95, time: 0.00, dur: 0.07 },
                { note: 100, time: 0.07, dur: 0.38 }
            ];

            notes.forEach((item, idx) => {
                const t = start + item.time;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'square'; // ファミコンパルス波
                osc.frequency.value = noteToFreq(item.note);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.18, t + 0.002);
                
                if (idx === 0) {
                    // 1音目は次の音と隙間なく瞬時に切れる
                    gain.gain.setValueAtTime(0.18, t + item.dur - 0.002);
                    gain.gain.linearRampToValueAtTime(0, t + item.dur);
                } else {
                    // 2音目はドラムのような美しい減衰
                    gain.gain.exponentialRampToValueAtTime(0.00001, t + item.dur);
                }

                // 「チリーン」とした金属感を引き出すための中高域用フィルタ
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 1200;

                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.value = noteToFreq(item.note);
                bp.Q.value = 1.2;

                osc.connect(hp);
                hp.connect(bp);
                bp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + item.dur + 0.05);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * ドラクエ風「レベルアップ」音 (levelup1 / dq_levelup)
     * 変ホ長調 (Eb Major) の完璧な高速16分アルペジオ上昇と、3度上でハモる実機通りのデュオ矩形波編成。
     */
    static playDq() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            
            // 主旋律と3度ハモリのMIDIノート
            const melody = [75, 77, 79, 80, 82, 84, 86, 87, 89, 86, 87];
            const harmony = [79, 80, 82, 84, 86, 87, 89, 91, 92, 89, 91];
            const stepTime = 0.048; // 超高速な駆け上がり

            melody.forEach((note, i) => {
                const t = start + (i * stepTime);
                const isLast = i === melody.length - 1;
                const duration = isLast ? 0.7 : stepTime - 0.003;

                // 1. 主旋律 (矩形波)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'square';
                osc1.frequency.value = noteToFreq(note);

                gain1.gain.setValueAtTime(0, t);
                gain1.gain.linearRampToValueAtTime(0.12, t + 0.002);
                if (isLast) {
                    gain1.gain.exponentialRampToValueAtTime(0.00001, t + duration);
                } else {
                    gain1.gain.setValueAtTime(0.12, t + duration - 0.002);
                    gain1.gain.linearRampToValueAtTime(0, t + duration);
                }

                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(t);
                osc1.stop(t + duration + 0.02);

                // 2. ハモリ (3度上の矩形波)
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'square';
                osc2.frequency.value = noteToFreq(harmony[i]);

                gain2.gain.setValueAtTime(0, t);
                gain2.gain.linearRampToValueAtTime(0.08, t + 0.002);
                if (isLast) {
                    gain2.gain.exponentialRampToValueAtTime(0.00001, t + duration);
                } else {
                    gain2.gain.setValueAtTime(0.08, t + duration - 0.002);
                    gain2.gain.linearRampToValueAtTime(0, t + duration);
                }

                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(t);
                osc2.stop(t + duration + 0.02);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * ポケモン回復（ポケモンセンター）風チャイム (levelup2)
     */
    static playPokemon() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const seq = [64, 66, 68, 69, 71, 73, 74, 76]; // ホ長調（Eメジャー）上昇
            const speed = 0.07;

            seq.forEach((n, i) => {
                const t = start + i * speed;
                const duration = 0.4;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * リアルな水滴音「ドタプン・ピチャン」 (slap / dotapun)
     */
    static playDotapun() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;
            const duration = 0.25;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            
            // ピッチの急激な下降（ドタッ、プン）
            osc.frequency.setValueAtTime(1200, start);
            osc.frequency.exponentialRampToValueAtTime(150, start + 0.08); // 急降下して水に落ちる音
            osc.frequency.exponentialRampToValueAtTime(800, start + duration); // 最後に気泡が浮く音

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.4, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.00001, start + duration);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1800;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + duration);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * やさしい木琴・マリンバ風 (marimba)
     */
    static playMarimba() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [67, 72, 74, 79]; // ソ, ド, レ, ソ
            const start = ctx.currentTime + 0.02;

            seq.forEach((n, i) => {
                const t = start + i * 0.1;
                const duration = 0.5;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = noteToFreq(n) * 1.05;
                filter.Q.value = 5;

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 透明感ある定番メール着信通知チャイム (mail_received)
     * Outlook風の「テロリン♪」(F5→C6) をさわやかなサイン倍音合成で完全再現。
     */
    static playMail() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const seq = [77, 84]; // F5 -> C6 の完全5度上昇
            const delay = 0.12;

            seq.forEach((n, i) => {
                const t = start + i * delay;
                const duration = 1.5;

                const osc = ctx.createOscillator();
                const overtone = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                overtone.type = 'sine';
                overtone.frequency.value = noteToFreq(n) * 2; // オクターブ上の明るいきらめき

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.20, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 3000;

                osc.connect(filter);
                overtone.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                overtone.start(t);
                osc.stop(t + duration);
                overtone.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 「ぽきぽき（LINE風）」通知サウンド (line_pokipoki)
     * 完全に「コポッ♪」と弾ける、あの特徴的な超短時間ピッチ降下と2連打の完全再現。
     */
    static playLinePokipoki() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;

            const clicks = [
                { time: 0.00, startFreq: 1400, endFreq: 400, dur: 0.035, vol: 0.25 },
                { time: 0.07, startFreq: 1600, endFreq: 450, dur: 0.045, vol: 0.35 }
            ];

            clicks.forEach((click) => {
                const t = start + click.time;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(click.startFreq, t);
                osc.frequency.exponentialRampToValueAtTime(click.endFreq, t + click.dur);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(click.vol, t + 0.002);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + click.dur);

                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 2200;

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + click.dur + 0.01);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * Slackの優しくノックするような通知サウンド (slack_knock)
     * ドアを叩く「トントン」というこもったウッドノックを再現。
     */
    static playSlackKnock() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;
            const steps = [0.0, 0.14]; // トン、トンの時間間隔

            steps.forEach((delay) => {
                const t = start + delay;
                const duration = 0.06;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(450, t);
                osc.frequency.exponentialRampToValueAtTime(150, t + duration);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.4, t + 0.002);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 800; // 深い木の残響のみ

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration + 0.02);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * Discordの丸みのあるチャイムサウンド (discord_ping)
     * G5(79)とD5(74)を同時に優しくフワッと立ち上げてポコッと落とす。
     */
    static playDiscordPing() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const t = ctx.currentTime + 0.02;
            const duration = 0.35;
            const notes = [74, 79];

            notes.forEach((n) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 1500;

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration + 0.02);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色1: 「キラリーン！」星が輝くようなファンタジー・スター (recommend1)
     */
    static playRecommend1() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const seq = [79, 83, 86, 91]; // G5, B5, D6, G6

            seq.forEach((n, i) => {
                const t = start + i * 0.06;
                const duration = 0.8;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 1000;

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色2: 「フワッ」とした温かみのあるアンビエント・パッド風サイン (recommend2)
     */
    static playRecommend2() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const chord = [64, 67, 71, 74]; // Em9
            const duration = 1.5;

            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0, start);
            masterGain.gain.linearRampToValueAtTime(0.35, start + 0.2);
            masterGain.gain.exponentialRampToValueAtTime(0.00001, start + duration);
            masterGain.connect(ctx.destination);

            chord.forEach((n) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                osc.connect(masterGain);
                osc.start(start);
                osc.stop(start + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色3: 「タララ・ラーン！」達成感のある大成功ファンファーレ (success)
     */
    static playSuccess() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const seq = [60, 64, 67, 72]; // C4, E4, G4, C5 (ハ長調の分散和音)
            const tempo = 0.08;

            seq.forEach((n, i) => {
                const t = start + (i * tempo);
                const isLast = i === seq.length - 1;
                const duration = isLast ? 1.2 : 0.15;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                // 華やかなブラス・シンセ風のノコギリ波
                osc.type = 'sawtooth'; 
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                // ローパスフィルターで最初は明るく、徐々に丸い音に
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(3000, t);
                lp.frequency.exponentialRampToValueAtTime(300, t + duration);

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色4: 「シャラララーン」魔法をかけたようなキラキラウィンドチャイム (magic)
     */
    static playMagic() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            // C5から始まるペンタトニックスケールの高速駆け上がり
            const notes = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93]; 
            const speed = 0.035;

            notes.forEach((n, i) => {
                const t = start + i * speed;
                const duration = 0.8;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine'; // 澄んだ音色
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                // パンニングで左右に散らすとより魔法っぽくなる(ステレオ対応環境向け)
                if (ctx.createStereoPanner) {
                    const panner = ctx.createStereoPanner();
                    panner.pan.value = (i % 2 === 0) ? 0.5 : -0.5; // 左右に振る
                    osc.connect(panner);
                    panner.connect(gain);
                } else {
                    osc.connect(gain);
                }
                
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色5: 「シュワァーン」SF風のワープ・空間移動音 (warp)
     */
    static playWarp() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;
            const duration = 0.9;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            
            // ピッチが急上昇して、なだらかに降下していく
            osc.frequency.setValueAtTime(150, start);
            osc.frequency.exponentialRampToValueAtTime(1800, start + 0.2);
            osc.frequency.exponentialRampToValueAtTime(50, start + duration);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.3, start + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.00001, start + duration);

            // 少し歪み(Drive)のような効果を出すため波形をシェイピング
            const distortion = ctx.createWaveShaper();
            function makeDistortionCurve(amount) {
                let k = typeof amount === 'number' ? amount : 50,
                    n_samples = 44100,
                    curve = new Float32Array(n_samples),
                    deg = Math.PI / 180,
                    i = 0,
                    x;
                for ( ; i < n_samples; ++i ) {
                    x = i * 2 / n_samples - 1;
                    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
                }
                return curve;
            }
            distortion.curve = makeDistortionCurve(20);
            distortion.oversample = '4x';

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, start);
            filter.frequency.exponentialRampToValueAtTime(4000, start + 0.2);
            filter.frequency.exponentialRampToValueAtTime(100, start + duration);

            osc.connect(distortion);
            distortion.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + duration);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 「チン！」という澄んだ電子レンジやベルの金属音 (ding)
     */
    static playDing() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const t = ctx.currentTime + 0.02;
            const duration = 2.0;
            const rootFreq = 1800; // 高音のチン

            const master = ctx.createGain();
            master.gain.setValueAtTime(0, t);
            master.gain.linearRampToValueAtTime(0.4, t + 0.002);
            master.gain.exponentialRampToValueAtTime(0.00001, t + duration);
            master.connect(ctx.destination);

            // 金属の響きを作る非調和倍音
            const partials = [1.0, 1.91, 2.44, 3.12];
            partials.forEach((ratio, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(rootFreq * ratio, t);
                
                const vol = 0.15 / (i + 1);
                gain.gain.setValueAtTime(vol, t);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration / (i * 0.5 + 1));

                osc.connect(gain);
                gain.connect(master);
                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * ジョジョの「To Be Continued」(jojo)
     */
    static playJojo() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;

            const seq = [
                { note: 79, delay: 0.00, duration: 1.00 },
                { note: 83, delay: 0.08, duration: 1.20 },
                { note: 88, delay: 0.16, duration: 1.50 }
            ];

            seq.forEach((item) => {
                const t = start + item.delay;
                const duration = item.duration;

                const partials = [
                    { ratio: 1.0, vol: 0.50 },
                    { ratio: 2.0, vol: 0.26 },
                    { ratio: 3.0, vol: 0.10 }
                ];

                partials.forEach(partial => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(noteToFreq(item.note) * partial.ratio, t);

                    // エンベロープ設定 (アタック・デケイ)
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(partial.vol, t + 0.016);
                    gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);
                    
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(noteToFreq(item.note) * 1, t);
                filter.Q.setValueAtTime(3.1, t);
                
                    
                osc.connect(filter);
                filter.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(t);
                    osc.stop(t + duration + 0.05);
                });
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 統合再生インターフェース
     * @param {string} profile - 再生したいサウンドキー
     */
    static play(profile = (typeof LocalStorageHelper !== 'undefined' && LocalStorageHelper.notificationSound) || 'bell') {
        const map = {
            // 基本システムキー
            'original': NotificationSound.playOriginal,
            'bell': NotificationSound.playBell,
            'bell-high': NotificationSound.playBellHigh,
            'soft': NotificationSound.playSoft,
            'loud': NotificationSound.playLoud,
            'loud-high': NotificationSound.playLoudHigh,
            'marimba': NotificationSound.playMarimba,
            'recommend1': NotificationSound.playRecommend1,
            'recommend2': NotificationSound.playRecommend2,
            'success': NotificationSound.playSuccess,
            'magic': NotificationSound.playMagic,
            'warp': NotificationSound.playWarp,

            // システムUI側マッピング
            'bright': NotificationSound.playIphone,       // iPhoneトライトーン
            'pulse': NotificationSound.playAndroid,       // Android
            'potato': NotificationSound.playMcd,          // マクドナルドポテト
            'coin': NotificationSound.playMario,          // マリオコイン
            'levelup1': NotificationSound.playDq,         // ドラクエレベルアップ
            'levelup2': NotificationSound.playPokemon,    // ポケモン回復
            'slap': NotificationSound.playDotapun,        // 水滴ドタプン
            'dotapun': NotificationSound.playDotapun,     // 水滴ドタプン

            // アプリ系＆追加サウンドキー
            'ding': NotificationSound.playDing,                   // チン！
            'mail_received': NotificationSound.playMail,           // メールの着信音
            'line_pokipoki': NotificationSound.playLinePokipoki,   // ぽきぽき（LINE）
            'slack_knock': NotificationSound.playSlackKnock,       // Slack
            'discord_ping': NotificationSound.playDiscordPing,     // Discord
            'jojo': NotificationSound.playJojo,                   // ジョジョ

            // エイリアス
            'iphone': NotificationSound.playIphone,
            'android': NotificationSound.playAndroid,
            'mcd_potato': NotificationSound.playMcd,
            'mario_coin': NotificationSound.playMario,
            'dq_levelup': NotificationSound.playDq,
            'pokemon_heal': NotificationSound.playPokemon,
            'droplet_dotapun': NotificationSound.playDotapun
        };

        const fn = map[profile] || NotificationSound.playBell;
        return fn();
    }
}

function checkAndSendNotifications() {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    let isUpdated = false;

    tasks.forEach(task => {
        if (!task.startTime) return;

        const candidate = getNotificationCandidate(task, now);
        if (!candidate) return;

        const groupName = task.group || "その他";
        const descText = task.description ? `\n${task.description}` : "";

        let bodyText = `「${task.text}」が実施可能な時間になりました。${descText}`;
        if (candidate.leadMinutes !== null && candidate.leadMinutes > 0) {
            bodyText = `「${task.text}」の ${candidate.leadMinutes} 分前です（開始 ${candidate.startNorm}）。${descText}`;
        }
        
        const notification = new Notification(`[${groupName}] タスクの時間です`, {
            body: bodyText,
            icon: "https://calendar.google.com/calendar/images/favicon_v2014_3.ico"
        });

        notification.onclick = function(event) {
            event.preventDefault();
            const targetUrl = new URL('/done', window.location.href).href;
            window.open(targetUrl, '_blank');
        };

        NotificationSound.play();

        task.notifiedDate = candidate.scheduledDateKey;
        isUpdated = true;
    });

    if (isUpdated) {
        localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
    }
}

function isWithinTime(task) {
    if (!task.startTime && !task.endTime) return { valid: true, msg: "" };
    
    const now = new Date();
    const currentStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    
    const start = DateHelper.normalizeTime(task.startTime || "00:00");
    const end = DateHelper.normalizeTime(task.endTime || "23:59");
    
    if (start <= end) {
        // 通常の時間帯（同一日内）
        if (currentStr < start) return { valid: false, msg: `時間外 (${start}から)` };
        if (currentStr > end) return { valid: false, msg: `時間外 (${end}まで)` };
    } else {
        // 翌日をまたぐ時間帯（start > end）
        // 前日の履歴をチェック
        const YESTERDAY = DateHelper.yesterday;
        const hasYesterdayHistory = task.history && task.history[YESTERDAY];
        
        // 前日の履歴がある場合のみ、startTimeまでを時間外にする
        if (hasYesterdayHistory && currentStr < start) {
            return { valid: false, msg: `時間外 (${start}から)` };
        }
        // currentStr >= start OR currentStr <= end なら時間内
        if (currentStr < start && currentStr > end) {
            return { valid: false, msg: `時間外 (${start}〜翌${end})` };
        }
    }
    return { valid: true, msg: "" };
}

function getTaskStatusInfo(task, todayStatus, timeCheck, isTargetDay) {
    if (todayStatus === 'completed') {
        return { label: '追加済み', className: 'chip-status-done', locked: true };
    }
    if (todayStatus === 'cancelled') {
        return { label: 'キャンセル済', className: 'chip-status-cancel', locked: true };
    }
    if (!isTargetDay) {
        return { label: '対象日外', className: 'chip-status-nontarget', locked: true };
    }
    if (!timeCheck.valid && hasExplicitReminderLead(task)) {
        return { label: 'リマインダー', className: 'chip-status-reminder', locked: false };
    }
    if (timeCheck.valid) {
        return { label: '実施可能', className: 'chip-status-active', locked: false };
    }
    return { label: '未実施', className: 'chip-status-todo', locked: false };
}

function getScheduleLabel(task) {
    if (task.specificDate) {
        if (task.endDate) {
            if (task.endDate === task.specificDate) {
                return task.specificDate;
            }
            return `${task.specificDate} 〜 ${task.endDate}`;
        }
        return task.specificDate;
    }
    if (task.daysOfWeek && task.daysOfWeek.length) {
        const labels = ['日', '月', '火', '水', '木', '金', '土'];
        return task.daysOfWeek.map(day => labels[day] + '曜').join(', ');
    }
    if (task.daysOfMonth && task.daysOfMonth.length) {
        return task.daysOfMonth.map(day => `${day}日`).join(', ');
    }
    return '毎日';
}

function renderTableView(container, filteredTasks, today, targetDayMap) {
    const YESTERDAY = DateHelper.yesterday;
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    table.className = 'task-table';
    
    // ヘッダーセルにソート属性（data-sort-col）とソート指示記号を追加
    table.innerHTML = `
        <thead>
            <tr>
                <th data-sort-col="group" style="cursor: pointer; user-select: none;">グループ <span class="sort-indicator"></span></th>
                <th data-sort-col="task" style="cursor: pointer; user-select: none;">タスク <span class="sort-indicator"></span></th>
                <th data-sort-col="time" style="cursor: pointer; user-select: none;">時間 <span class="sort-indicator"></span></th>
                <th data-sort-col="date" style="cursor: pointer; user-select: none;">日付 <span class="sort-indicator"></span></th>
                <th data-sort-col="status" style="cursor: pointer; user-select: none;">ステータス <span class="sort-indicator"></span></th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    filteredTasks.forEach((task, idx) => {
        const taskIndex = tasks.findIndex(t => t.id === task.id);
        const todayStatus = task.history[today];
        const yesterdayStatus = task.history[YESTERDAY];
        const timeCheck = isWithinTime(task);
        const isTargetDay = targetDayMap[task.id] === true;
        const statusInfo = getTaskStatusInfo(task, todayStatus, timeCheck, isTargetDay);
        const isStrict = task.strictMode === true || task.strictMode === 'true';
        const addDisabled = statusInfo.locked || (!timeCheck.valid && isStrict);
        const row = document.createElement('tr');

        if (todayStatus) {
            row.setAttribute('data-done', 'true');
        }

        const timeLabel = task.startTime || task.endTime
            ? `${task.startTime || '00:00'} - ${task.endTime || '23:59'}`
            : '-';

        const actionSecondary = task.specificDate
            ? `<button class="table-btn table-btn-danger" ${statusInfo.locked ? 'disabled' : ''} onclick="ItemView.deleteActualTask('${task.id}')">削除</button>`
            : `<button class="table-btn" ${statusInfo.locked ? 'disabled' : ''} onclick="executeTask(${taskIndex}, true)">キャンセル</button>`;

        const actionMain = todayStatus
            ? `<button class="table-btn" onclick="ItemView.undoTask(${taskIndex})">戻す</button>`
            : `<button class="table-btn table-btn-primary" ${addDisabled ? 'disabled' : ''} onclick="executeTask(${taskIndex}, false)">追加</button>`;

        let groupChipClass = 'chip chip-group';
        if (yesterdayStatus === 'completed') {
            groupChipClass += ' chip-group--completed-yesterday';
        } else if (yesterdayStatus === 'cancelled') {
            groupChipClass += ' chip-group--cancelled-yesterday';
        }

        row.innerHTML = `
            <td><span class="${groupChipClass}">${task.group || 'その他'}</span></td>
            <td class="task-name">${task.link ? ('<a href="' + task.link + '" target="_blank" rel="noopener noreferrer">' + task.text + '</a>') : task.text}</td>
            <td>${timeLabel}</td>
            <td>${getScheduleLabel(task)}</td>
            <td><span class="chip ${statusInfo.className}">${statusInfo.label}</span></td>
            <td>
                <div class="table-actions">
                    ${actionMain}
                    ${todayStatus ? '' : actionSecondary}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
}

// --- メイン描画 ---
function renderCards() {
    const container = document.getElementById('taskContainer');
    if (!container) return; 
    container.innerHTML = '';

    const TODAY = DateHelper.today;
    const YESTERDAY = DateHelper.yesterday;

    // ソート条件が設定されていれば、描画の直前にデータをソート
    if (sortState.column) {
        SortManager.sortTasks();
    }

    const filteredTasks = [];
    const targetDayMap = {};
    const groups = {};
    tasks.forEach(task => {
        const isTargetDay = shouldShowTask(task);
        targetDayMap[task.id] = isTargetDay;
        if (!isTargetDay && FilterManager.hideNonTargetDay) return;

        const todayStatus = task.history[TODAY];
        const timeCheck = isWithinTime(task);

        if (todayStatus === 'completed' && FilterManager.hideCompleted) return;
        if (todayStatus === 'cancelled' && FilterManager.hideCancelled) return;
        if (isTargetDay && !todayStatus && !timeCheck.valid && FilterManager.hideOutOfTime && !hasExplicitReminderLead(task)) return;

        const groupName = task.group || "その他";
        filteredTasks.push(task);
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(task);
    });

    if (filteredTasks.length === 0) {
        container.innerHTML = '<p class="empty-task-msg">表示可能なタスクはありません（フィルターが適用されている可能性があります）。</p>';
        return;
    }

    const currentViewMode = localStorage.getItem('task_view_mode') || 'card';
    document.body.classList.toggle('table-view-mode', currentViewMode === 'table');
    if (currentViewMode === 'table') {
        renderTableView(container, filteredTasks, TODAY, targetDayMap);
        // テーブルレンダリング後にヘッダーUIに現在のソート状態（矢印など）を反映
        SortManager.updateHeaderUI();
        return;
    }

    for (const groupName in groups) {
        // カードビューモードの場合は、従来どおり累計実績の多い順などでグループ内ソートを優先（ソート状態に左右されない元のロジックを担保）
        if (!sortState.column) {
            groups[groupName].sort((a, b) => {
                const countA = Object.values(a.history || {}).filter(v => v === 'completed').length;
                const countB = Object.values(b.history || {}).filter(v => v === 'completed').length;
                return countB - countA;
            });
        }

        const groupSection = document.createElement('div');
        groupSection.className = 'group-section';
        
        const title = document.createElement('h3');
        title.className = 'group-title';
        title.innerText = groupName;
        groupSection.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'grid';

        groups[groupName].forEach(task => {
            const taskIndex = tasks.findIndex(t => t.id === task.id);
            const isTargetDay = targetDayMap[task.id] === true;
            const todayStatus = task.history[TODAY];
            const yesterdayStatus = task.history[YESTERDAY];
            const timeCheck = isWithinTime(task);
            const statusInfo = getTaskStatusInfo(task, todayStatus, timeCheck, isTargetDay);
            
            const totalCompleted = Object.values(task.history || {}).filter(v => v === 'completed').length;

            const card = document.createElement('div');
            card.className = `card`;

            if (todayStatus) {
                card.setAttribute('data-done', 'true');
            } else if (!timeCheck.valid) {
                card.setAttribute('data-out-of-time', 'true');
            }

            let badgeClass = 'status-badge';
            let badgeHtml = `<span class="${badgeClass}">${statusInfo.label}</span>`;
            let isLocked = statusInfo.locked;
            if (todayStatus === 'completed') {
                badgeClass += ' status-completed';
            } else if (todayStatus === 'cancelled') {
                badgeClass += ' status-cancelled';
            } else if (statusInfo.className === 'chip-status-reminder') {
                badgeClass += ' status-reminder';
            }
            badgeHtml = `<span class="${badgeClass}">${statusInfo.label}</span>`;

            let yesterdayHtml = "昨日: 履歴なし";
            if (yesterdayStatus === 'completed') yesterdayHtml = "昨日: 完了";
            if (yesterdayStatus === 'cancelled') yesterdayHtml = "昨日: キャンセル";

            let timeInfoHtml = "";
            if (task.startTime || task.endTime) {
                const startNorm = DateHelper.normalizeTime(task.startTime || "00:00");
                const endNorm = DateHelper.normalizeTime(task.endTime || "23:59");
                const modeLabel = task.strictMode ? " (厳格)" : "";
                
                const displayEnd = (startNorm > endNorm) ? `翌${task.endTime}` : task.endTime;
                timeInfoHtml = `<div class="time-restriction">${task.startTime || '00:00'} 〜 ${displayEnd || '23:59'}${modeLabel}</div>`;
            }

            let descriptionHtml = "";
            if (task.description) {
                descriptionHtml = `<div class="task-description">${task.description}</div>`;
            }

            let linkHtml = "";
            if (task.link) {
                linkHtml = `<a href="${task.link}" target="_blank" rel="noopener noreferrer" class="task-link">関連リンク ↗</a>`;
            }

            const undoButtonHtml = todayStatus ? `<button class="btn-undo" onclick="ItemView.undoTask(${taskIndex})">✕</button>` : '';

            let buttonDisabled = false;
            const isStrict = task.strictMode === true || task.strictMode === 'true';
            
            if (isLocked) {
                buttonDisabled = true;
            } else if (!timeCheck.valid && isStrict) {
                buttonDisabled = true; 
            }

            // --- サブアクションボタン（キャンセル or 削除）の条件分岐 ---
            let secondaryButtonHtml = "";
            if (task.specificDate) {
                // 一時的タスクの場合はキャンセルではなく「削除」ボタンにする（既存の赤色指定を流用）
                secondaryButtonHtml = `<button class="btn" style="background-color: #ef4444; color: #ffffff; flex: 1;" ${isLocked ? 'disabled' : ''} onclick="ItemView.deleteActualTask('${task.id}')">削除</button>`;
            } else {
                // 通常ルーティンタスクは従来通り「キャンセル」
                secondaryButtonHtml = `<button class="btn btn-cancel" ${isLocked ? 'disabled' : ''} onclick="executeTask(${taskIndex}, true)">キャンセル</button>`;
            }

            card.innerHTML = `
                ${undoButtonHtml}
                <div>
                    <h4 class="card-title">${task.text}</h4>
                    ${badgeHtml}
                    ${timeInfoHtml}
                    ${descriptionHtml}
                    ${linkHtml}
                    <div class="history-status">${yesterdayHtml}</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-action" ${buttonDisabled ? 'disabled' : ''} onclick="executeTask(${taskIndex}, false)">追加</button>
                    ${secondaryButtonHtml}
                </div>
                <div class="card-footer">
                    累計実績: ${totalCompleted} 回
                </div>
            `;

            grid.appendChild(card);
        });

        groupSection.appendChild(grid);
        container.appendChild(groupSection);
    }
}

// --- タスク実行 ---
function executeTask(index, isCancel) {
    const TODAY = DateHelper.today;
    tasks[index].history[TODAY] = isCancel ? 'cancelled' : 'completed';
    localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
    renderCards();

    const startTime = DateHelper.todayUTC;
    const endTime = startTime; 
    
    const groupName = tasks[index].group || "その他";
    let displayTitle = `[${groupName}] ${tasks[index].text}`;
    
    let details = ""; 
    if (tasks[index].description) {
        details += `${tasks[index].description}\n`;
    }
    if (tasks[index].link) {
        details += `${tasks[index].link}\n`;
    }

    if (isCancel) {
        displayTitle = `【未実施】[${groupName}] ${tasks[index].text}`;
        details += "※保存時に手動で「フラミンゴ」カラーへ変更してください。";
    }
    
    const calendarId = localStorage.getItem('calendar_target_id') || '';
    let baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    if (calendarId) {
        baseUrl += `&src=${encodeURIComponent(calendarId)}`;
    }
    
    window.open(`${baseUrl}&text=${encodeURIComponent(displayTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}`, '_blank');
}

MainController.initApp();