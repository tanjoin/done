# 1. 概要 / 目的

done は、日次タスク管理と Google Calendar / Google Drive 連携を行うブラウザアプリである。

目的は以下のとおり。
- タスクの実施状況を日付付き履歴で管理する。
- Google Calendar の TODO 予定をタスクとして表示し、完了・キャンセルを予定へ反映する。
- ローカルタスクを Google Drive の同期ファイルへ保存する。
- オフラインや Google API 障害時もローカル運用を継続する。

# 2. 機能要件 (できること、入力、出力)

## 2.1 タスク表示・操作

できること
- カード表示とテーブル表示を切り替える。
- タスク、未完了タスクを見出しクリックでソートする。
- 対象日外、時間外、完了済み、キャンセル済み、未完了強制表示などのフィルターを適用する。
- タスクを完了、追加、追記、キャンセル、取り消し、削除する。
- 日跨ぎタスク、リマインド時間帯、一時タスクの対象日と未完了日を正しく判定する。
- `specificDate` と `endDate` を持つローカル一時タスクは期間中に未完了扱いにせず、期間終了後に未処理なら1件だけ未完了表示する。
- タスク操作後は画面へ先に反映する。ローカルタスクの保存と、ログイン中の Drive 同期は画面反映を妨げない非同期処理で行う。
- 完了・キャンセル・取り消し操作は即座に変更世代とセッションキャッシュへ反映し、操作開始前から進行中だったクラウド取得結果で画面を巻き戻さない。
- Google Calendar 由来タスクは Drive 保存対象外のため、完了・キャンセル・取り消し時に Drive 同期を行わない。

主な入力
- タスク定義（曜日、日付、期間、時刻、履歴、通知設定）。
- 現在日時、表示設定、ユーザーの操作。

主な出力
- タスク一覧、状態表示、`history` の更新、localStorage の更新。
- 条件に応じた Google Calendar API / Google Drive API の通信。

## 2.2 Google Calendar 連携

できること
- OAuth Client ID でログイン・ログアウトする。
- TODO カレンダーを最大2件まで設定し、予定をタスクとして取得する。
- 複数カレンダーのイベント取得は並列に行う。
- Google Calendar API の `nextPageToken` を使い、イベントを全ページ取得する。
- 2件目のカレンダーで `colorId=7` のイベントを除外する設定を持つ。
- 2件目の期間予定を長期タスクとして扱う設定を持つ。単発予定は通常の未完了判定を行う。
- TODO 由来タスクの完了・キャンセルでイベント色を更新する（完了 `colorId=8`、キャンセル `colorId=4`）。
- DONE カレンダーへイベントを追加する。追加イベントの開始時刻と終了時刻は同一時刻とする。
- イベント説明の改行、URL、チェックリスト、location を表示し、チェックリスト変更をイベント説明へ反映する。

取得仕様
- 取得期間は未完了表示基準日から翌日末までとする。
- 各カレンダー取得失敗時は、認証失効を除き、成功したカレンダーの結果で表示を継続する。
- 取得件数が1ページの上限を超えた場合はページングする。

## 2.3 Google Drive 連携

できること
- Drive 同期の ON/OFF を設定する。
- `tanjoin_done_task_sync_backup_v1.json` を検索、読み込み、作成、更新する。
- Drive の読み込み・同期状態を一覧画面に表示する。
- ステータスのテキスト部分を押すと、対象サービスだけを再読み込みする。
- 連続したローカル操作は3000ms以内の最新状態へ集約し、Drive同期を直列化する。
- 複数端末の変更を検出した場合は、基準スナップショット・ローカル・Driveをマージする。

保存・競合仕様
- 通常同期では、Drive本文の `revision` とローカルの基準 `revision` を比較する。
- `version` 専用の取得リクエストは行わない。アップロード応答の `version` は互換情報として同期状態へ保持する。
- Drive本文取得時に `version` が空でも同期状態を有効として保持し、`revision` とファイルIDを競合判定に使用する。
- `forceOverwrite` 指定時は比較用のDrive本文を取得せず、ローカル内容を優先して保存する。
- TODO カレンダー由来タスクは Drive 保存対象から除外する。
- Drive ファイルが存在しない場合は、ローカルデータを継続利用する。

レート制限・認証
- HTTP 429 とレート制限系403（`rateLimitExceeded`、`userRateLimitExceeded`、`quotaExceeded`、`backendError` など）は自動再試行する。
- `Retry-After` を優先し、未指定時は指数バックオフを使用する。再試行は最大3回とする。
- 401 と認証系403は再ログイン要求として扱い、レート制限系403ではトークンを破棄しない。

## 2.4 認証・キャッシュ・通知

- 同時に発生したアクセストークン取得要求は1件に集約する。
- サイレント更新はアプリ起動時、画面復帰時、フォーカス復帰時に必要な場合だけ行う。
- 一覧の画面復帰時、未同期ローカル変更があれば Drive 同期を優先する。
- 未同期変更がない場合は、3分以内のセッションキャッシュを利用する。
- 通知済みのタスクは同じ通知日には再保存せず、毎分の不要な Drive 同期を防ぐ。
- Google未ログイン時は Calendar / Drive のステータスを表示しない。
- 認証失効時は自動ログイン画面を開かず、画面上の再ログイン通知を表示する。

# 3. 非機能要件 / 技術スタック

- TypeScript + Vite の完全フロントエンドアプリとする。
- Browser APIs（localStorage、sessionStorage、Fetch、Web Crypto、Notification）を使用する。
- Google Identity Services、Google Calendar API v3、Google Drive API v3を使用する。
- 認証情報は暗号化してlocalStorageへ保存する。
- Google APIのアクセストークンをログへ出力しない。
- Google API通信に失敗しても、可能な範囲でローカル表示を継続する。
- Google Calendar の複数取得、Driveの本文取得、対象別再読み込みにより不要な待機と通信を抑える。

# 4. データ構造 / API設計

## 4.1 DoneTaskData

- `id: string`
- `text: string`
- `description?: string | null`
- `location?: string | null`
- `link?: string | null`
- `group?: string`
- `daysOfWeek?: number[]`
- `daysOfMonth?: number[]`
- `startTime?: string | null`
- `endTime?: string | null`
- `history: Record<string, 'completed' | 'cancelled' | undefined>`
- `notifiedDate?: string | null`
- `remindMinutesBefore?: number | null`
- `skipCalendarOnComplete?: boolean | null`
- `strictMode?: boolean | null`
- `createTaskViaUrl?: boolean | null`
- `specificDate?: string | null`
- `endDate?: string | null`
- `sourceType?: 'local' | 'google-todo' | 'google-done'`
- `externalCalendarId?: string | null`
- `externalEventId?: string | null`
- `isSecondCalendarTodo?: boolean | null`
- `treatAsLongTermTask?: boolean | null`

## 4.2 Drive同期データ

```json
{
  "schemaVersion": 2,
  "revision": "UUID",
  "updatedAt": "ISO 8601",
  "tasks": []
}
```

同期状態は、基準 `revision`、Drive `version`、ファイルID、dirtyフラグ、基準タスクを保持する。競合判定の主キーは `revision` とし、本文取得時のDrive `version` は空文字を許容する。

## 4.3 主要なlocalStorageキー

- `done_tasks`
- `done_tasks_last_updated_at_v1`
- `done_google_access_token_v1`
- `done_google_access_token_expiry_v1`
- `done_google_client_id_enc_v1`
- `done_google_todo_calendar_id_enc_v1`
- `done_google_todo_calendar_ids_enc_v1`
- `done_google_done_calendar_id_enc_v1`
- `done_google_drive_sync_enabled_v1`
- `done_task_sync_state_v2`
- `done_cloud_tasks_cache_v1`
- `done_cloud_tasks_cache_at_v1`

## 4.4 主要API

- Calendar: calendarList取得、events取得、events追加、events PATCH。
- Drive: backupファイル検索、本文取得、multipart作成・更新、webViewLink取得。
- `TaskRepository.refreshFromCloudIfNeeded()` は更新対象として `all`、`drive`、`calendar` を扱う。

# 5. 画面・UIフロー

## 5.1 一覧画面

1. localStorageのタスクを先に表示する。
2. 必要に応じてDriveとTODO Calendarを取得する。
3. 取得中は対象サービスのステータスだけを更新する。
4. タスク操作後、ローカル保存とDrive同期を行う。
5. TODO Calendarステータスのテキストを押すとCalendarだけを再取得する。
6. Driveステータスのテキストを押すとDriveだけを再取得する。

## 5.2 設定画面

1. OAuth Client IDを入力する。
2. Google Calendar一覧を取得する。
3. TODO Calendarを最大2件、DONE Calendarを1件選択する。
4. Drive同期、表示、通知、テーマなどを設定する。
5. 設定保存後、一覧画面へ戻る場合はセッションキャッシュを優先する。

## 5.3 JSON Organizer

1. タスクJSONを編集する。
2. 配列形式またはDrive同期形式で読み込み・出力する。
3. 保存時はTODO Calendar由来タスクを除外する。
4. Drive同期ONかつログイン中は、明示的な全体保存でDriveへ反映する。

# 6. 未決定事項・今後の課題

- Drive保存直前の厳密な同時更新防止に `If-Match` を導入するか検討する。
- Calendar APIの大量データ取得で必要になった場合、ページング処理をさらに細かく制御する。
- Google APIを含むE2Eテストを追加する。
- Google Calendarの色ID定義が変更された場合は、完了・キャンセル・除外判定を再確認する。
