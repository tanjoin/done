# 1. 概要 / 目的

done は、日次タスク管理に Google カレンダー連携と Google ドライブ同期を組み合わせ、
ローカル運用とクラウド連携を両立させるブラウザアプリである。

目的は以下の 3 点。
- タスクの実施状況を日付付き履歴で管理する
- TODO カレンダー由来タスクをアプリ内で処理し、カレンダー側に結果を反映する
- タスク JSON を Drive に同期し、ログイン済み時の再利用性を高める

# 2. 機能要件 (できること、入力、出力)

## 2.1 タスク表示・判定

できること
- カード/テーブル表示の切替
- 表示モード切替時は再取得せず、保持済みタスクを再描画する
- フィルタ適用（対象日外、時間外、追加済み、キャンセル済み、未完了強制表示）
- TODO カレンダー表示 ON/OFF フィルター
- 未完了日ラベル表示（未完了日: YYYY-MM-DD）

入力
- タスク定義（曜日、日付、期間、開始終了時刻、履歴など）
- 現在日時
- 表示設定（未完了表示基準日、各種フィルタ）

出力
- 表示対象タスク
- ステータス（追加済み、キャンセル済、リマインダー、実施可能、未実施、対象日外、時間外）
- remindMinutesBefore が明示設定されているタスクは、リマインド時間帯（リマインド開始時刻〜タスク開始時刻）の間のみ時間外フィルタの対象外として表示し、リマインド時間帯より前は通常の時間外フィルタで非表示とする
- 日跨ぎタスク（startTime > endTime）の targetDay は、当日 startTime から翌日 endTime までの連続区間として扱う
- 日跨ぎタスクの未実施判定も上記 targetDay 区間を基準に行う
- 日跨ぎタスクで日を跨いだ後（00:00〜endTime）に完了/キャンセル操作した場合、history は当日ではなく開始日の日付キー（前日）へ記録する
- 日跨ぎ時間帯（例: 03:00-02:59）のタスクは、翌日 00:00-終了時刻帯に前日日付の history が存在する場合、当日開始時刻（例: 03:00）まで非表示にする
- 一時タスク（local の specificDate/endDate 指定）は単一タスクとして扱い、期間内は当日タスクとして表示して未完了にしない。endDate 経過後、期間内に完了またはキャンセル履歴がなければ、endDate を未完了日として1件だけ表示する

## 2.2 タスク操作

できること
- 完了
- 追加
- 追記
- キャンセル
- 取り消し
- 削除（特定日タスク）

入力
- ボタン操作
- タスク属性（skipCalendarOnComplete, createTaskViaUrl, sourceType）

出力
- history 更新
- localStorage 保存
- （条件に応じて）Google Calendar API 呼び出し、または URL 起票
- 完了済み/キャンセル済みのタスクは「未実施に戻す」操作で、対象日の history キーを削除して未実施状態へ戻せる

分岐ルール
- 完了: skipCalendarOnComplete が true、または TODO カレンダー由来タスク
- 追加: skipCalendarOnComplete が false かつ DONE カレンダー系タスク
- 追記: createTaskViaUrl が true かつ DONE カレンダー系タスク

ボタン色
- 完了: 青
- 追加: 緑
- 追記: 黄

## 2.3 Google カレンダー連携

できること
- OAuth Client ID を使って認証
- ログイン状態に応じてログイン/ログアウト操作
- ユーザー操作によるログインはポップアップを使わず、認証開始時に開いていたページをリダイレクト URI として同一タブで認証する
- iPhone のホーム画面アプリ（standalone）では、ポップアップが使えない場合にリダイレクト認証へ自動フォールバック
- カレンダー一覧取得
- TODO/DONE カレンダー選択
- TODO カレンダー予定をタスク化して取り込み
- TODO 由来タスクの完了/キャンセル時にイベント色を更新
- DONE カレンダーへイベント追加
- URL ベースの追記起票

入力
- OAuth 2.0 Client ID
- TODO カレンダー ID
- DONE カレンダー ID
- タスク操作（完了/追加/追記/キャンセル）

出力
- 認証トークン取得
- アクセストークンを保持し、期限前または期限切れ時に Google Identity Services のサイレントトークン取得（prompt: 'none'）で自動更新を試行する
- カレンダー一覧
- TODO カレンダー予定のタスク表示（表示設定の基準日 00:00 を start、翌日 23:59:59 を end）
- TODO 由来タスクの説明文は、改行とURLを保持したリッチテキストとして表示する
- TODO 由来タスク説明文の URL が Google リダイレクト形式（google.com/url?q=...）の場合は、実URLへ正規化して表示・遷移する
- TODO 由来タスク説明文に含まれる a タグは、href ではなくリンクテキストを表示して遷移できること
- TODO 由来タスクはカレンダー予定日（specificDate / endDate）を一覧表示に反映
- TODO 由来タスクはイベント時刻（start/end dateTime）をタスク時刻として反映し、実施可能/時間外判定に利用
- TODO 由来タスクは色IDを状態へ反映（グラファイト=colorId:8 は完了、フラミンゴ=colorId:4 はキャンセル）
- TODO イベント色更新（完了: グラファイト、キャンセル: フラミンゴ）
- TODO 由来タスクで、過去日付かつ完了/キャンセル状態のタスクは表示しない
- ただし開始日が過去でも終了日が当日以降の跨ぎ予定（specificDate/endDate の範囲内）は表示対象とする
- DONE カレンダーへのイベント追加
- DONE カレンダー追加時のイベント時刻は start/end 同一時刻で作成する

補足
- TODO 由来タスクのグループ名は「カレンダー」
- TODO 由来タスクの副操作は削除ではなくキャンセルを使用し、フラミンゴ色への更新で扱う
- カード表示時のみ、TODO 由来タスク説明文のチェックリスト記法（- [ ] / - [x]）をチェックボックス表示する
- 上記チェックボックスの操作は、対応する Google カレンダーイベント description を更新して反映する
- カード表示時のみ、TODO 由来タスクの location（住所やURL）を表示する
- TODO 由来タスクはローカル通知対象に含めない
- TODO カレンダーの読み込み状況（読込中/成功/失敗/キャッシュ利用）を一覧画面に控えめ表示する
- 上記の読み込み状況表示をクリックすると TODO カレンダーを再読込できる（表示スタイルは変更しない）
- Google Drive の読み込み/同期状況（読込中/成功/失敗/OFF）を一覧画面に控えめ表示する
- Google Drive の状況表示をクリックすると Google/Drive の再読込を実行する
- 画面リロード時はキャッシュを使わず、Google/Drive から再取得して最新化する
- Google 未ログイン時は TODO/Drive の各ステータス表示を出さない
- Google 認証が失効した場合は、TODO/Drive のステータス表示と操作時アラートで再ログインを促す
- Google 認証が失効した場合は、再ログイン画面を自動表示しない
- Google 認証が失効した場合は、OAuth Client ID が設定済みなら一覧画面上に再ログイン通知を表示し、ユーザー操作時のみ設定・データ管理画面へ遷移する
- Google 認証関連の通知は、ブラウザ標準ダイアログではなく全画面（一覧 / 設定 / JSON整理）の Web 画面上部に alert 形式（Bootstrap 風）で表示する
- 再ログイン通知は一覧画面上部の alert として 1 件だけ表示し、ユーザーが閉じるまで維持する。閉じた後は同じ画面内で再表示しない
- OAuth Client ID が未設定の場合は、認証切れによる自動遷移を行わない
- SessionManager は 1 分ごとの定期タイマーを使用せず、アプリ起動時・画面再表示時（visibilitychange）・フォーカス復帰時のみ、期限前または期限切れ時のサイレント更新を試行する
- タスク一覧画面では、ページの表示復帰時（visibilitychange / focus）に Google ログイン状態の確認完了後、Drive と TODO カレンダーを強制再取得して表示を最新化する
- サイレント更新では Google Identity Services の prompt: 'none' を使用し、アカウント選択画面やログイン画面を自動表示しない
- 期限前のサイレント更新が失敗しても、既存アクセストークンが未期限切れならトークンを保持し、期限切れまでは継続利用する
- サイレント更新がログイン状態・同意状態の失効で失敗した場合は、一覧画面上部に再ログイン通知を表示する
- 認証失効を検知した後は、自動のトークン取得を停止し、ユーザーが設定画面のログイン操作を行うまで認証ダイアログを表示しない
- 同時に発生したトークン取得要求は 1 件に集約し、Google Identity Services の認証ダイアログが重複して起動しないようにする
- OAuth Client ID 設定済みの場合、タスク一覧・設定・JSON整理の共通ヘッダーに Google ログイン状態を表示する控えめなボタンを置く。未ログイン時はログイン、ログイン済み時はログアウト操作を提供する
- ページの表示復帰時（visibilitychange / focus）に Google ログイン状態を確認し、共通ヘッダーのボタン表示を更新する

## 2.4 Google ドライブ連携

できること
- 同期 ON/OFF
- タスク JSON の Drive 保存
- ログイン済み時の自動読み込み（保存済みファイルがある場合）
- 既存インポート機能との共存（インポート後も同期対象）

入力
- Drive 同期 ON/OFF
- タスク更新操作

出力
- Drive 上の専用 JSON ファイル（tanjoin_done_task_sync_backup_v1.json）に保存
- 起動時の自動読み込み
- 同一タブ内の画面遷移時はセッションキャッシュを優先し、短時間での再取得を抑止する
- ユーザーによる一覧画面リロード時はキャッシュを使わず Google/Drive を再取得する
- 設定画面から一覧画面へ戻る遷移時はセッションキャッシュを優先利用する
- Drive 保存データは schemaVersion、revision、updatedAt、tasks を持つバージョン付きJSON形式とする
- Drive から読み込んだ revision・ファイルID・未同期変更の有無をローカルに同期状態として保持する
- 未同期のローカル変更がない場合は Drive のタスク一覧を正として localStorage を完全に置換する。空のタスク一覧も有効な Drive データとして採用する
- 未同期のローカル変更がある場合は、Drive 再読み込みでローカルタスクを上書きしない。TODO カレンダー由来タスクのみ最新化する
- Drive ファイルが存在しない場合のみ、ローカルデータを継続利用する

保存方針
- TODO カレンダー由来タスク（sourceType=google-todo）はローカル保存対象に含めない
- 完了・追加操作では localStorage 保存を即時実行し、Google Drive 同期も都度実行する
- 連続したタスク操作の Google Drive 同期は操作順に直列化し、各操作時点のスナップショットを保存する
- 通常同期は、ローカルが保持する基準 revision と Drive の最新 revision が一致する場合だけ実行する
- Drive 更新は ETag を使う条件付き書き込み（If-Match）とし、読み込み後に他端末で変更された場合は書き込みを拒否する
- revision または ETag の不一致を検出した場合は、基準スナップショット・ローカル・Drive の三者マージを実行する
- タスクIDが異なる追加、片側だけが変更したフィールド、history の異なる日付キーは自動マージする
- 同一タスクの同一フィールド、または同一 history 日付キーが両方で異なる内容に変更されている場合だけ、ローカルまたはDriveの採用をユーザーに確認する
- 自動マージまたは選択解消の後は、最新のDrive ETagを使って再同期する。再同期中に別変更を検出した場合は同期を停止する
- クラウド再読み込み中にタスク操作が行われた場合、操作より前に開始した読み込み結果でローカルの最新状態を上書きしない
- 再ログイン直後は、Google Drive に既存タスクデータがある場合、Drive の内容でローカルを完全に置換する。ログインまたは読み込みだけではDriveへ保存しない
- Googleログイン成功後は、Driveデータの置換、TODOカレンダーの再取得、一覧の再描画を順に実行する
- 既存の配列形式および旧 `{ updatedAt, tasks }` 形式は読み込み互換性を維持し、次回保存時に新形式へ移行する

## 2.5 設定とデータ管理

できること
- 設定・データ管理画面で Google 連携設定
- JSON エクスポート/インポート
- クリップボードコピー/読み込み
- 初期データ復元

入力
- 各入力フォーム
- JSON ファイル/クリップボード文字列

出力
- ローカル保存更新
- タスクデータ更新
- 設定画面表示時は平文フォールバック値を先に反映し、暗号化値の復号完了後に最新値で上書きする
- JSON エクスポート/コピー/JSON整理では TODO カレンダー由来タスクを除外する
- データ管理の JSON 出力形式は、配列形式と Drive 同期ファイルと同じ `{ schemaVersion, revision, updatedAt, tasks }` 形式をスイッチで切り替える。エクスポートとクリップボードコピーは各1つのボタンで、選択中の形式を出力する
- データ管理の JSON インポートとクリップボード読み込みは、タスク配列形式と Drive 同期ファイル形式の両方を自動判別して受け付ける
- 設定・データ管理画面の JSON インポートは revision 比較を無視して同期を試行するが、ETag 条件付き書き込みは維持する
- JSON Organizer の done_tasks 全体保存は、Google Drive 同期ONかつログイン中ならDriveへ即時反映する

# 3. 非機能要件 / 技術スタック (使用言語、ライブラリ、制約事項など)

技術スタック
- TypeScript
- Vite
- Browser APIs（localStorage, Notification, Web Crypto, Fetch）
- Google Identity Services（OAuth トークン取得）
- Google Calendar API v3
- Google Drive API v3

制約事項
- サーバーサイドなし（完全フロントエンド）
- 認証情報は localStorage に暗号化保存（復号鍵も同一オリジン管理）
- Google API 利用には事前に OAuth Client ID 設定が必要
- リダイレクト認証を利用するため、Google Cloud Console の OAuth クライアントにはログイン操作を行える各ページの URL を承認済みのリダイレクト URI として登録する。承認済みの JavaScript 生成元にはパスを含めず、オリジンだけを登録する
- Google Identity Services のトークンモデルではリフレッシュトークンを扱わず、Google のログインセッションが有効な間はサイレントにアクセストークンを再取得する
- ネットワーク障害時はローカル運用を継続

性能要件（設定画面）
- Google 連携設定の読み込み時、複数の復号処理は並列実行する
- localStorage の平文フォールバック値（DONE カレンダー ID）は初期描画で即時反映する

# 4. データ構造 / API設計 (該当する場合)

## 4.1 DoneTaskData

- id: string
- text: string
- description?: string | null
- link?: string | null
- group?: string
- daysOfWeek?: number[]
- daysOfMonth?: number[]
- startTime?: string | null
- endTime?: string | null
- history: Record<YYYY-MM-DD, completed | cancelled>
- notifiedDate?: string | null
- remindMinutesBefore?: number | null
- skipCalendarOnComplete?: boolean | null
- strictMode?: boolean | null
- createTaskViaUrl?: boolean | null
- specificDate?: string | null
- endDate?: string | null
- sourceType?: local | google-todo | google-done
- externalCalendarId?: string | null
- externalEventId?: string | null

## 4.2 localStorage キー

- done_tasks
- done_tasks_last_updated_at_v1
- done_google_access_token_v1
- done_google_access_token_expiry_v1
- done_google_client_id_enc_v1
- done_google_todo_calendar_id_enc_v1
- done_google_done_calendar_id_enc_v1
- done_google_drive_sync_enabled_v1
- done_google_crypto_key_v1
- notification_sound
- done_app_theme
- overdue_reference_date
- filter_hide_non_target_day
- filter_hide_out_of_time
- filter_hide_completed
- filter_hide_cancelled
- filter_force_show_overdue
- done_task_sync_state_v2

## 4.3 Drive 同期 JSON

- schemaVersion: 2
- revision: UUID 形式のリビジョンID
- updatedAt: ISO 8601 形式の最終更新日時
- tasks: DoneTaskData[]
- データ管理の Drive 形式エクスポートは、この構造と同じ JSON を出力する

## 4.4 外部 API（利用概要）

- Google Calendar
  - calendarList 取得
  - events 取得（TODO）
  - events 追加（DONE）
  - events PATCH（TODO 色更新）
- Google Drive
  - files 検索
  - multipart アップロード（作成/更新）
  - alt=media 取得
  - ETag を使う条件付き更新
  - revision と基準スナップショットを使う三者マージ

# 5. 画面・UIフロー (該当する場合)

## 5.1 設定・データ管理画面

1. OAuth Client ID 入力
2. カレンダー一覧取得
3. TODO/DONE カレンダー選択
4. Drive 同期 ON/OFF 選択
5. 設定保存

## 5.2 メイン画面

1. タスク読込（ローカル + 条件付きで Drive + TODO カレンダー）
2. 読込中はローディングインジケーター（くるくる）を表示
3. フィルタ適用と描画
4. 各タスクで完了/追加/追記/キャンセルを実行
5. 操作後に保存（Drive 同期 ON 時は Drive へ反映）
6. Googleログイン成功時は Drive 統合・TODO再取得後に一覧を更新

モバイル表示要件
- テーブル表示は横スクロール可能とし、TODO カレンダー由来の長い日付表示でも操作ボタンが欠けないこと

## 5.3 JSON Organizer 画面

1. タスク選択と JSON 編集
2. 通常タスク/一時タスク追加
3. 単体反映または全体保存
4. 保存内容をメイン画面に反映
5. Google Drive 同期ONかつログイン中なら全体保存時に Drive へ同期

# 6. 未決定事項・今後の課題

- TODO/DONE イベント色の厳密な colorId 定義は運用で再確認が必要
- OAuth トークン期限切れ時の UX（再認証導線）を改善余地あり
- Google のログインセッションまたは認可状態が失効した場合、共通ヘッダーのログイン導線を利用する
- カレンダー一覧取得や同期失敗時のリトライ UI は最小実装
- 削除と編集が同時に発生した競合では、タスク単位でローカルまたはDriveを選択する
- E2E テスト未整備（Google API モックを含む統合検証は今後追加）
