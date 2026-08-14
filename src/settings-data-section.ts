import DoneTask from './done-task';
import TaskRepository from './task-repository';
import {createDriveTaskSyncPayload} from './google-drive-service';
import type {DoneTaskData, DoneTaskSyncPayload} from './types';

type JsonExportFormat = 'array' | 'drive';

export default class SettingsDataSection {
  private static excludeGoogleTodoTasks(tasks: DoneTaskData[]): DoneTaskData[] {
    return tasks.filter(task => task.sourceType !== 'google-todo');
  }

  static render(): string {
    return `
      <div class="data-box">
        <h3 class="group-title">データ管理</h3>
        <p class="setting-desc">
          タスク設定や履歴をJSONとしてエクスポート/インポートできます。
        </p>
        <div class="view-mode-switch" role="group" aria-label="JSON形式の切り替え">
          <span class="view-mode-label">JSON形式</span>
          <label class="switch-pill" for="jsonExportFormatToggle">
            <input type="checkbox" id="jsonExportFormatToggle" />
            <span class="switch-track">
              <span class="switch-text-left">配列</span>
              <span class="switch-text-right">Drive</span>
              <span class="switch-thumb"></span>
            </span>
          </label>
        </div>
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
    const fileInput = root.querySelector(
      '#fileInput',
    ) as HTMLInputElement | null;
    const exportBtn = root.querySelector(
      '#exportJSONBtn',
    ) as HTMLButtonElement | null;
    const formatToggle = root.querySelector(
      '#jsonExportFormatToggle',
    ) as HTMLInputElement | null;
    const importBtn = root.querySelector(
      '#importJSONBtn',
    ) as HTMLButtonElement | null;
    const copyBtn = root.querySelector(
      '#copyJSONBtn',
    ) as HTMLButtonElement | null;
    const pasteBtn = root.querySelector(
      '#pasteJSONBtn',
    ) as HTMLButtonElement | null;
    const resetBtn = root.querySelector(
      '#resetBtn',
    ) as HTMLButtonElement | null;

    if (
      !fileInput ||
      !exportBtn ||
      !formatToggle ||
      !importBtn ||
      !copyBtn ||
      !pasteBtn ||
      !resetBtn
    ) {
      return;
    }

    exportBtn.addEventListener('click', () => {
      SettingsDataSection.exportJSON(
        taskRepository,
        SettingsDataSection.getExportFormat(formatToggle),
      );
    });

    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', event => {
      SettingsDataSection.importJSONFromFile(event, taskRepository);
    });

    copyBtn.addEventListener('click', async () => {
      await SettingsDataSection.copyJSONToClipboard(
        taskRepository,
        SettingsDataSection.getExportFormat(formatToggle),
      );
    });

    pasteBtn.addEventListener('click', async () => {
      await SettingsDataSection.importJSONFromClipboard(taskRepository);
    });

    resetBtn.addEventListener('click', async () => {
      await SettingsDataSection.resetToDefault(taskRepository);
    });
  }

  private static getExportFormat(
    formatToggle: HTMLInputElement,
  ): JsonExportFormat {
    return formatToggle.checked ? 'drive' : 'array';
  }

  private static extractTasksFromJson(
    parsed: unknown,
  ): DoneTaskData[] | null {
    if (Array.isArray(parsed)) {
      return parsed as DoneTaskData[];
    }
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const payload = parsed as Partial<DoneTaskSyncPayload>;
    return Array.isArray(payload.tasks) ? payload.tasks : null;
  }

  private static async updateTasksFromJson(
    parsed: unknown,
    taskRepository: TaskRepository,
  ): Promise<boolean> {
    const rawTasks = SettingsDataSection.extractTasksFromJson(parsed);
    if (!rawTasks) {
      return false;
    }
    const tasks = SettingsDataSection.excludeGoogleTodoTasks(
      rawTasks as DoneTaskData[],
    ).map(task => new DoneTask(task));
    taskRepository.tasks = tasks;
    await taskRepository.saveTasksWithSync(true);
    return true;
  }

  private static importJSONFromFile(
    event: Event,
    taskRepository: TaskRepository,
  ): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async loadEvent => {
      try {
        const text = String(loadEvent.target?.result || '');
        const parsed = JSON.parse(text);
        if (
          !(await SettingsDataSection.updateTasksFromJson(
            parsed,
            taskRepository,
          ))
        ) {
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

  private static async importJSONFromClipboard(
    taskRepository: TaskRepository,
  ): Promise<void> {
    if (!navigator.clipboard || !window.isSecureContext) {
      alert('この環境ではクリップボード操作が利用できません。');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (
          !(await SettingsDataSection.updateTasksFromJson(
          parsed,
          taskRepository,
        ))
      ) {
        alert('無効なJSONフォーマットです。');
        return;
      }
      alert('クリップボードからインポートしました。');
    } catch {
      alert('クリップボードの読み込みまたはJSON解析に失敗しました。');
    }
  }

  private static async copyJSONToClipboard(
    taskRepository: TaskRepository,
    format: JsonExportFormat,
  ): Promise<void> {
    if (!navigator.clipboard || !window.isSecureContext) {
      alert('この環境ではクリップボード操作が利用できません。');
      return;
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          SettingsDataSection.createExportPayload(taskRepository, format),
          null,
          2,
        ),
      );
      alert('JSONをクリップボードにコピーしました。');
    } catch {
      alert('クリップボードへのコピーに失敗しました。');
    }
  }

  private static createExportPayload(
    taskRepository: TaskRepository,
    format: JsonExportFormat,
  ): DoneTaskData[] | DoneTaskSyncPayload {
    const exportTasks = SettingsDataSection.excludeGoogleTodoTasks(
      taskRepository.tasks,
    );
    if (format === 'array') {
      return exportTasks;
    }
    return createDriveTaskSyncPayload(exportTasks);
  }

  private static exportJSON(
    taskRepository: TaskRepository,
    format: JsonExportFormat,
  ): void {
    const data = JSON.stringify(
      SettingsDataSection.createExportPayload(taskRepository, format),
      null,
      2,
    );
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(data);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      format === 'drive'
        ? 'tanjoin_done_task_sync_backup_v1.json'
        : 'task_settings_and_history.json',
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  private static async resetToDefault(
    taskRepository: TaskRepository,
  ): Promise<void> {
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
