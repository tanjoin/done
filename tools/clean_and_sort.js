const fs = require('fs');
const path = require('path');

// ファイルパスの設定（tools/clean_and_sort.js から見た相対パス）
const inputFilePath = path.join(__dirname, '../task_settings_and_history.json');
const outputFilePath = path.join(__dirname, '../docs/tasks.json');

try {
  // 1. ファイルの読み込み
  if (!fs.existsSync(inputFilePath)) {
    console.error(`エラー: 入力ファイルが見つかりません。 ${inputFilePath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputFilePath, 'utf8');
  const tasks = JSON.parse(rawData);

  console.log(`元のタスク数: ${tasks.length} 件`);

  // 2. フィルタリングとデータ変換の処理
  const processedTasks = tasks
    .filter(task => {
      // idに "temp" が入っているものは除外
      return !task.id.includes('temp');
    })
    .map(task => {
      // history を空オブジェクト、notifiedDate を空文字にクリアして残りのデータを引き継ぐ
      return {
        ...task,
        history: {},
        notifiedDate: ""
      };
    });

  // 3. 数値順（task-〇〇の連番昇順）に並べ替え
  processedTasks.sort((a, b) => {
    // IDから数値部分を抽出する関数
    const getNumber = (id) => {
      const match = id.match(/^task-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const numA = getNumber(a.id);
    const numB = getNumber(b.id);

    return numA - numB;
  });

  // 出力先ディレクトリが存在しない場合は作成
  const outputDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 4. 新しいJSONファイルとして書き出し
  // インデントを2スペースにして整形保存
  fs.writeFileSync(outputFilePath, JSON.stringify(processedTasks, null, 2), 'utf8');

  console.log(`\n処理が完了しました！`);
  console.log(`除外後のタスク数: ${processedTasks.length} 件`);
  console.log(`保存先: ${outputFilePath}`);

} catch (error) {
  console.error('処理中にエラーが発生しました:', error);
}