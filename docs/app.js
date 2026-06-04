let tasks = [];

// --- 1桁の時刻（6:00等）を比較・判定用に2桁（06:00）に正規化するヘルパー ---
function normalizeTime(timeStr) {
    if (!timeStr) return "";
    const parts = timeStr.split(':');
    if (parts.length !== 2) return timeStr;
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

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

// --- スケジュール合致判定 ---
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

function shouldShowTask(task) {
    const now = new Date();
    if (isTaskScheduledOnDate(task, now)) return true;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (isTaskScheduledOnDate(task, yesterday)) {
        if (task.startTime && task.endTime) {
            const startNorm = normalizeTime(task.startTime);
            const endNorm = normalizeTime(task.endTime);
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

        const startNorm = normalizeTime(task.startTime);
        if (currentStr >= startNorm) {
            const groupName = task.group || "その他";
            const descText = task.description ? `\n${task.description}` : "";
            
            new Notification(`[${groupName}] タスクの時間です`, {
                body: `「${task.text}」が実施可能な時間になりました。${descText}`,
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

function isWithinTime(task) {
    if (!task.startTime && !task.endTime) return { valid: true, msg: "" };
    
    const now = new Date();
    const currentStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    
    const start = normalizeTime(task.startTime || "00:00");
    const end = normalizeTime(task.endTime || "23:59");
    
    if (start <= end) {
        if (currentStr < start) return { valid: false, msg: `時間外 (${start}から)` };
        if (currentStr > end) return { valid: false, msg: `時間外 (${end}まで)` };
    } else {
        if (currentStr < start && currentStr > end) {
            return { valid: false, msg: `時間外 (${start}〜翌${end})` };
        }
    }
    return { valid: true, msg: "" };
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
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-size: 14px; margin-top: 40px;">今日スケジュールされているタスクはありません。</p>';
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
            const todayStatus = task.history[today];
            const yesterdayStatus = task.history[yesterday];
            const timeCheck = isWithinTime(task);
            
            const totalCompleted = Object.values(task.history || {}).filter(v => v === 'completed').length;

            const card = document.createElement('div');
            card.className = `card`;

            if (!todayStatus && !timeCheck.valid) {
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
            }

            let yesterdayHtml = "昨日: 履歴なし";
            if (yesterdayStatus === 'completed') yesterdayHtml = "昨日: 完了";
            if (yesterdayStatus === 'cancelled') yesterdayHtml = "昨日: キャンセル";

            let timeInfoHtml = "";
            if (task.startTime || task.endTime) {
                const startNorm = normalizeTime(task.startTime || "00:00");
                const endNorm = normalizeTime(task.endTime || "23:59");
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

            const undoButtonHtml = todayStatus ? `<button class="btn-undo" onclick="undoTask(${taskIndex})">✕</button>` : '';

            let buttonDisabled = false;
            const isStrict = task.strictMode === true || task.strictMode === 'true';
            
            if (isLocked) {
                buttonDisabled = true;
            } else if (!timeCheck.valid && isStrict) {
                buttonDisabled = true; 
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
                    <button class="btn btn-cancel" ${isLocked ? 'disabled' : ''} onclick="executeTask(${taskIndex}, true)">キャンセル</button>
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
    const today = getFormattedDate(0);
    tasks[index].history[today] = isCancel ? 'cancelled' : 'completed';
    localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
    renderCards();

    const now = new Date();
    const startTime = formatDateTimeUTC(now);
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