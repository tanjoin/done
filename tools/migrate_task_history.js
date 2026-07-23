const fs = require('fs');
const path = require('path');

const defaultTasksPath = path.join(__dirname, '../docs/tasks.json');
const defaultTaskAndHistoryPath = path.join(
  __dirname,
  '../task_settings_and_history.json',
);

function migrate() {
  try {
    // 1. マスターとなる tasks.json の読み込み
    if (!fs.existsSync(defaultTasksPath)) {
      console.error(
        `エラー: マスターファイルが見つかりません: ${defaultTasksPath}`,
      );
      return;
    }
    const defaultTasks = JSON.parse(fs.readFileSync(defaultTasksPath, 'utf8'));

    if (!Array.isArray(defaultTasks)) {
      console.error('エラー: tasks.json のデータ形式が配列ではありません。');
      return;
    }

    // 2. 既存の履歴・設定ファイルの読み込み（存在しない場合は空配列として扱う）
    let existingTasks = [];
    if (fs.existsSync(defaultTaskAndHistoryPath)) {
      try {
        const existingData = JSON.parse(
          fs.readFileSync(defaultTaskAndHistoryPath, 'utf8'),
        );
        if (Array.isArray(existingData)) {
          existingTasks = existingData;
        }
      } catch (e) {
        console.warn(
          '警告: 既存の履歴ファイルが壊れているか空です。新規作成として処理します。',
        );
      }
    }

    // 3. マージ処理: tasks.json を正とし、同じ id のタスクから履歴を引き継ぐ
    const migratedTasks = defaultTasks.map(defaultTask => {
      const existingTask = existingTasks.find(t => t.id === defaultTask.id);

      return {
        // tasks.json の最新のデフォルト値（時間、グループ、リンク等）を適用
        ...defaultTask,
        // 履歴オブジェクト（なければ空オブジェクト）
        history:
          existingTask && existingTask.history ? existingTask.history : {},
        // アプリ側で記録された通知日（なければ空文字）
        notifiedDate:
          existingTask && existingTask.notifiedDate
            ? existingTask.notifiedDate
            : '',
      };
    });

    // docs/tasks.json に存在しない既存タスク（actual_temp_* など）も保持する
    const defaultTaskIds = new Set(defaultTasks.map(task => task.id));
    const extraExistingTasks = existingTasks.filter(
      task => !defaultTaskIds.has(task.id),
    );
    const mergedTasks = [...migratedTasks, ...extraExistingTasks];

    // 既存 task_settings_and_history.json の id 並びを優先する
    const existingOrderMap = new Map(
      existingTasks.map((task, index) => [task.id, index]),
    );
    mergedTasks.sort((a, b) => {
      const aIndex = existingOrderMap.has(a.id)
        ? existingOrderMap.get(a.id)
        : Number.MAX_SAFE_INTEGER;
      const bIndex = existingOrderMap.has(b.id)
        ? existingOrderMap.get(b.id)
        : Number.MAX_SAFE_INTEGER;

      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      // 既存側にない新規 id 同士は task-<number> の数値順で安定化
      const extractTaskNumber = id => {
        const match = String(id).match(/^task-(\d+)$/);
        return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
      };
      return extractTaskNumber(a.id) - extractTaskNumber(b.id);
    });

    // 4. 移行データの保存 (インデント2スペースで整形保存、数値の省略・四捨五入なし)
    fs.writeFileSync(
      defaultTaskAndHistoryPath,
      JSON.stringify(mergedTasks, null, 2),
      'utf8',
    );
    console.log(
      `【成功】データを移行・反映しました。: ${defaultTaskAndHistoryPath}`,
    );
  } catch (error) {
    console.error('移行処理中にエラーが発生しました:', error);
  }
}

migrate();
