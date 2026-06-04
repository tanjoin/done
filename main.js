// デフォルトの予定（初期データ）
const defaultTasks = [
    { id: "task-1", text: "起床", lastExecuted: "", status: "" },
    { id: "task-2", text: "就寝", lastExecuted: "", status: "" },
    { id: "task-3", text: "[駅メモ]チェックイン", lastExecuted: "", status: "" },
    { id: "task-4", text: "[駅メモ]10回チェックイン", lastExecuted: "", status: "" },
    { id: "task-5", text: "[駅奪取]ログイン", lastExecuted: "", status: "" },
    { id: "task-6", text: "[スパロボDD]ログイン(0:00〜", lastExecuted: "", status: "" },
    { id: "task-7", text: "[スパロボDD]ログイン(6:00〜", lastExecuted: "", status: "" },
    { id: "task-8", text: "[スパロボDD]ログイン(14:00〜", lastExecuted: "", status: "" },
    { id: "task-9", text: "[スパロボDD]ログイン(18:00〜23:59)", lastExecuted: "", status: "" },
    { id: "task-10", text: "[スパロボDD]デイリーミッション", lastExecuted: "", status: "" },
    { id: "task-11", text: "[楽天ヘルスケア]ログイン", lastExecuted: "", status: "" },
    { id: "task-12", text: "[楽天ヘルスケア]5000歩", lastExecuted: "", status: "" },
];

let tasks = [];

// 今日の日付を YYYY-MM-DD 形式で取得
function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Googleカレンダー用の日時フォーマット（UTC）に変換
function formatDateTimeUTC(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Googleカレンダーの登録URLを生成
function generateCalendarUrl(title, isCancel = false) {
    const now = new Date();
    const startTime = formatDateTimeUTC(now);
    // 予定の期間を1時間として設定
    const endTime = formatDateTimeUTC(new Date(now.getTime() + 60 * 60 * 1000));
    
    let displayTitle = title;
    let details = "タスクログアプリから自動生成されました。";
    
    if (isCancel) {
        displayTitle = `【未実施】${title}`;
        details = "※Googleカレンダーの仕様上、URLから直接色を指定できません。お手数ですが、保存時に手動で「フラミンゴ」カラー（薄い赤）へ変更してください。";
    }
    
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    return `${baseUrl}&text=${encodeURIComponent(displayTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}`;
}

// アプリケーションの初期化
function initApp() {
    const savedTasks = localStorage.getItem('calendar_tasks');
    if (savedTasks) {
        try {
            tasks = JSON.parse(savedTasks);
        } catch (e) {
            tasks = [...defaultTasks];
        }
    } else {
        tasks = [...defaultTasks];
    }
    renderCards();
}

// カードの描画
function renderCards() {
    const grid = document.getElementById('taskGrid');
    grid.innerHTML = '';
    const today = getTodayString();

    tasks.forEach((task, index) => {
        // 日付が変わっていたら（lastExecutedが今日でなければ）ロック状態をリセット
        const isExecutedToday = (task.lastExecuted === today);
        
        const card = document.createElement('div');
        card.className = `card ${isExecutedToday ? 'done' : ''}`;

        // ステータスバッジの決定
        let badgeHtml = `<span class="status-badge status-uncompleted">未実施</span>`;
        if (isExecutedToday) {
            if (task.status === 'cancelled') {
                badgeHtml = `<span class="status-badge status-cancelled">キャンセル済</span>`;
            } else {
                badgeHtml = `<span class="status-badge status-completed">追加済み</span>`;
            }
        }

        card.innerHTML = `
            <div>
                <h3 class="card-title">${task.text}</h3>
                ${badgeHtml}
            </div>
            <div class="card-actions">
                <button class="btn btn-action" ${isExecutedToday ? 'disabled' : ''} onclick="executeTask(${index}, false)">追加</button>
                <button class="btn btn-cancel" ${isExecutedToday ? 'disabled' : ''} onclick="executeTask(${index}, true)">キャンセル</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// タスクの実行（追加 or キャンセル）
function executeTask(index, isCancel) {
    const today = getTodayString();
    tasks[index].lastExecuted = today;
    tasks[index].status = isCancel ? 'cancelled' : 'completed';
    
    // 状態をLocalStorageに即時保存
    localStorage.setItem('calendar_tasks', JSON.stringify(tasks));
    
    // 再描画
    renderCards();

    // Googleカレンダーのページを別タブで開く
    const url = generateCalendarUrl(tasks[index].text, isCancel);
    window.open(url, '_blank');
}

// JSONエクスポート
function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `task_calendar_settings_${getTodayString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// インポートのトリガー
function triggerImport() {
    document.getElementById('fileInput').click();
}

// JSONインポート
function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                tasks = importedData;
                localStorage.setItem('calendar_tasks', JSON.stringify(tasks));
                renderCards();
                alert('インポートが完了しました。');
            } else {
                alert('無効なJSONフォーマットです。配列形式である必要があります。');
            }
        } catch (err) {
            alert('JSONの解析に失敗しました。ファイルを確認してください。');
        }
    };
    reader.readAsText(file);
    // 同じファイルを連続で選択できるようにリセット
    event.target.value = '';
}

function clearAllTasks() {
    if (confirm('全てのタスクを削除してもよろしいですか？この操作は元に戻せません。')) {
        localStorage.setItem('calendar_tasks', JSON.stringify(defaultTasks));
        renderCards();
    }
}

// 起動
initApp();
