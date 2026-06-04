// --- デフォルトのカスタムJSON構造オブジェクト ---
const defaultTasks = [
    {
        id: "task-1",
        text: "スクワット＆ストレッチ",
        group: "健康・ルーティン",
        daysOfWeek: [1, 2, 3, 4, 5], // 月〜金
        daysOfMonth: [],
        startTime: "06:00",
        endTime: "10:00",
        history: {} // フォーマット: {"YYYY-MM-DD": "completed" | "cancelled"}
    },
    {
        id: "task-2",
        text: "英語のリスニング",
        group: "自己啓発",
        daysOfWeek: [], // 空配列は制限なし（毎日）
        daysOfMonth: [1, 15], // 毎月 1日 と 15日
        startTime: "",
        endTime: "",
        history: {}
    },
    {
        id: "task-3",
        text: "部屋の掃除・ゴミ出し",
        group: "家事",
        daysOfWeek: [2, 5], // 火・金
        daysOfMonth: [],
        startTime: "06:00",
        endTime: "23:59",
        history: {}
    }
];

let tasks = [];

// --- 日付ヘルパー関数 ---
function getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Googleカレンダー用時刻フォーマット (UTC)
function formatDateTimeUTC(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// --- ページ（タブ）切り替え制御 ---
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`page-${pageId}`).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (pageId === 'main') renderCards(); // メインに戻った時は再描画（時間制限等の更新のため）
}

// --- テーマ変更（システム連携対応） ---
function changeTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('calendar_app_theme', theme);
}

// --- 初期化処理 ---
function initApp() {
    // テーマの復元
    const savedTheme = localStorage.getItem('calendar_app_theme') || 'system';
    changeTheme(savedTheme);
    const radio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    if (radio) radio.checked = true;

    // タスクデータの復元
    const savedTasks = localStorage.getItem('calendar_tasks_v2');
    if (savedTasks) {
        try { tasks = JSON.parse(savedTasks); } catch (e) { tasks = [...defaultTasks]; }
    } else {
        tasks = [...defaultTasks];
    }
    renderCards();
}

// --- 条件判定ロジック ---
function shouldShowTask(task) {
    const now = new Date();
    const currentDayOfWeek = now.getDay();  // 0:日 ~ 6:土
    const currentDayOfMonth = now.getDate(); // 1 ~ 31

    // 曜日・日 どちらも設定がなければ毎日表示
    const noWeekRestriction = !task.daysOfWeek || task.daysOfWeek.length === 0;
    const noMonthRestriction = !task.daysOfMonth || task.daysOfMonth.length === 0;
    if (noWeekRestriction && noMonthRestriction) return true;

    // 複数の曜日、または複数の日のいずれかに合致すれば表示
    if (task.daysOfWeek && task.daysOfWeek.includes(currentDayOfWeek)) return true;
    if (task.daysOfMonth && task.daysOfMonth.includes(currentDayOfMonth)) return true;

    return false;
}

function isWithinTime(task) {
    if (!task.startTime && !task.endTime) return { valid: true, msg: "" };
    
    const now = new Date();
    const currentStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    
    if (task.startTime && currentStr < task.startTime) {
        return { valid: false, msg: `時間外 (${task.startTime}から)` };
    }
    if (task.endTime && currentStr > task.endTime) {
        return { valid: false, msg: `時間外 (${task.endTime}まで)` };
    }
    return { valid: true, msg: "" };
}

// --- メイン描画処理 ---
function renderCards() {
    const container = document.getElementById('taskContainer');
    container.innerHTML = '';

    const today = getFormattedDate(0);
    const yesterday = getFormattedDate(-1);

    // 1. 表示対象のタスクを絞り込み、グループごとに分類
    const groups = {};
    tasks.forEach(task => {
        if (!shouldShowTask(task)) return; // 今日表示する対象外ならスキップ
        
        const groupName = task.group || "その他";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(task);
    });

    // 表示するタスクがない場合
    if (Object.keys(groups).length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">今日スケジュールされているタスクはありません。</p>';
        return;
    }

    // 2. グループごとにHTMLを生成
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
            const timeCheck = isWithinTime(task);

            const card = document.createElement('div');
            card.className = `card`;

            // 今日のステータスバッジとロック判定
            let badgeHtml = `<span class="status-badge status-uncompleted">未実施</span>`;
            let isLocked = false;
            if (todayStatus === 'completed') {
                badgeHtml = `<span class="status-badge status-completed">追加済み</span>`;
                isLocked = true;
            } else if (todayStatus === 'cancelled') {
                badgeHtml = `<span class="status-badge status-cancelled">キャンセル済</span>`;
                isLocked = true;
            }

            // 前日の達成状況
            let yesterdayHtml = "昨日: データなし";
            if (yesterdayStatus === 'completed') yesterdayHtml = "昨日: 🟢完了";
            if (yesterdayStatus === 'cancelled') yesterdayHtml = "昨日: 🔴キャンセル";

            // 時間制限テキスト
            let timeInfoHtml = "";
            if (task.startTime || task.endTime) {
                timeInfoHtml = `<div class="time-restriction">⏰ ${task.startTime || '00:00'} 〜 ${task.endTime || '23:59'}</div>`;
            }

            // 取り消しバツボタン（今日何かアクションを起こしている場合のみ表示）
            const undoButtonHtml = todayStatus 
                ? `<button class="btn-undo" title="今日のアクションを取り消す" onclick="undoTask(${taskIndex})">×</button>` 
                : '';

            // ボタンの無効化条件（今日実施済み、または時間外の場合）
            const buttonDisabled = isLocked || !timeCheck.valid;
            const actionButtonText = !isLocked && !timeCheck.valid ? timeCheck.msg : "追加";

            card.innerHTML = `
                ${undoButtonHtml}
                <div>
                    <h4 class="card-title">${task.text}</h4>
                    ${badgeHtml}
                    ${timeInfoHtml}
                    <div class="history-status">${yesterdayHtml}</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-action" ${buttonDisabled ? 'disabled' : ''} onclick="executeTask(${taskIndex}, false)">${actionButtonText}</button>
                    <button class="btn btn-cancel" ${buttonDisabled ? 'disabled' : ''} onclick="executeTask(${taskIndex}, true)">キャンセル</button>
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
    
    localStorage.setItem('calendar_tasks_v2', JSON.stringify(tasks));
    renderCards();

    // カレンダーURL生成
    const now = new Date();
    const startTime = formatDateTimeUTC(now);
    const endTime = formatDateTimeUTC(new Date(now.getTime() + 60 * 60 * 1000));
    
    let displayTitle = tasks[index].text;
    let details = "タスクログから自動生成されました。";
    
    if (isCancel) {
        displayTitle = `【未実施】${tasks[index].text}`;
        details = "※保存時に手動で「フラミンゴ」カラー（薄い赤）へ変更してください。";
    }
    
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const url = `${baseUrl}&text=${encodeURIComponent(displayTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}`;
    window.open(url, '_blank');
}

// --- アクションの取り消し（バツボタン） ---
function undoTask(index) {
    const today = getFormattedDate(0);
    if (tasks[index].history[today]) {
        delete tasks[index].history[today]; // 今日の履歴を削除
        localStorage.setItem('calendar_tasks_v2', JSON.stringify(tasks));
        renderCards();
    }
}

// --- JSONエクスポート ---
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

// --- JSONインポート ---
function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                tasks = importedData;
                localStorage.setItem('calendar_tasks_v2', JSON.stringify(tasks));
                renderCards();
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

// --- カスタムJSONの取り消し（初期化） ---
function resetToDefault() {
    if (confirm('すべてのカスタムタスク設定および実行履歴を削除し、初期状態（デフォルト）に戻しますか？')) {
        localStorage.removeItem('calendar_tasks_v2');
        tasks = JSON.parse(JSON.stringify(defaultTasks)); // ディープコピー
        renderCards();
        alert('デフォルト状態にリセットしました。');
    }
}

// アプリの起動
initApp();
