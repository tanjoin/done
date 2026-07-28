# 1. 概要 / 目的

done は、日次タスクの実施管理をブラウザ上で完結させるフロントエンドアプリケーションである。
主目的は、当日タスクの実施漏れ防止、完了とキャンセルの履歴管理、前日以前の未完了タスクの可視化、通知とカレンダー起票補助である。

本仕様書は、これまでの会話で確定した要件と、現在の実装を突き合わせた現行仕様を定義する。

# 2. 機能要件 (できること、入力、出力)

## 2.1 タスク表示とステータス判定

入力
- タスク定義: 曜日指定、日付指定、期間指定、開始時刻、終了時刻、通知猶予、履歴
- 現在日時
- 表示フィルタ設定

出力
- カード表示またはテーブル表示
- 各タスクのステータスラベル

ステータス判定優先順
1. 追加済み: 当日履歴が completed
2. キャンセル済: 当日履歴が cancelled
3. 対象日外: 当日表示対象外
4. リマインダー: 通知猶予のアクティブ時間帯
5. 実施可能: 現在時刻が実行可能時間帯
6. 未実施: 実行終了時刻以降かつ未処理
7. 時間外: 上記以外

重要仕様
- 当日の開始前は未実施にしない
- 実行終了時刻以降は未実施に遷移する
- 日跨ぎ時間帯は翌日終了時刻を境界として判定する
- 未実施表示時の日付ラベルは「未完了日: YYYY-MM-DD」で統一し、カード表示とテーブル表示で同一ルールを適用する

## 2.2 タスク操作

入力
- ユーザー操作: 完了、キャンセル、取り消し、削除

出力
- 履歴更新
- 永続化更新
- 再描画

操作仕様
- 完了: 対象日の履歴を completed に設定
- キャンセル: 対象日の履歴を cancelled に設定
- 取り消し: 当日履歴のみ削除
- 削除: 日付指定タスクを確認ダイアログ後に削除
- strictMode が true の場合、時間外は完了操作を無効化

## 2.3 前日以前の未完了救済表示

入力
- 未完了表示基準日
- 未完了強制表示フラグ
- タスク履歴と対象日条件

出力
- 未完了日付きの未実施行またはカード

仕様
- 未完了強制表示が有効な場合、基準日から前日までを走査
- 抽出条件
  - 対象日である
  - その日付の履歴が未処理
  - その日付の実行ウィンドウが終了済み
- カード表示とテーブル表示の両方で表示

## 2.4 フィルタと表示モード

入力
- フィルタ切替
- 表示モード切替

出力
- 表示対象の再計算
- 再描画

フィルタ項目
- 該当日外 非表示
- 時間外 非表示
- 追加済み 非表示
- キャンセル済 非表示
- 未完了強制表示 有効または無効

フィルタ補足
- 時間外を表示する設定時は、当日に予定があるタスク（曜日指定、日付指定、期間指定、一時タスクを含む）を開始前でも表示対象に含める

表示モード
- card
- table

## 2.5 通知機能

入力
- 通知権限
- 開始時刻
- 通知猶予分

出力
- テスト通知
- タスク通知
- 通知音再生

仕様
- Notification API 非対応環境では通知 UI を非表示
- 権限が granted の場合のみ通知送信
- 通知対象は当日と翌日候補
- 通知済み日と履歴により重複通知を抑止

## 2.6 カレンダー連携

入力
- 完了操作
- カレンダー ID 設定

出力
- Google カレンダー作成画面を新規タブで起動

仕様
- URL テンプレート方式で起票
- カレンダー ID 設定がある場合は src パラメータに付与
- API 連携による既存イベント更新は未実装

## 2.7 一時タスク追加

入力
- 開始日、終了日
- 開始時刻、終了時刻
- 通知猶予、説明、リンク、グループ
- skipCalendarOnComplete、strictMode

出力
- タスク追加
- 入力履歴追加

仕様
- 終了日が開始日より前の場合は入力エラー
- 日付指定タスクで開始時刻がある場合、開始時刻（通知猶予がある場合は通知開始時刻）までは表示対象外
- 追加後に履歴更新、フォーム初期化、候補更新イベントを発火

## 2.8 設定とデータ管理

入力
- カレンダー ID
- テーマ
- 未完了表示基準日
- 通知音
- JSON 入出力操作

出力
- localStorage 永続化
- JSON エクスポートまたはインポート
- クリップボードコピーまたは読込
- 初期データ復元

## 2.9 JSON Organizer

入力
- タスク JSON

出力
- タスク単位反映
- 全体保存

仕様
- id、text、history を必須として検証
- 新規追加、削除、整形、単体反映、全体保存を提供

# 3. 非機能要件 / 技術スタック (使用言語、ライブラリ、制約事項など)

技術スタック
- TypeScript
- Vite
- ブラウザ標準 API

実行環境
- モダンブラウザ
- クリップボード機能は secure context 前提

永続化
- localStorage を一次ストレージとして使用
- 初期データは public/tasks.json から読込

テスト
- node:test を用いた単体テストを導入
- 時間帯ステータス判定の主要ケースを自動確認

制約事項
- サーバーサイド DB なし
- 認証機構なし
- カレンダー連携は URL 起票まで

# 4. データ構造 / API設計 (該当する場合)

## 4.1 DoneTaskData

- id: string
- text: string
- description: string | null
- link: string | null
- group: string
- daysOfWeek: number[]
- daysOfMonth: number[]
- startTime: string | null
- endTime: string | null
- history: Record<YYYY-MM-DD, completed | cancelled>
- notifiedDate: string | null
- remindMinutesBefore: number | null
- skipCalendarOnComplete: boolean | null
- strictMode: boolean | null
- specificDate: string | null
- endDate: string | null

## 4.2 localStorage キー

データ本体
- done_tasks
- calendar_tasks_v3 (旧キー。起動時に done_tasks へ移行)

表示系
- task_view_mode
- overdue_reference_date
- filter_hide_non_target_day
- filter_hide_out_of_time
- filter_hide_completed
- filter_hide_cancelled
- filter_force_show_overdue

設定系
- calendar_target_id
- notification_sound
- done_app_theme
- done_temporary_input_history

## 4.3 画面内イベント

- done-viewmodechange
- done-filterchange
- done-temporary-form-reset
- done-temporary-form-group-suggestions-update
- done-temporary-history-add
- done-temporary-history-render-history

# 5. 画面・UIフロー (該当する場合)

## 5.1 メイン画面

1. タスク読込
2. 表示対象判定とフィルタ適用
3. card または table で描画
4. 完了、キャンセル、取り消し、削除を反映
5. 必要時にカレンダー起票 URL を開く
6. 1 分ごとに通知判定と再描画を実施

## 5.2 一時タスク画面

1. フォーム入力
2. バリデーション
3. タスク追加
4. 履歴追加
5. フォームリセットと履歴再描画

## 5.3 設定画面

1. 保存済み設定を読込
2. 各セクションで変更
3. localStorage へ保存

## 5.4 JSON Organizer 画面

1. タスク読込
2. 編集対象選択
3. 整形と単体反映
4. 全体保存で確定

# 6. 未決定事項・今後の課題

- TaskRepository の読み込み時に DoneTaskData 配列を DoneTask 配列へ直接代入しており、型不整合が compile エラーとして残る
- カレンダー連携は URL 起票方式のため、既存イベント同定や更新は未実装
- 一部判定ロジックは日時依存が強く、境界条件のテストケースをさらに拡充する余地がある
- E2E テストは未整備で、画面操作レベルの自動回帰検証は未導入
