import Task from "./src/task.js";
import DateHelper from "./src/date_helper.js";
import TimeCheck from "./src/time_check.js";
import StatusInfo from "./src/status_info.js";
import ItemView from "./src/item_view.js";
import SortState from "./src/sort_state.js";
import LocalStorageHelper from "./src/local_storage_helper.js";
import TaskRepository from "./src/task_repository.js";
import SortManager from "./src/sort_manager.js";
import NotificationSound from "./src/notification_sound.js";
import TableManager from "./src/table_manager.js";
import FilterManager from "./src/filter_manager.js";
import SettingsView from "./src/settings_view.js";
 
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
                TaskRepository.tasks = savedTasks;
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

    const taskObject = new Task(task);
    const leadMinutes = taskObject.normalizeRemindMinutesBefore();
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
    const taskObject = new Task(task);

    for (const offset of dateOffsets) {
        const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12, 0, 0, 0);
        if (!taskObject.isTaskScheduledOnDate(scheduledDate)) continue;

        const candidate = buildReminderCandidate(task, scheduledDate);
        if (!candidate) continue;

        if (task.notifiedDate === candidate.scheduledDateKey) continue;
        if (task.history && task.history[candidate.scheduledDateKey]) continue;
        if (now < candidate.reminderAt) continue;

        return candidate;
    }

    return null;
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

// タイマー周期処理内で画面表示（renderCards）も更新するように拡張
function initNotificationTimer() {
    checkAndSendNotifications();
    setInterval(() => {
        checkAndSendNotifications();
        renderCards(); // 1分ごとに画面を自動再描画してステータスを同期
    }, 60000);
}

function checkAndSendNotifications() {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    let isUpdated = false;

    TaskRepository.tasks.forEach(task => {
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
        LocalStorageHelper.calendarTasksV3 = TaskRepository.tasks;
    }
}

// --- メイン描画 ---
function renderCards() {
    const container = document.getElementById('taskContainer');
    if (!container) return; 
    container.innerHTML = '';

    const TODAY = DateHelper.today;
    const YESTERDAY = DateHelper.yesterday;

    // ソート条件が設定されていれば、描画の直前にデータをソート
    if (SortState.column) {
        SortManager.sortTasks();
    }

    const filteredTasks = [];
    const targetDayMap = {};
    const groups = {};
    TaskRepository.tasks.forEach(task => {
        const taskObject = new Task(task);
        const isTargetDay = taskObject.shouldShowTask();
        targetDayMap[task.id] = isTargetDay;
        if (!isTargetDay && FilterManager.hideNonTargetDay) return;

        const todayStatus = task.history[TODAY];
        const timeCheck = taskObject.isWithinTime();

        if (todayStatus === 'completed' && FilterManager.hideCompleted) return;
        if (todayStatus === 'cancelled' && FilterManager.hideCancelled) return;
        if (isTargetDay && !todayStatus && !timeCheck.valid && FilterManager.hideOutOfTime && !taskObject.hasExplicitReminderLead()) return;

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
        TableManager.renderTableView(container, filteredTasks, TODAY, targetDayMap);
        // テーブルレンダリング後にヘッダーUIに現在のソート状態（矢印など）を反映
        SortManager.updateHeaderUI();
        return;
    }

    for (const groupName in groups) {
        // カードビューモードの場合は、従来どおり累計実績の多い順などでグループ内ソートを優先（ソート状態に左右されない元のロジックを担保）
        if (!SortState.column) {
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
            const taskIndex = TaskRepository.tasks.findIndex(t => t.id === task.id);
            const isTargetDay = targetDayMap[task.id] === true;
            const todayStatus = task.history[TODAY];
            const yesterdayStatus = task.history[YESTERDAY];
            const taskObject = new Task(task);
            const timeCheck = taskObject.isWithinTime();
            const statusInfo = taskObject.getTaskStatusInfo(todayStatus, timeCheck, isTargetDay);
            
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
    TaskRepository.tasks[index].history[TODAY] = isCancel ? 'cancelled' : 'completed';
    LocalStorageHelper.calendarTasksV3 = TaskRepository.tasks;
    renderCards();

    const startTime = DateHelper.todayUTC;
    const endTime = startTime; 
    
    const groupName = TaskRepository.tasks[index].group || "その他";
    let displayTitle = `[${groupName}] ${TaskRepository.tasks[index].text}`;
    
    let details = ""; 
    if (TaskRepository.tasks[index].description) {
        details += `${TaskRepository.tasks[index].description}\n`;
    }
    if (TaskRepository.tasks[index].link) {
        details += `${TaskRepository.tasks[index].link}\n`;
    }

    if (isCancel) {
        displayTitle = `【未実施】[${groupName}] ${TaskRepository.tasks[index].text}`;
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
