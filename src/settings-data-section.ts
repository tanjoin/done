import DoneTask from './done-task';
import TaskRepository from './task-repository';
import type {DoneTaskData} from './types';

export default class SettingsDataSection {
  static render(): string {
    return `
      <div class="data-box">
        <h3 class="group-title">データ管理</h3>
        <p class="setting-desc">
          タスク設定や履歴をJSONとしてエクスポート/インポートできます。
        </p>
        <div class="btn-group-wrap btn-group-vertical">
          <button id="exportJSONBtn" class="btn btn-cancel">データエクスポート</button>
          <button id="importJSONBtn" class="btn btn-cancel">データインポート</button>
          <button id="copyJSONBtn" class="btn btn-cancel">クリップボードへコピー</button>
          <button id="pasteJSONBtn" class="btn btn-cancel">クリップボードから読み込み</button>
          <button id="resetBtn" class="btn btn-action" style="background-color: #ef4444;">全て初期状態に戻す</button>
        </div>
        <input type="file" id="fileInput" accept=".json" />
      </div>
    `;
  }

  static setup(root: ParentNode, taskRepository: TaskRepository): void {
    const fileInput = root.querySelector('#fileInput') as HTMLInputElement | null;
    const exportBtn = root.querySelector('#exportJSONBtn') as HTMLButtonElement | null;
    const importBtn = root.querySelector('#importJSONBtn') as HTMLButtonElement | null;
    const copyBtn = root.querySelector('#copyJSONBtn') as HTMLButtonElement | null;
    const pasteBtn = root.querySelector('#pasteJSONBtn') as HTMLButtonElement | null;
    const resetBtn = root.querySelector('#resetBtn') as HTMLButtonElement | null;

    if (!fileInput || !exportBtn || !importBtn || !copyBtn || !pasteBtn || !resetBtn) {
      return;
    }

    exportBtn.addEventListener('click', () => {
      SettingsDataSection.exportJSON(taskRepository);
    });

    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', event => {
      SettingsDataSection.importJSONFromFile(event, taskRepository);
    });

    copyBtn.addEventListener('click', async () => {
      await SettingsDataSection.copyJSONToClipboard(taskRepository);
    });

    pasteBtn.addEventListener('click', async () => {
      await SettingsDataSection.importJSONFromClipboard(taskRepository);
    });

    resetBtn.addEventListener('click', async () => {
      await SettingsDataSection.resetToDefault(taskRepository);
    });
  }

  private static updateTasksFromRawArray(
    rawTasks: unknown,
    taskRepository: TaskRepository,
  ): boolean {
    if (!Array.isArray(rawTasks)) {
      return false;
    }
    const tasks = (rawTasks as DoneTaskData[]).map(task => new DoneTask(task));
    taskRepository.tasks = tasks;
    taskRepository.saveTasks();
    return true;
  }

  private static importJSONFromFile(event: Event, taskRepository: TaskRepository): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = loadEvent => {
      try {
        const text = String(loadEvent.target?.result || '');
        const parsed = JSON.parse(text);
        if (!SettingsDataSection.updateTasksFromRawArray(parsed, taskRepository)) {
          alert('無効なJSONフォーマットです。');
          return;
        }
        alert('インポートが完了しました。');
      } catch {
        alert('JSONの解析に失敗しました。');
      }
    };
    reader.readAsText(file);
    target.value = '';
  }

  private static async importJSONFromClipboard(taskRepository: TaskRepository): Promise<void> {
    if (!navigator.clipboard || !window.isSecureContext) {
      alert('この環境ではクリップボード操作が利用できません。');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (!SettingsDataSection.updateTasksFromRawArray(parsed, taskRepository)) {
        alert('無効なJSONフォーマットです。');
        return;
      }
      alert('クリップボードからインポートしました。');
    } catch {
      alert('クリップボードの読み込みまたはJSON解析に失敗しました。');
    }
  }

  private static async copyJSONToClipboard(taskRepository: TaskRepository): Promise<void> {
    if (!navigator.clipboard || !window.isSecureContext) {
      alert('この環境ではクリップボード操作が利用できません。');
      return;
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(taskRepository.tasks, null, 2),
      );
      alert('JSONをクリップボードにコピーしました。');
    } catch {
      alert('クリップボードへのコピーに失敗しました。');
    }
  }

  private static exportJSON(taskRepository: TaskRepository): void {
    const data = JSON.stringify(taskRepository.tasks, null, 2);
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(data);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'task_settings_and_history.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  private static async resetToDefault(taskRepository: TaskRepository): Promise<void> {
    const ok = confirm(
      'すべてのカスタム設定と履歴を削除し、デフォルトのtasks.jsonから再読み込みしますか？',
    );
    if (!ok) {
      return;
    }

    try {
      await taskRepository.resetToDefault();
      alert('初期設定に戻しました。');
    } catch {
      alert('初期設定への復元に失敗しました。');
    }
  }
}
