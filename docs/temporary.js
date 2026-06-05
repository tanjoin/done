let tempHistory = [];

// 今日の日付を取得 (YYYY-MM-DD)
function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 初期起動
function initTemporaryPage() {
    // 実施日のデフォルトに今日を設定
    document.getElementById('date').value = getTodayString();

    // グループ名のサジェスト候補をセットアップ
    setupGroupSuggestions();

    // 過去の入力・追加履歴の読み込み
    const savedHistory = localStorage.getItem('calendar_temp_input_history');
    if (savedHistory) {
        try {
            tempHistory = JSON.parse(savedHistory);
        } catch (e) {
            tempHistory = [];
        }
    }
    renderHistory();

    // フォーム送信イベント
    document.getElementById('taskForm').addEventListener('submit', publishTemporaryTask);
}

// 既存のメインタスクからグループ名を抽出してサジェストにセット
function setupGroupSuggestions() {
    const datalist = document.getElementById('groupSuggestions');
    if (!datalist) return;
    datalist.innerHTML = '';

    const savedMainTasks = localStorage.getItem('calendar_tasks_v3');
    if (!savedMainTasks) return;

    try {
        const mainTasks = JSON.parse(savedMainTasks);
        if (Array.isArray(mainTasks)) {
            // 重複のないグループ名リストを作成
            const groups = new Set();
            mainTasks.forEach(t => {
                if (t.group && t.group.trim() !== '') {
                    groups.add(t.group.trim());
                }
            });

            // datalistにoptionとして追加
            groups.forEach(groupName => {
                const option = document.createElement('option');
                option.value = groupName;
                datalist.appendChild(option);
            });
        }
    } catch (e) {
        console.error('グループ名のサジェスト生成に失敗しました', e);
    }
}

// 本番のタスクリスト（calendar_tasks_v3）へ直接追加
function publishTemporaryTask(e) {
    e.preventDefault();

    const targetDate = document.getElementById('date').value;
    const groupVal = document.getElementById('group').value.trim();
    const textVal = document.getElementById('text').value.trim();
    const startVal = document.getElementById('startTime').value;
    const endVal = document.getElementById('endTime').value;
    const descVal = document.getElementById('description').value.trim();
    const linkVal = document.getElementById('link').value.trim();
    const strictVal = document.getElementById('strictMode').checked;

    // 1. 本番のメインタスクデータをロード
    let mainTasks = [];
    const savedMainTasks = localStorage.getItem('calendar_tasks_v3');
    if (savedMainTasks) {
        try {
            mainTasks = JSON.parse(savedMainTasks);
        } catch (e) {
            mainTasks = [];
        }
    }

    // 2. 本番用の一時的タスクオブジェクトを作成
    const newTaskInstance = {
        id: 'actual_temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        group: groupVal,
        text: textVal,
        startTime: startVal,
        endTime: endVal,
        description: descVal,
        link: linkVal,
        strictMode: strictVal,
        history: {},
        notifiedDate: "",
        specificDate: targetDate // app.jsがこの日付の時だけ画面に表示する
    };

    mainTasks.push(newTaskInstance);
    localStorage.setItem('calendar_tasks_v3', JSON.stringify(mainTasks));

    // 3. おまけの「入力履歴」にも保存して再利用できるようにする（重複はIDを分けて保持）
    const historyItem = {
        id: 'hist_' + Date.now(),
        group: groupVal,
        text: textVal,
        startTime: startVal,
        endTime: endVal,
        description: descVal,
        link: linkVal,
        strictMode: strictVal
    };
    
    // 最新のものが上に来るように先頭に追加
    tempHistory.unshift(historyItem);
    // 履歴が溢れすぎないよう直近20件までに制限
    if (tempHistory.length > 20) tempHistory.pop();
    
    localStorage.setItem('calendar_temp_input_history', JSON.stringify(tempHistory));

    alert(`「${targetDate}」のタスクリストに追加しました！`);
    
    // フォームをリセット（日付は維持）
    document.getElementById('group').value = '';
    document.getElementById('text').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('description').value = '';
    document.getElementById('link').value = '';
    document.getElementById('strictMode').checked = false;

    // 表示とサジェストの更新
    renderHistory();
    setupGroupSuggestions(); 
}

// 過去履歴からパラメータをフォームにコピー（再利用）
function copyTemplateToForm(id) {
    const item = tempHistory.find(t => t.id === id);
    if (!item) return;

    document.getElementById('group').value = item.group || '';
    document.getElementById('text').value = item.text || '';
    document.getElementById('startTime').value = item.startTime || '';
    document.getElementById('endTime').value = item.endTime || '';
    document.getElementById('description').value = item.description || '';
    document.getElementById('link').value = item.link || '';
    document.getElementById('strictMode').checked = item.strictMode || false;
    
    // 画面上部へスムーズにスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 履歴の削除
function deleteHistory(id, event) {
    event.stopPropagation(); // コピー処理の発火を防ぐ
    tempHistory = tempHistory.filter(t => t.id !== id);
    localStorage.setItem('calendar_temp_input_history', JSON.stringify(tempHistory));
    renderHistory();
}

// 履歴一覧の描画
function renderHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    container.innerHTML = '';

    if (tempHistory.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">過去に追加したタスク履歴はありません。</p>';
        return;
    }

    tempHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';

        const timeStr = (item.startTime || item.endTime) ? ` (${item.startTime || '00:00'}〜${item.endTime || '23:59'})` : '';
        const groupStr = item.group ? `[${item.group}] ` : '';

        div.innerHTML = `
            <div class="history-info">
                <strong>${groupStr}${item.text}</strong>${timeStr}
                ${item.description ? `<br><small style="color:#666">${item.description}</small>` : ''}
            </div>
            <div>
                <button class="btn-reuse" onclick="copyTemplateToForm('${item.id}')">再利用</button>
                <button class="btn-delete" onclick="deleteHistory('${item.id}', event)">削除</button>
            </div>
        `;
        container.appendChild(div);
    });
}

initTemporaryPage();