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

    const currentTheme = localStorage.getItem('calendar_app_theme') || 'system';
    setupPageSpecifics(currentTheme);

    // 通知UI（バナーおよび設定画面のステータス）の表示状態を更新
    updateNotificationUI();
}

async function loadDefaultTasksFromJSON() {
    try {
        const response = await fetch('tasks.json');
        tasks = await response.json();
        localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
    } catch (e) {
        console.error('Failed to load default tasks:', e);
        tasks = [];
    }
}

function handleThemeChange(theme) {
    localStorage.setItem('calendar_app_theme', theme);
    applyTheme(theme);
}

// --- ページ個別設定初期化 ---
function setupPageSpecifics(currentTheme) {
    // --- タスク一覧画面用の初期化 ---
    if (document.getElementById('taskContainer')) {
        const toggleFilterBtn = document.getElementById('toggleFilterBtn');
        const filterControls = document.getElementById('filterControls');
        const hideOutOfTimeCheckbox = document.getElementById('hideOutOfTimeCheckbox');
        const hideCompletedCheckbox = document.getElementById('hideCompletedCheckbox');
        const hideCancelledCheckbox = document.getElementById('hideCancelledCheckbox');

        // 1. フィルタースイッチ自体の開閉状態を復元・制御
        if (toggleFilterBtn && filterControls) {
            const isFilterPanelVisible = localStorage.getItem('filter_panel_visible') === 'true';
            
            if (isFilterPanelVisible) {
                filterControls.style.display = 'flex';
                toggleFilterBtn.innerText = 'フィルターを隠す ▲';
            } else {
                filterControls.style.display = 'none';
                toggleFilterBtn.innerText = 'フィルターを開く ▼';
            }

            toggleFilterBtn.onclick = () => {
                const isCurrentlyHidden = filterControls.style.display === 'none';
                if (isCurrentlyHidden) {
                    filterControls.style.display = 'flex';
                    toggleFilterBtn.innerText = 'フィルターを隠す ▲';
                    localStorage.setItem('filter_panel_visible', 'true');
                } else {
                    filterControls.style.display = 'none';
                    toggleFilterBtn.innerText = 'フィルターを開く ▼';
                    localStorage.setItem('filter_panel_visible', 'false');
                }
            };
        }

        // 2. 各フィルタースイッチのON/OFF状態の復元とイベント紐付け (安全な上書き方式)
        if (hideOutOfTimeCheckbox && hideCompletedCheckbox && hideCancelledCheckbox) {
            hideOutOfTimeCheckbox.checked = localStorage.getItem('filter_hide_out_of_time') === 'true';
            hideCompletedCheckbox.checked = localStorage.getItem('filter_hide_completed') === 'true';
            hideCancelledCheckbox.checked = localStorage.getItem('filter_hide_cancelled') === 'true';

            const handleFilterChange = () => {
                localStorage.setItem('filter_hide_out_of_time', hideOutOfTimeCheckbox.checked);
                localStorage.setItem('filter_hide_completed', hideCompletedCheckbox.checked);
                localStorage.setItem('filter_hide_cancelled', hideCancelledCheckbox.checked);
                renderCards();
            };

            hideOutOfTimeCheckbox.onchange = handleFilterChange;
            hideCompletedCheckbox.onchange = handleFilterChange;
            hideCancelledCheckbox.onchange = handleFilterChange;
        }

        // 3. 表示モード（グリッド / バックログ）の切り替えロジック
        const toggleViewModeBtn = document.getElementById('toggleViewModeBtn');
        if (toggleViewModeBtn) {
            const currentMode = localStorage.getItem('calendar_view_mode') || 'grid';
            toggleViewModeBtn.innerText = currentMode === 'grid' ? '表示: グリッド ⊞' : '表示: バックログ ＝';
            
            toggleViewModeBtn.onclick = () => {
                const mode = localStorage.getItem('calendar_view_mode') || 'grid';
                const nextMode = mode === 'grid' ? 'backlog' : 'grid';
                localStorage.setItem('calendar_view_mode', nextMode);
                toggleViewModeBtn.innerText = nextMode === 'grid' ? '表示: グリッド ⊞' : '表示: バックログ ＝';
                renderCards();
            };
        }

        renderCards();
    }
    
    // --- 設定画面用の初期化 ---
    if (document.getElementById('themeForm')) {
        const radio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
        if (radio) radio.checked = true;
    }
    
    const calendarIdForm = document.getElementById('calendarIdForm');
    const calendarIdInput = document.getElementById('calendarIdInput');
    const saveStatus = document.getElementById('saveStatus');

    if (calendarIdInput) {
        calendarIdInput.value = localStorage.getItem('calendar_target_id') || '';
    }

    if (calendarIdForm && calendarIdInput) {
        calendarIdForm.onsubmit = (e) => {
            e.preventDefault(); 
            const inputVal = calendarIdInput.value.trim();
            localStorage.setItem('calendar_target_id', inputVal);
            
            if (saveStatus) {
                saveStatus.style.display = 'inline';
                setTimeout(() => {
                    saveStatus.style.display = 'none';
                }, 3000);
            }
        };
    }
}

// --- 曜日・日にち判定ヘルパー ---
function shouldShowTask(task) {
    const d = new Date();
    const dayOfWeek = d.getDay(); 
    const dayOfMonth = d.getDate();

    if (task.daysOfWeek && task.daysOfWeek.length > 0) {
        if (!task.daysOfWeek.includes(dayOfWeek)) return false;
    }
    if (task.daysOfMonth && task.daysOfMonth.length > 0) {
        if (!task.daysOfMonth.includes(dayOfMonth)) return false;
    }
    return true;
}

// --- 時間内判定ヘルパー ---
function isWithinTime(task) {
    if (!task.startTime && !task.endTime) return { valid: true };

    const d = new Date();
    const currentMin = d.getHours() * 60 + d.getMinutes();

    let startMin = 0;
    if (task.startTime) {
        const parts = task.startTime.split(':');
        startMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    let endMin = 24 * 60 - 1;
    if (task.endTime) {
        const parts = task.endTime.split(':');
        endMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    if (startMin > endMin) {
        if (currentMin >= startMin || currentMin <= endMin) {
            return { valid: true };
        }
        return { valid: false };
    } else {
        if (currentMin >= startMin && currentMin <= endMin) {
            return { valid: true };
        }
        return { valid: false };
    }
}

// --- メイン描画関数 ---
function renderCards() {
    const container = document.getElementById('taskContainer');
    if (!container) return; 
    container.innerHTML = '';

    const today = getFormattedDate(0);
    const yesterday = getFormattedDate(-1);

    const hideOutOfTime = localStorage.getItem('filter_hide_out_of_time') === 'true';
    const hideCompleted = localStorage.getItem('filter_hide_completed') === 'true';
    const hideCancelled = localStorage.getItem('filter_hide_cancelled') === 'true';
    const viewMode = localStorage.getItem('calendar_view_mode') || 'grid';

    // 元の配列インデックスを保持したままグループへ分配
    const groups = {};
    tasks.forEach((task, globalIndex) => {
        if (!shouldShowTask(task)) return;

        const todayStatus = task.history ? task.history[today] : undefined;
        const timeCheck = isWithinTime(task);

        if (todayStatus === 'completed' && hideCompleted) return;
        if (todayStatus === 'cancelled' && hideCancelled) return;
        if (!todayStatus && !timeCheck.valid && hideOutOfTime) return;

        const groupName = task.group || "その他";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push({ task, index: globalIndex });
    });

    if (Object.keys(groups).length === 0) {
        container.innerHTML = '<p class="empty-task-msg">表示可能なタスクはありません（フィルターが適用されている可能性があります）。</p>';
        return;
    }

    for (const groupName in groups) {
        // ソート処理（完了回数順）
        groups[groupName].sort((a, b) => {
            const countA = Object.values(a.task.history || {}).filter(v => v === 'completed').length;
            const countB = Object.values(b.task.history || {}).filter(v => v === 'completed').length;
            return countB - countA;
        });

        const groupSection = document.createElement('div');
        groupSection.className = 'group-section';
        
        const title = document.createElement('h3');
        title.className = 'group-title';
        title.innerText = groupName;
        groupSection.appendChild(title);

        const listContainer = document.createElement('div');
        listContainer.className = viewMode === 'grid' ? 'grid' : 'backlog-list';

        groups[groupName].forEach(({ task, index }) => {
            const todayStatus = task.history ? task.history[today] : undefined;
            const yesterdayStatus = task.history ? task.history[yesterday] : undefined;
            const timeCheck = isWithinTime(task);
            
            const totalCompleted = Object.values(task.history || {}).filter(v => v === 'completed').length;
            const card = document.createElement('div');

            if (viewMode === 'grid') {
                // --- グリッド（カード）形式 ---
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

                const undoButtonHtml = todayStatus ? `<button class="btn-undo" onclick="undoTask(${index})">✕</button>` : '';

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
                        <button class="btn btn-action" ${buttonDisabled ? 'disabled' : ''} onclick="executeTask(${index}, false)">追加</button>
                        <button class="btn btn-cancel" ${isLocked ? 'disabled' : ''} onclick="executeTask(${index}, true)">キャンセル</button>
                    </div>
                    <div class="card-footer">
                        累計実績: ${totalCompleted} 回
                    </div>
                `;
            } else {
                // --- Backlog形式（一行リスト型） ---
                card.className = `backlog-item`;

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
                }

                let timeInfoHtml = "";
                if (task.startTime || task.endTime) {
                    const startNorm = normalizeTime(task.startTime || "00:00");
                    const endNorm = normalizeTime(task.endTime || "23:59");
                    const displayEnd = (startNorm > endNorm) ? `翌${task.endTime}` : task.endTime;
                    timeInfoHtml = `<span class="time-restriction" style="margin-right: 8px;">${task.startTime || '00:00'}〜${displayEnd || '23:59'}</span>`;
                }

                let buttonDisabled = false;
                const isStrict = task.strictMode === true || task.strictMode === 'true';
                
                if (isLocked) {
                    buttonDisabled = true;
                } else if (!timeCheck.valid && isStrict) {
                    buttonDisabled = true; 
                }

                const undoButtonHtml = todayStatus ? `<button class="btn-undo" onclick="undoTask(${index})" style="position: static; margin-left: 4px;">✕</button>` : '';

                let yesterdayHtml = "昨日: 履歴なし";
                if (yesterdayStatus === 'completed') yesterdayHtml = "昨日: 完了";
                if (yesterdayStatus === 'cancelled') yesterdayHtml = "昨日: キャンセル";

                let detailsHtml = "";
                if (task.description || task.link || yesterdayStatus || totalCompleted > 0) {
                    detailsHtml = `
                        <div class="backlog-details" style="font-size: 12px; color: var(--text-muted); margin-top: 4px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                            ${task.description ? `<span style="color: var(--text-secondary);">${task.description}</span>` : ''}
                            ${task.link ? `<a href="${task.link}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color); text-decoration: none;">リンク ↗</a>` : ''}
                            <span>${yesterdayHtml}</span>
                            <span>累計: ${totalCompleted}回</span>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            ${badgeHtml}
                            ${timeInfoHtml}
                            <h4 class="card-title" style="font-size: 15px; margin: 0; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${task.text}</h4>
                        </div>
                        ${detailsHtml}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                        <div class="card-actions" style="margin-top: 0; gap: 4px;">
                            <button class="btn btn-action" ${buttonDisabled ? 'disabled' : ''} onclick="executeTask(${index}, false)" style="padding: 6px 12px; font-size: 12px;">追加</button>
                            <button class="btn btn-cancel" ${isLocked ? 'disabled' : ''} onclick="executeTask(${index}, true)" style="padding: 6px 12px; font-size: 12px;">キャンセル</button>
                        </div>
                        ${undoButtonHtml}
                    </div>
                `;
            }

            listContainer.appendChild(card);
        });

        groupSection.appendChild(listContainer);
        container.appendChild(groupSection);
    }
}

// --- タスク追加・キャンセル操作 ---
function executeTask(index, isCancel) {
    const today = getFormattedDate(0);
    if (!tasks[index].history) {
        tasks[index].history = {};
    }

    if (isCancel) {
        tasks[index].history[today] = 'cancelled';
        localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
        renderCards();
    } else {
        tasks[index].history[today] = 'completed';
        localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
        renderCards();

        const task = tasks[index];
        const calendarId = localStorage.getItem('calendar_target_id') || 'primary';
        
        const now = new Date();
        const start = new Date(now);
        if (task.startTime) {
            const parts = task.startTime.split(':');
            start.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
        }
        const end = new Date(start);
        if (task.endTime) {
            const parts = task.endTime.split(':');
            end.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
            if (start > end) {
                end.setDate(end.getDate() + 1);
            }
        } else {
            end.setHours(end.getHours() + 1);
        }

        const text = encodeURIComponent(task.text);
        const dates = `${formatDateTimeUTC(start)}/${formatDateTimeUTC(end)}`;
        const details = encodeURIComponent(task.description || '');
        
        let calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
        if (calendarId && calendarId !== 'primary') {
            calUrl += `&src=${encodeURIComponent(calendarId)}`;
        }
        
        window.open(calUrl, '_blank');
    }
}

// --- 操作取り消し ---
function undoTask(index) {
    const today = getFormattedDate(0);
    if (tasks[index].history && tasks[index].history[today]) {
        delete tasks[index].history[today];
        localStorage.setItem('calendar_tasks_v3', JSON.stringify(tasks));
        renderCards();
    }
}

// --- データエクスポート ---
function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `task_settings_and_history.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function triggerImport() { 
    document.getElementById('fileInput').click(); 
}

// --- データインポート ---
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
                if (document.getElementById('taskContainer')) renderCards();
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

// --- 初期状態リセット ---
async function resetToDefault() {
    if (confirm('すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？')) {
        localStorage.removeItem('calendar_tasks_v3');
        await loadDefaultTasksFromJSON();
        alert('初期設定に戻しました。');
        if (document.getElementById('taskContainer')) renderCards();
    }
}

// =========================================================================
//   プッシュ通知制御 ＆ ステータス同期ロジック
// =========================================================================

/**
 * 通知関連のUI（トップページのバナーや設定画面のステータス）を統合管理する関数
 */
function updateNotificationUI() {
    const banner = document.getElementById('notificationBanner');
    const statusEl = document.getElementById('notificationStatus');
    const reqBtn = document.getElementById('requestPermissionBtn');
    const testBtn = document.getElementById('testNotificationBtn');

    // ブラウザが通知機能に対応していない場合
    if (!('Notification' in window)) {
        if (statusEl) statusEl.textContent = 'お使いのブラウザは通知に未対応です';
        if (banner) banner.style.display = 'none';
        if (reqBtn) reqBtn.style.display = 'none';
        return;
    }

    const permission = Notification.permission;

    // 1. トップページの通知有効化バナーの制御（未設定の場合のみ出す）
    if (banner) {
        banner.style.display = (permission === 'default') ? 'flex' : 'none';
    }

    // 2. 設定画面（settings.html）内の通知設定ステータス表示制御
    if (statusEl) {
        if (permission === 'granted') {
            statusEl.textContent = '許可済み ✔';
            statusEl.style.color = '#10b981'; // 鮮やかな緑
            if (reqBtn) reqBtn.style.display = 'none';
            if (testBtn) testBtn.style.display = 'inline-block';
        } else if (permission === 'denied') {
            statusEl.textContent = 'ブラウザ側でブロックされています ❌';
            statusEl.style.color = '#ef4444'; // 警告の赤
            if (reqBtn) {
                reqBtn.textContent = 'アドレスバーの鍵アイコン等から許可してください';
                reqBtn.disabled = true;
                reqBtn.style.display = 'inline-block';
            }
            if (testBtn) testBtn.style.display = 'none';
        } else {
            statusEl.textContent = '未設定（デフォルト）';
            statusEl.style.color = 'var(--text-secondary)';
            if (reqBtn) {
                reqBtn.textContent = '通知を有効にする';
                reqBtn.disabled = false;
                reqBtn.style.display = 'inline-block';
            }
            if (testBtn) testBtn.style.display = 'none';
        }
    }
}

/**
 * 通知権限を要求する関数（ボタンの onclick から呼び出される）
 */
function requestPermission() {
    if (!('Notification' in window)) return;

    Notification.requestPermission().then(permission => {
        updateNotificationUI();
        if (permission === 'granted') {
            sendTestNotification();
        }
    });
}

/**
 * 動作確認用のテスト通知を送信する関数
 */
function sendTestNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ルーティンカレンダー連携', {
            body: 'プッシュ通知は正常に機能しています！',
            tag: 'test-notification'
        });
    }
}

// アプリの起動イベント
document.addEventListener('DOMContentLoaded', initApp);