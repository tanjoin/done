let tasks = [];

// --- 日付ヘルパー関数 ---
function getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTimeUTC(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// --- テーマ適用 ---
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', theme);
    }
}

// --- アプリ初期起動 ---
async function initApp() {
    const savedTheme = localStorage.getItem('calendar_app_theme') || 'system';
    applyTheme(savedTheme);

    const savedTasks = localStorage.getItem('calendar_tasks_v3');
    if (savedTasks) {
        try {
            tasks = JSON.parse(savedTasks);
        } catch (e) {
            await loadDefaultTasksFromJSON();
        }
    } else {
        await loadDefaultTasksFromJSON();
    }

    setupPageSpecifics(savedTheme);
    initNotificationTimer();
}

async function loadDefaultTasksFromJSON() {
    try {
        const response = await fetch('tasks.json');
        if (!response.ok) throw new Error('Network error');
        tasks = await response.json();
        localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
    } catch (error) {
        console.error('デフォルトタスクJSONの読み込みに失敗しました:', error);
        tasks = [];
    }
}

function setupPageSpecifics(currentTheme) {
    if (document.getElementById('taskContainer')) {
        renderCards();
        checkNotificationPermission();
    }
    if (document.getElementById('themeForm')) {
        const radio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
        if (radio) radio.checked = true;
    }
}

// --- プッシュ通知 ---
function checkNotificationPermission() {
    const banner = document.getElementById('notificationBanner');
    if (!banner) return;
    banner.style.display = (Notification.permission === 'default') ? 'flex' : 'none';
}

function requestPermission() {
    Notification.requestPermission().then(permission => {
        checkNotificationPermission();
        if (permission === 'granted') {
            alert('プッシュ通知が有効になりました！');
        }
    });
}

function initNotificationTimer() {
    checkAndSendNotifications();
    setInterval(checkAndSendNotifications, 60000);
}

function checkAndSendNotifications() {
    if (Notification.permission !== 'granted') return;

    const today = getFormattedDate(0);
    const now = new Date();
    const currentStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    let isUpdated = false;

    tasks.forEach(task => {
        if (!shouldShowTask(task) || !task.startTime) return;
        if (task.notifiedDate === today) return;
        if (task.history[today]) return;

        if (currentStr >= task.startTime) {
            new Notification("タスクの時間です！", {
                body: `「${task.text}」が実施可能な時間になりました。`,
                icon: "https://calendar.google.com/calendar/images/favicon_v2014_3.ico"
            });
            task.notifiedDate = today;
            isUpdated = true;
        }
    });

    if (isUpdated) {
        localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
    }
}

// --- 【リファクタリング】特定の日付にタスクがスケジュールされているか判定 ---
function isTaskScheduledOnDate(task, date) {
    const currentDayOfWeek = date.getDay();  
    const currentDayOfMonth = date.getDate(); 

    const noWeekRestriction = !task.daysOfWeek || task.daysOfWeek.length === 0;
    const noMonthRestriction = !task.daysOfMonth || task.daysOfMonth.length === 0;
    if (noWeekRestriction && noMonthRestriction) return true;

    if (task.daysOfWeek && task.daysOfWeek.includes(currentDayOfWeek)) return true;
    if (task.daysOfMonth && task.daysOfMonth.includes(currentDayOfMonth)) return true;

    return false;
}

// 今日の表示判定（上記関数を流用）
function shouldShowTask(task) {
    return isTaskScheduledOnDate(task, new Date());
}

// 時間制限チェック
function isWithinTime(task) {
    if (!task.startTime && !task.endTime) return { valid: true, msg: "" };
    const now = new Date();
    const currentStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    
    if (task.startTime && currentStr < task.startTime) return { valid: false, msg: `時間外 (${task.startTime}から)` };
    if (task.endTime && currentStr > task.endTime) return { valid: false, msg: `時間外 (${task.endTime}まで)` };
    return { valid: true, msg: "" };
}

// --- 【ロジック刷新】スケジュール合致日ベースでの放置回数計算 ---
function calculateNeglectLevel(task, todayStr) {
    // 今日すでに完了またはキャンセルされている場合は、スルーではないので通常色(0)
    if (task.history[todayStr]) return 0;

    let missedCount = 0;
    const maxRetroDays = 30; // 過去30日前まで遡ってチェック

    for (let i = 1; i <= maxRetroDays; i++) {
        const testDate = new Date();
        testDate.setDate(testDate.getDate() - i);
        const checkStr = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;
        
        // その日がこのタスクの「実行すべきスケジュール日」だった場合のみ判定
        if (isTaskScheduledOnDate(task, testDate)) {
            const status = task.history[checkStr];
            
            if (status === 'completed' || status === 'cancelled') {
                // 直近のスケジュール日に「完了」または「キャンセル」のログがあれば、そこでサボり判定の遡りをストップ
                break;
            } else {
                // スケジュール日だったのに履歴にデータがない（＝スルーして放置された）
                missedCount++;
            }
        }
    }

    if (missedCount === 0) return 0;
    if (missedCount === 1) return 1; // 1回スルー（ほんのり赤）
    if (missedCount === 2) return 2; // 2回スルー（中くらいの赤）
    return 3; // 3回以上連続スルー（最大値の赤）
}

// --- メイン描画 ---
function renderCards() {
    const container = document.getElementById('taskContainer');
    if (!container) return;
    container.innerHTML = '';

    const today = getFormattedDate(0);
    const yesterday = getFormattedDate(-1);

    const groups = {};
    tasks.forEach(task => {
        if (!shouldShowTask(task)) return;
        const groupName = task.group || "その他";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(task);
    });

    if (Object.keys(groups).length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">今日スケジュールされているタスクはありません。</p>';
        return;
    }

    for (const groupName in groups) {
        // よく押されている順（completedの累計数が多い順）にグループ内ソート
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
            const todayStatus = task.history[today];
            const yesterdayStatus = task.history[yesterday];
            const timeCheck = isWithinTime(task);
            
            const totalCompleted = Object.values(task.history || {}).filter(v => v === 'completed').length;

            const card = document.createElement('div');
            card.className = `card`;
            
            // 刷新された放置度ロジックの適用
            const neglectLevel = calculateNeglectLevel(task, today);
            if (neglectLevel > 0) {
                card.setAttribute('data-neglect', neglectLevel);
            }

            let badgeHtml = `<span class="status-badge status-uncompleted">未実施</span>`;
            let isLocked = false;
            if (todayStatus === 'completed') {
                badgeHtml = `<span class="status-badge status-completed">追加済み</span>`;
                isLocked = true;
            } else if (todayStatus === 'cancelled') {
                badgeHtml = `<span class="status-badge status-cancelled">キャンセル済</span>`;
                isLocked = true;
            }

            let yesterdayHtml = "昨日: データなし";
            if (yesterdayStatus === 'completed') yesterdayHtml = "昨日: 🟢完了";
            if (yesterdayStatus === 'cancelled') yesterdayHtml = "昨日: 🔴キャンセル";

            let timeInfoHtml = "";
            if (task.startTime || task.endTime) {
                const modeLabel = task.strictMode ? " [厳格]" : " [通常]";
                timeInfoHtml = `<div class="time-restriction">⏰ ${task.startTime || '00:00'} 〜 ${task.endTime || '23:59'}${modeLabel}</div>`;
            }

            const undoButtonHtml = todayStatus ? `<button class="btn-undo" onclick="undoTask(${taskIndex})">×</button>` : '';

            let buttonDisabled = false;
            let actionButtonText = "追加";

            if (isLocked) {
                buttonDisabled = true;
            } else if (!timeCheck.valid) {
                if (task.strictMode) {
                    buttonDisabled = true;
                    actionButtonText = timeCheck.msg;
                } else {
                    buttonDisabled = false;
                    actionButtonText = `追加 (${timeCheck.msg})`;
                }
            }

            card.innerHTML = `
                ${undoButtonHtml}
                <div>
                    <h4 class="card-title">${task.text}</h4>
                    ${badgeHtml}
                    ${timeInfoHtml}
                    <div class="history-status">${yesterdayHtml}</div>
                    <div class="total-count">📊 累計完了: ${totalCompleted}回</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-action" ${buttonDisabled ? 'disabled' : ''} onclick="executeTask(${taskIndex}, false)">${actionButtonText}</button>
                    <button class="btn btn-cancel" ${isLocked ? 'disabled' : ''} onclick="executeTask(${taskIndex}, true)">キャンセル</button>
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
    const today = getFormattedDate(0);
    tasks[index].history[today] = isCancel ? 'cancelled' : 'completed';
    localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
    renderCards();

    const now = new Date();
    const startTime = formatDateTimeUTC(now);
    const endTime = formatDateTimeUTC(new Date(now.getTime() + 60 * 60 * 1000));
    
    const groupName = tasks[index].group || "その他";
    let displayTitle = `[${groupName}] ${tasks[index].text}`;
    let details = "タスクログから自動生成されました。";
    if (isCancel) {
        displayTitle = `【未実施】[${groupName}] ${tasks[index].text}`;
        details = "※保存時に手動で「フラミンゴ」カラーへ変更してください。";
    }
    
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    window.open(`${baseUrl}&text=${encodeURIComponent(displayTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}`, '_blank');
}

function undoTask(index) {
    const today = getFormattedDate(0);
    if (tasks[index].history[today]) {
        delete tasks[index].history[today];
        localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
        renderCards();
    }
}

// --- テーマ変更 ---
function handleThemeChange(theme) {
    applyTheme(theme);
    localStorage.setItem('calendar_app_theme', theme);
}

// --- データ管理 ---
function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `task_settings_and_history.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function triggerImport() { document.getElementById('fileInput').click(); }

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                tasks = importedData;
                localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
                alert('インポートが完了しました。');
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

async function resetToDefault() {
    if (confirm('すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？')) {
        localStorage.removeItem('calendar_tasks_v3');
        await loadDefaultTasksFromJSON();
        alert('初期設定に戻しました。');
        if (document.getElementById('taskContainer')) renderCards();
    }
}

initApp();
