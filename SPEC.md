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
- 表示モードが未保存の場合はテーブル表示を初期表示とし、保存済みのカード・テーブル表示指定は維持する。
- タスク、未完了タスクを見出しクリックでソートする。
- 対象日外、時間外、完了済み、キャンセル済み、未完了強制表示などのフィルターを適用する。
- タスクを完了、追加、追記、キャンセル、取り消し、削除する。
- タスクJSONの `promptAddMemo` が `true` のタスクは、追加前にメモ入力ダイアログを表示し、入力内容をカレンダー予定の説明へ追記する。キャンセル時は登録しない。
- 日跨ぎタスク、リマインド時間帯、一時タスクの対象日と未完了日を正しく判定する。
- タスクJSONの `displayEndDate` を実質的な有効期限として扱う。端末のローカル日付が指定日以上の場合、そのタスクは通常一覧・未完了一覧・通知の対象として存在しないものとする。指定日当日を含めて除外し、日跨ぎの前日分や未完了の強制表示、表示フィルター解除でも表示しない。
- `displayEndDate` より前は既存の曜日・日付・時刻・履歴の条件どおりに扱う。期限当日以降の予定は前日リマインダーの対象にもしない。未指定・`null`・空文字列の場合は有効期限を設けない。
- 期限切れは保存データの削除を意味しない。JSON、localStorage、Drive同期にタスク定義と期限・履歴を保持し、過去の実施ログは引き続き参照できる。
- 開いたまま日付が変わった場合も既存の毎分チェックで一覧を再描画し、期限切れタスクと前日の未完了集計キャッシュを表示対象から除外する。
- `specificDate` と `endDate` を持つローカル一時タスクは期間中に未完了扱いにせず、期間終了後に未処理なら1件だけ未完了表示する。
- タスク操作後は画面へ先に反映する。ローカルタスクの保存と、ログイン中の Drive 同期は画面反映を妨げない非同期処理で行う。
- 表示モードやフィルタを切り替える際、未完了日付の全件集計はタスク・履歴・基準日・当日が変わらない限り再利用する。変更があれば再計算し、Calendar 由来タスクの表示も更新する。
- 一覧で完了・追加・追記・キャンセルを押した直後、押した行は完了済み・キャンセル済みの非表示設定に従って即時に隠す。非表示設定が無効なら状態表示を更新して行を残す。通信中も押していないボタンを一律に操作不能にしない。
- 当該操作の保存・同期または Calendar 更新に失敗した場合は、後続の操作を巻き戻さない範囲でその日付の履歴を元に戻し、一覧を再表示する。Drive 同期が失敗した場合はローカル保存が成功済みでも履歴を復元する。
- 完了・キャンセル・取り消し操作は、押されたカードまたは表行の状態だけを即時更新する。変更世代の更新と古いセッションキャッシュの無効化により、操作開始前から進行中だったクラウド取得結果で画面を巻き戻さない。ローカル保存、Drive同期、一覧全体の再計算は最初の画面反映後に行う。
- 完了・追加・追記・キャンセル・取り消し操作の成功時は、押されたカードまたは表行を直接更新し、不要な一覧全体のDOM再構築を行わない。保存・同期失敗時の復元では一覧を再表示する。
- Google Calendar 由来タスクは Drive 保存対象外のため、完了・キャンセル・取り消し時に Drive 同期を行わない。
- 実施ログページで、保存済みの完了履歴を年別カレンダーとして表示する。日ごとの完了タスク数に応じて濃淡を付け、選択した日の完了・キャンセル履歴をタスク名、グループ、状態とともに表示する。キャンセル履歴は完了数に含めない。
- 実施ログページでは、年ごとの完了件数、完了した日数、最長連続完了日数を表示し、記録のある範囲で年を切り替えられる。
- 選択日の履歴項目からタスク別履歴画面を開き、年ごとの履歴グラフを表示する。日付セルを選択して、その日付のステータスを未実施・完了・キャンセルに変更できる。変更後も完了・キャンセルの状態を日別一覧へ反映する。
- 実施ログから変更した履歴は端末へ保存し、Google Drive 同期が有効でログイン中の場合は同期する。同期失敗時も端末の保存内容は維持し、画面に失敗を表示する。

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
- Google Calendar の誕生日予定（`eventType=birthday` またはタイトルに「誕生日」「birthday」を含む予定）はタスクとして表示しない。
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
- Calendar と Drive の再読み込みは互いの通信中でも操作できる。同じサービスへの重複要求は進行中の取得に集約し、全体取得と重なった場合も古い結果で別サービスの最新表示を消さない。
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
- 401 と認証理由（`authError`、`invalidCredentials`、`loginRequired`、`insufficientPermissions`）を含む403だけを再ログイン要求として扱う。それ以外の403ではトークンを破棄しない。

## 2.4 認証・キャッシュ・通知

- 同時に発生したアクセストークン取得要求は1件に集約する。
- サイレント更新はアプリ起動時、画面復帰時、フォーカス復帰時に必要な場合だけ行う。
- クラウドデータ（Drive / Calendar）は、別タブからの復帰（`visibilitychange` → `visible`）時と別アプリからの復帰（`focus`）時に再取得する。
- 表示フィルターや表示モードの切替は再描画のみで、通信を行わない。
- 画面復帰時の再取得・未同期変更のDrive同期は、起動時を含む直前の処理から3分経過するまで行わない。タブ復帰で `visibilitychange` と `focus` が同時に発火しても処理は1回に集約する。
- クラウド取得中もローカルタスクの表示を消さない。表示対象がまだない場合は一覧に読み込み中であることを表示する。
- クールダウン経過後の一覧画面復帰時、未同期ローカル変更があれば Drive 同期を優先する。ただし同期待ち・同期中の場合は重複して同期しない。
- 未同期変更がない場合は、3分以内のセッションキャッシュを利用する。Drive 同期成功時にもセッションキャッシュを更新し、操作後の画面遷移で再取得しない。
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
- UI操作（フィルター切替、表示モード切替、ソート）では通信しない。タスク操作時の通信は Drive 同期（3秒デバウンスで集約）と操作に必要な Calendar 更新のみとする。

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
- `promptAddMemo?: boolean | null`
- `specificDate?: string | null`
- `endDate?: string | null`
- `displayEndDate?: string | null`: `YYYY-MM-DD` 形式の有効期限。例: `"displayEndDate": "2026-10-20"` は10月19日まで有効、10月20日0時以降は一覧・通知から除外する。実施期間の終端である `endDate` とは独立して扱う。
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
- `done_page_activation_refresh_at_v1`

## 4.4 主要API

- Calendar: calendarList取得、events取得、events追加、events PATCH。
- Drive: backupファイル検索、本文取得、multipart作成・更新、webViewLink取得。
- `TaskRepository.refreshFromCloudIfNeeded()` は更新対象として `all`、`drive`、`calendar` を扱う。

# 5. 画面・UIフロー

## 5.1 一覧画面

1. localStorageのタスクを先に表示する。クラウド取得中もローカル表示を維持し、タスク未取得の場合は読み込み中と表示する。表示モードの保存値がなければテーブル表示にする。
2. 必要に応じてDriveとTODO Calendarを取得する。
3. 取得中は対象サービスのステータスだけを更新し、他サービスの再読み込みボタンは操作可能にする。
4. `promptAddMemo` が有効なタスクの追加では、先にメモ入力ダイアログを表示する。キャンセル時は履歴を変更せず、登録確定後にカレンダー登録を行い、入力したメモを予定の説明へ追加する。
5. 完了・追加・追記・キャンセル操作後、非表示設定に従って対象行を即時に隠すか状態を更新する。他のボタンは通信待ちで無効化しない。
6. ローカル保存とDrive同期を後追いで行い、当該操作が失敗した場合は履歴と行表示を戻す。
7. TODO Calendarステータスのテキストを押すとCalendarだけを再取得する。
8. Driveステータスのテキストを押すとDriveだけを再取得する。

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
5. 新規タスクのJSON雛形に `displayEndDate: ""` を含める。有効期限を設定する場合は `YYYY-MM-DD` 形式で入力する。既存タスクの読み込み・編集・出力でも項目を保持する。

## 5.4 実施ログ

1. ヘッダーの「実施ログ」から年別の完了カレンダーを開く。
2. `done_tasks` に保存された各タスクの `history` から `completed` の日付だけを集計する。`cancelled` は実績に含めない。
3. 日付セルの濃淡で完了タスク数を示し、選択した日付の完了・キャンセル履歴をタスク名、グループ、ステータスとともに左寄せで表示する。
4. 年別の完了件数、実施日数、最長連続日数を表示する。表示対象は端末に保存済みの履歴とし、削除済みタスクなど現存データに残らない履歴は対象外とする。
5. 選択日の履歴項目から「ステータスを変更」を開くと、対象タスクの年次履歴グラフとステータス編集欄を表示する。グラフの日付セルまたは日付入力で対象日を選び、未実施・完了・キャンセルを保存できる。
6. 保存はローカル履歴へ即時反映し、ログイン中は既存の Drive 同期経路を利用する。同期失敗時はローカル保存済みであることを表示する。
7. Googleログインから戻った場合はOAuthリダイレクトを処理し、ヘッダーのログイン状態とセッション維持を初期化する。

# 6. 未決定事項・今後の課題

- Drive保存直前の厳密な同時更新防止に `If-Match` を導入するか検討する。
- Drive同期は競合確認のため「本文GET + PATCH」の2リクエストを要する。競合確認をメタデータ（`version`）取得に置き換えて転送量を減らすかは未決定。
- DevTools からページへフォーカスが戻った場合も、3分経過していれば再取得が走る。
- Calendar APIの大量データ取得で必要になった場合、ページング処理をさらに細かく制御する。
- Google APIを含むE2Eテストを追加する。
- Drive と Calendar の両方を変更する操作で片方だけ成功した場合、復元後にクラウド側へ残った変更を自動補償する方法は未決定。
- Google Calendarの色ID定義が変更された場合は、完了・キャンセル・除外判定を再確認する。
