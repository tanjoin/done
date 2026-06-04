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
    // 1. テーマの復元
    const savedTheme = localStorage.getItem('calendar_app_theme') || 'system';
    applyTheme(savedTheme);

    // 2. タスクデータの読み込み（LocalStorage なければ 外部JSONから）
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

    // 3. 読み込み後の各ページ専用セットアップ
    setupPageSpecifics(savedTheme);

    // 4. プッシュ通知タイマーの始動（全ページ共通）
    initNotificationTimer();
}

// 外部JSONから初期データをフェッチ
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

// 各HTMLページ特有の処理分岐
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

// --- プッシュ通知ロジック（時間になったら通知する機能は維持） ---
function checkNotificationPermission() {
    const banner = document.getElementById('notificationBanner');
    if (!banner) return;

    if (Notification.permission === 'default') {
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

function requestPermission() {
    Notification.requestPermission().then(permission => {
        checkNotificationPermission();
        if (permission === 'granted') {
            alert('プッシュ通知が有効になりました！時間になるとお知らせします。');
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

        // すでに今日「完了」または「キャンセル」のアクション済みの場合は通知しない
        if (task.history[today]) return;

        if (currentStr >= task.startTime) {
            new Notification("タスクの時間です！", {
                body: `「${task.text}」が実施可能な時間になりました。(${task.startTime}〜)`,
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

// --- スケジュール表示条件判定 ---
function shouldShowTask(task) {
    const now = new Date();
    const currentDayOfWeek = now.getDay();  
    const currentDayOfMonth = now.getDate(); 

    const noWeekRestriction = !task.daysOfWeek || task.daysOfWeek.length === 0;
    const noMonthRestriction = !task.daysOfMonth || task.daysOfMonth.length === 0;
    if (noWeekRestriction && noMonthRestriction) return true;

    if (task.daysOfWeek && task.daysOfWeek.includes(currentDayOfWeek)) return true;
    if (task.daysOfMonth && task.daysOfMonth.includes(currentDayOfMonth)) return true;

    return false;
}

// --- メイン描画（index.html用） ---
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

            const card = document.createElement('div');
            card.className = `card`;

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
                timeInfoHtml = `<div class="time-restriction">⏰ ${task.startTime || '00:00'} 〜 ${task.endTime || '23:59'}</div>`;
            }

            const undoButtonHtml = todayStatus ? `<button class="btn-undo" onclick="undoTask(${taskIndex})">×</button>` : '';

            // 【変更点】ロック条件は「今日すでにアクション済みか否か」のみ。時間によるdisabledは完全撤廃。
            card.innerHTML = `
                ${undoButtonHtml}
                <div>
                    <h4 class="card-title">${task.text}</h4>
                    ${badgeHtml}
                    ${timeInfoHtml}
                    <div class="history-status">${yesterdayHtml}</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-action" ${isLocked ? 'disabled' : ''} onclick="executeTask(${taskIndex}, false)">追加</button>
                    <button class="btn btn-cancel" ${isLocked ? 'disabled' : ''} onclick="executeTask(${taskIndex}, true)">キャンセル</button>
                </div>
            `;
            grid.appendChild(card);
        });

        groupSection.appendChild(grid);
        container.appendChild(groupSection);
    }
}

// --- タスク実行（Googleカレンダー連携） ---
function executeTask(index, isCancel) {
    const today = getFormattedDate(0);
    tasks[index].history[today] = isCancel ? 'cancelled' : 'completed';
    localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
    renderCards();

    const now = new Date();
    const startTime = formatDateTimeUTC(now);
    const endTime = formatDateTimeUTC(new Date(now.getTime() + 60 * 60 * 1000));
    
    // 【変更点】カレンダーのタイトルにグループ名を埋め込む設定
    const groupName = tasks[index].group || "その他";
    let displayTitle = `[${groupName}] ${tasks[index].text}`;
    let details = "タスクログから自動生成されました。";
    
    if (isCancel) {
        displayTitle = `【未実施】[${groupName}] ${tasks[index].text}`;
        details = "※保存時に手動で「フラミンゴ」カラー（薄い赤）へ変更してください。";
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

// --- テーマ変更（settings.html用） ---
function handleThemeChange(theme) {
    applyTheme(theme);
    localStorage.setItem('calendar_app_theme', theme);
}

// --- データ管理（data.html用） ---
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
                alert('インポートが完了しました。タスク一覧ページでご確認ください。');
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

// 起動
initApp();