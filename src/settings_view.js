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
                    LocalStorageHelper.calendarTasksV3 = TaskRepository.tasks;
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
            LocalStorageHelper.calendarTasksV3 = TaskRepository.tasks;
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

export default SettingsView;
