let tasks = [];

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
                tasks = JSON.parse(savedTasks);
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
        tasks = array;
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
    static createAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        return new AudioContext();
    }

    static noteToFreq(n) {
        return 440 * Math.pow(2, (n - 69) / 12);
    }

    static playOriginal() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const beatDuration = 0.1;
            const noteToFreq = NotificationSound.noteToFreq;
            const chimeNotes = [
                { beat: 0, note: 64 }, { beat: 2, note: 60 }, { beat: 4, note: 62 }, { beat: 6, note: 55 },
                { beat: 9, note: 55 }, { beat: 11, note: 62 }, { beat: 13, note: 64 }, { beat: 15, note: 60 }
            ];
            const startTime = ctx.currentTime + 0.1;
            chimeNotes.forEach(item => {
                const time = startTime + (item.beat * beatDuration);
                const duration = 4.0;
                const partials = [
                    { ratio: 1.0, vol: 0.25 },
                    { ratio: 2.0, vol: 0.05 },
                    { ratio: 3.0, vol: 0.015 },
                    { ratio: 4.0, vol: 0.005 }
                ];
                partials.forEach(partial => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = noteToFreq(item.note) * partial.ratio;
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(partial.vol, time + 0.03);
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

    static playBell() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const beatDuration = 0.1;
            const noteToFreq = NotificationSound.noteToFreq;
            const chimeNotes = [
                { beat: 0, note: 64 }, { beat: 2, note: 60 }, { beat: 4, note: 62 }, { beat: 6, note: 55 },
                { beat: 9, note: 55 }, { beat: 11, note: 62 }, { beat: 13, note: 64 }, { beat: 15, note: 60 }
            ];
            const startTime = ctx.currentTime + 0.05;
            chimeNotes.forEach(item => {
                const time = startTime + (item.beat * beatDuration);
                const duration = 5.5;
                const partials = [
                    { ratio: 1.0, vol: 0.5 },
                    { ratio: 2.99, vol: 0.12 },
                    { ratio: 4.01, vol: 0.08 },
                    { ratio: 5.4, vol: 0.04 },
                    { ratio: 6.8, vol: 0.02 }
                ];
                const masterGain = ctx.createGain();
                masterGain.gain.setValueAtTime(0, time);
                masterGain.gain.linearRampToValueAtTime(1.0, time + 0.02);
                masterGain.gain.exponentialRampToValueAtTime(0.00001, time + duration + 0.05);
                masterGain.connect(ctx.destination);
                partials.forEach((partial, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();
                    osc.type = 'sine';
                    const detuneFactor = 1 + ((idx === 0 ? 0 : (Math.random() - 0.5) * 0.002));
                    const freq = noteToFreq(item.note) * partial.ratio * detuneFactor;
                    osc.frequency.value = freq;
                    filter.type = 'bandpass';
                    filter.frequency.value = freq * 1.2;
                    filter.Q.value = 6;
                    gain.gain.setValueAtTime(0.00001, time);
                    gain.gain.linearRampToValueAtTime(partial.vol, time + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(masterGain);
                    osc.start(time);
                    osc.stop(time + duration);
                });
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playBellHigh() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const beatDuration = 0.1;
            const noteToFreq = NotificationSound.noteToFreq;
            const chimeNotes = [
                { beat: 0, note: 64 + 12 }, { beat: 2, note: 60 + 12 }, { beat: 4, note: 62 + 12 }, { beat: 6, note: 55 + 12 },
                { beat: 9, note: 55 + 12 }, { beat: 11, note: 62 + 12 }, { beat: 13, note: 64 + 12 }, { beat: 15, note: 60 + 12 }
            ];
            const startTime = ctx.currentTime + 0.03;
            chimeNotes.forEach(item => {
                const time = startTime + (item.beat * beatDuration);
                const duration = 4.2;
                const partials = [
                    { ratio: 1.0, vol: 0.45 },
                    { ratio: 2.99, vol: 0.11 },
                    { ratio: 4.01, vol: 0.07 },
                    { ratio: 5.4, vol: 0.03 }
                ];
                const masterGain = ctx.createGain();
                masterGain.gain.setValueAtTime(0, time);
                masterGain.gain.linearRampToValueAtTime(0.85, time + 0.015);
                masterGain.gain.exponentialRampToValueAtTime(0.00001, time + duration + 0.03);
                masterGain.connect(ctx.destination);
                partials.forEach((partial, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const filter = ctx.createBiquadFilter();
                    osc.type = 'sine';
                    const detuneFactor = 1 + ((idx === 0 ? 0 : (Math.random() - 0.5) * 0.0015));
                    const freq = noteToFreq(item.note) * partial.ratio * detuneFactor;
                    osc.frequency.value = freq;
                    filter.type = 'bandpass';
                    filter.frequency.value = freq * 1.4;
                    filter.Q.value = 7;
                    gain.gain.setValueAtTime(0.00001, time);
                    gain.gain.linearRampToValueAtTime(partial.vol, time + 0.015);
                    gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(masterGain);
                    osc.start(time);
                    osc.stop(time + duration);
                });
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playSoft() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const now = ctx.currentTime + 0.02;
            const freqs = [72, 76];
            freqs.forEach((n, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const time = now + i * 0.12;
                const duration = 0.28;
                osc.frequency.value = noteToFreq(n);
                gain.gain.setValueAtTime(0.00001, time);
                gain.gain.linearRampToValueAtTime(0.06, time + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 4000;
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

    static playLoud() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const t = ctx.currentTime + 0.02;
            const master = ctx.createGain();
            master.gain.setValueAtTime(0.0001, t);
            master.gain.exponentialRampToValueAtTime(1.5, t + 0.02);
            master.gain.exponentialRampToValueAtTime(0.00001, t + 0.8);
            master.connect(ctx.destination);

            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 220;
            g.gain.setValueAtTime(0.00001, t);
            g.gain.linearRampToValueAtTime(1.0, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.00001, t + 0.5);
            osc.connect(g);
            g.connect(master);
            osc.start(t);
            osc.stop(t + 0.6);

            const bufSize = 2 * ctx.sampleRate;
            const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.02));
            const src = ctx.createBufferSource();
            src.buffer = noiseBuf;
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(0.00001, t);
            ng.gain.linearRampToValueAtTime(0.6, t + 0.01);
            ng.gain.exponentialRampToValueAtTime(0.00001, t + 0.25);
            src.connect(ng);
            ng.connect(master);
            src.start(t);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playLoudHigh() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const t = ctx.currentTime + 0.02;
            const master = ctx.createGain();
            master.gain.setValueAtTime(0.0001, t);
            master.gain.exponentialRampToValueAtTime(1.2, t + 0.02);
            master.gain.exponentialRampToValueAtTime(0.00001, t + 0.7);
            master.connect(ctx.destination);

            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 660;
            g.gain.setValueAtTime(0.00001, t);
            g.gain.linearRampToValueAtTime(0.95, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.00001, t + 0.4);
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 600;
            hp.Q.value = 2;
            osc.connect(hp);
            hp.connect(g);
            g.connect(master);
            osc.start(t);
            osc.stop(t + 0.45);

            const bufSize = 2 * ctx.sampleRate;
            const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.03));
            }
            const src = ctx.createBufferSource();
            src.buffer = noiseBuf;
            const ng = ctx.createGain();
            ng.gain.setValueAtTime(0.00001, t);
            ng.gain.linearRampToValueAtTime(0.45, t + 0.01);
            ng.gain.exponentialRampToValueAtTime(0.00001, t + 0.2);
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 1400;
            bp.Q.value = 3;
            src.connect(bp);
            bp.connect(ng);
            ng.connect(master);
            src.start(t);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playIphone() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [79, 76, 72, 76];
            const start = ctx.currentTime + 0.02;
            seq.forEach((n, i) => {
                const t = start + i * 0.18;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);
                g.gain.setValueAtTime(0.00001, t);
                g.gain.linearRampToValueAtTime(0.6, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.00001, t + 0.22);
                const filt = ctx.createBiquadFilter();
                filt.type = 'bandpass';
                filt.frequency.value = noteToFreq(n) * 1.1;
                filt.Q.value = 8;
                osc.connect(filt);
                filt.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.26);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playAndroid() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const pattern = [76, 72, 76, 72];
            const start = ctx.currentTime + 0.02;
            pattern.forEach((n, i) => {
                const t = start + i * 0.14;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = noteToFreq(n);
                g.gain.setValueAtTime(0.00001, t);
                g.gain.linearRampToValueAtTime(0.35, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.00001, t + 0.18);
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 3500;
                osc.connect(lp);
                lp.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.18);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playMcd() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;
            const notes = [84, 88, 91];
            notes.forEach((n, i) => {
                const t = start + i * 0.08;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 440 * Math.pow(2, (n - 69) / 12) * (1 + i * 0.002);
                g.gain.setValueAtTime(0.00001, t);
                g.gain.linearRampToValueAtTime(0.18, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.00001, t + 0.28 + i * 0.05);
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 800;
                osc.connect(hp);
                hp.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.5 + i * 0.05);
            });
            const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.2));
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const g2 = ctx.createGain();
            g2.gain.setValueAtTime(0.00001, start);
            g2.gain.linearRampToValueAtTime(0.08, start + 0.02);
            g2.gain.exponentialRampToValueAtTime(0.00001, start + 0.22);
            src.connect(g2);
            g2.connect(ctx.destination);
            src.start(start + 0.06);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playDq() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [60, 64, 67, 72];
            const start = ctx.currentTime + 0.02;
            seq.forEach((n, i) => {
                const t = start + i * 0.18;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);
                g.gain.setValueAtTime(0.00001, t);
                g.gain.linearRampToValueAtTime(0.5, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.00001, t + 0.28);
                const filt = ctx.createBiquadFilter();
                filt.type = 'bandpass';
                filt.frequency.value = noteToFreq(n) * 1.05;
                filt.Q.value = 6;
                osc.connect(filt);
                filt.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.32);
            });
            const finalT = start + seq.length * 0.18;
            const glide = ctx.createOscillator();
            const gg = ctx.createGain();
            glide.type = 'sine';
            glide.frequency.setValueAtTime(noteToFreq(72), finalT);
            glide.frequency.exponentialRampToValueAtTime(noteToFreq(84), finalT + 0.18);
            gg.gain.setValueAtTime(0.00001, finalT);
            gg.gain.linearRampToValueAtTime(0.35, finalT + 0.02);
            gg.gain.exponentialRampToValueAtTime(0.00001, finalT + 0.36);
            glide.connect(gg);
            gg.connect(ctx.destination);
            glide.start(finalT);
            glide.stop(finalT + 0.36);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playMario() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [76, 79, 83];
            const start = ctx.currentTime + 0.02;
            seq.forEach((n, i) => {
                const t = start + i * 0.08;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = noteToFreq(n);
                g.gain.setValueAtTime(0.00001, t);
                g.gain.linearRampToValueAtTime(0.35, t + 0.006);
                g.gain.exponentialRampToValueAtTime(0.00001, t + 0.14);
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 600;
                osc.connect(hp);
                hp.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.16);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playPokemon() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [72, 76, 79];
            const start = ctx.currentTime + 0.02;
            seq.forEach((n, i) => {
                const t = start + i * 0.16;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);
                g.gain.setValueAtTime(0.00001, t);
                g.gain.linearRampToValueAtTime(0.55, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.00001, t + 0.26);
                const band = ctx.createBiquadFilter();
                band.type = 'bandpass';
                band.frequency.value = noteToFreq(n) * 1.1;
                band.Q.value = 9;
                osc.connect(band);
                band.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.28);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playDotapun() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [52, 55, 59];
            const start = ctx.currentTime + 0.02;
            seq.forEach((n, i) => {
                const t = start + i * 0.14;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.type = 'triangle';
                osc.frequency.value = noteToFreq(n);
                gain.gain.setValueAtTime(0.00001, t);
                gain.gain.linearRampToValueAtTime(0.28, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + 0.18);
                filter.type = 'lowpass';
                filter.frequency.value = 1200;
                filter.Q.value = 6;
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.24);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playMarimba() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [67, 71, 74, 79];
            const start = ctx.currentTime + 0.02;
            seq.forEach((n, i) => {
                const t = start + i * 0.12;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.type = 'triangle';
                osc.frequency.value = noteToFreq(n);
                gain.gain.setValueAtTime(0.00001, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + 0.36);
                filter.type = 'bandpass';
                filter.frequency.value = noteToFreq(n) * 1.05;
                filter.Q.value = 14;
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.38);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playRecommend1() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [72, 76, 79];
            const start = ctx.currentTime + 0.02;
            seq.forEach((n, i) => {
                const t = start + i * 0.14;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);
                gain.gain.setValueAtTime(0.00001, t);
                gain.gain.linearRampToValueAtTime(0.45, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + 0.26);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.28);
            });
            const sparkle = ctx.createOscillator();
            const sg = ctx.createGain();
            sparkle.type = 'triangle';
            sparkle.frequency.value = noteToFreq(84);
            const sparkleTime = start + 0.42;
            sg.gain.setValueAtTime(0.00001, sparkleTime);
            sg.gain.linearRampToValueAtTime(0.12, sparkleTime + 0.01);
            sg.gain.exponentialRampToValueAtTime(0.00001, sparkleTime + 0.2);
            sparkle.connect(sg);
            sg.connect(ctx.destination);
            sparkle.start(sparkleTime);
            sparkle.stop(sparkleTime + 0.22);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static playRecommend2() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [64, 67, 71];
            const start = ctx.currentTime + 0.02;
            seq.forEach((n, i) => {
                const t = start + i * 0.16;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);
                gain.gain.setValueAtTime(0.00001, t);
                gain.gain.linearRampToValueAtTime(0.28, t + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + 0.3);
                const filt = ctx.createBiquadFilter();
                filt.type = 'lowpass';
                filt.frequency.value = 3200;
                osc.connect(filt);
                filt.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.32);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    static play(profile = LocalStorageHelper.notificationSound || 'bell') {
        const map = {
            original: NotificationSound.playOriginal,
            'bell-high': NotificationSound.playBellHigh,
            soft: NotificationSound.playSoft,
            loud: NotificationSound.playLoud,
            'loud-high': NotificationSound.playLoudHigh,
            bright: NotificationSound.playIphone,
            pulse: NotificationSound.playAndroid,
            potato: NotificationSound.playMcd,
            coin: NotificationSound.playMario,
            levelup1: NotificationSound.playDq,
            levelup2: NotificationSound.playPokemon,
            slap: NotificationSound.playDotapun,
            marimba: NotificationSound.playMarimba,
            recommend1: NotificationSound.playRecommend1,
            recommend2: NotificationSound.playRecommend2,
            dotapun: NotificationSound.playDotapun,
            bell: NotificationSound.playBell
        };
        const fn = map[profile] || NotificationSound.playBell;
        return fn();
    }
}

function checkAndSendNotifications() {
    if (Notification.permission !== 'granted') return;

    const TODAY = DateHelper.today;
    const now = new Date();
    const currentStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    let isUpdated = false;

    tasks.forEach(task => {
        if (!shouldShowTask(task) || !task.startTime) return;
        if (task.notifiedDate === TODAY) return;
        if (task.history[TODAY]) return;

        const startNorm = DateHelper.normalizeTime(task.startTime);
        if (currentStr >= startNorm) {
            const groupName = task.group || "その他";
            const descText = task.description ? `\n${task.description}` : "";
            
            const notification = new Notification(`[${groupName}] タスクの時間です`, {
                body: `「${task.text}」が実施可能な時間になりました。${descText}`,
                icon: "https://calendar.google.com/calendar/images/favicon_v2014_3.ico"
            });

            notification.onclick = function(event) {
                event.preventDefault();
                const targetUrl = new URL('/done', window.location.href).href;
                window.open(targetUrl, '_blank');
            };

            NotificationSound.play();

            task.notifiedDate = TODAY;
            isUpdated = true;
        }
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
    table.innerHTML = `
        <thead>
            <tr>
                <th>グループ</th>
                <th>タスク</th>
                <th>時間</th>
                <th>日付</th>
                <th>ステータス</th>
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
        if (isTargetDay && !todayStatus && !timeCheck.valid && FilterManager.hideOutOfTime) return;

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
        return;
    }

    for (const groupName in groups) {
        groups[groupName].sort((a, b) => {
            const countA = Object.values(a.history || {}).filter(v => v === 'completed').length;
            const countB = Object.values(b.history || {}).filter(v => v === 'completed').length;
            return countB - countA;
        });

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
            
            const totalCompleted = Object.values(task.history || {}).filter(v => v === 'completed').length;

            const card = document.createElement('div');
            card.className = `card`;

            if (todayStatus) {
                card.setAttribute('data-done', 'true');
            } else if (!timeCheck.valid) {
                card.setAttribute('data-out-of-time', 'true');
            }

            let badgeHtml = `<span class="status-badge">未実施</span>`;
            let isLocked = false;
            if (todayStatus === 'completed') {
                badgeHtml = `<span class="status-badge status-completed">追加済み</span>`;
                isLocked = true;
            } else if (todayStatus === 'cancelled') {
                badgeHtml = `<span class="status-badge status-cancelled">キャンセル済</span>`;
                isLocked = true;
            } else if (!isTargetDay) {
                badgeHtml = `<span class="status-badge">対象日外</span>`;
                isLocked = true;
            }

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