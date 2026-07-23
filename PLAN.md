## Plan: Googleカレンダー既存イベント取得と完了時グレー化

既存の `window.open(TEMPLATE URL)` 方式ではイベント取得・更新ができないため、Google OAuth + Calendar API を導入し、タスク完了時に対応イベントを検索して `colorId` を更新する。既存イベントとの対応はまず `summary + 日付 + calendarId` で検索し、将来の誤更新を防ぐため `extendedProperties.private` に `doneTaskId/dateKey` を保存する運用へ寄せる。

**Steps**
1. 現状把握と差し替え範囲確定: `src/index-calendar-event.ts` の URL 起動箇所を API 呼び出しへ置換する前提を確定し、呼び出し元 `src/index.ts` の完了処理経路を維持する。  
2. 認証基盤追加: Google Identity Services でアクセストークン取得・更新・サインアウトを扱う `src/google-auth-manager.ts`（新規）を追加。トークンスコープは `https://www.googleapis.com/auth/calendar.events`。  
3. Calendar API クライアント追加: `src/google-calendar-client.ts`（新規）で `events.list` / `events.patch` / `colors.get` を実装。グレー候補 `colorId` は `colors.get` で判定し、未取得時のフォールバックIDを持つ。  
4. タスクイベント同定ロジック実装: 完了時に対象イベントを取得する `findEventForTask(task, dateKey)` を実装。優先順は `extendedProperties.private.doneTaskId+dateKey` → `summary/date/day-range` の順。曖昧一致時は最新1件のみ更新し、複数候補は更新せずログ出力。  
5. 完了時フロー接続: `src/index.ts` の `executeTask` 内で `isCancel === false` のとき API 更新を実行。成功/失敗に応じてUI通知（トーストまたは既存メッセージ領域）を追加。キャンセル時は更新対象外。  
6. 設定画面拡張: `src/settings-calendar-section.ts` に OAuth 接続状態、接続/切断ボタン、対象カレンダーID入力を追加。必要な設定値（clientId, calendarId, auth state）を `src/local-storage-manager.ts` へ追加。  
7. HTMLエントリ更新: `index.html` と `settings.html` に Google Identity Services 読み込みを追加し、初期化順序を調整。  
8. 既存データ互換対応: 既存履歴/タスク構造は壊さず、必要なら `src/types.d.ts` に最小限の認証・同期型を追加。既存 `DoneTaskData` 互換は維持。  
9. 検証: ローカルで OAuth 接続→既存イベント取得→完了操作で色更新→再操作時の冪等性を手動確認し、`npm run compile` と `npm run build` を通す。

**Relevant files**
- `src/index-calendar-event.ts` — URL テンプレート方式から API 実行入口へ変更
- `src/index.ts` — 完了時の同期呼び出しと失敗時ハンドリング
- `/src/settings-calendar-section.ts` — OAuth接続UI・状態表示
- `src/local-storage-manager.ts` — カレンダー/OAuth関連の保存キー
- `src/types.d.ts` — 追加型（認証状態・同期結果）
- `index.html` — GISスクリプト導入
- `settings.html` — GISスクリプト導入
- `src/google-auth-manager.ts` — 新規: OAuthトークン管理
- `src/google-calendar-client.ts` — 新規: Calendar API 呼び出し

**Verification**
1. OAuth接続後、対象カレンダーの当日イベントを `events.list` で取得できることを開発者コンソールで確認。
2. 対応イベントが1件の状態でタスクを完了し、Googleカレンダー上で `colorId` がグレー系へ更新されることを確認。
3. 複数候補時に誤更新しない（更新スキップ＋警告）ことを確認。
4. 既存の完了/キャンセル/未完了救済表示に回帰がないことを確認。
5. `npm run compile` と `npm run build` が成功することを確認。

**Decisions**
- 実装対象は「Googleカレンダー側イベント色のグレー化」。
- まずは Google Calendar（OAuth）前提で実装。
- 既存イベント同定は厳しめにし、曖昧一致時は安全側（未更新）を優先。

**Further Considerations**
1. 色の厳密定義: Google標準のグレー系 `colorId` を `colors.get` で動的選定するか、固定 `colorId` を採用するか。
2. 同定精度: 将来的にはイベント作成時に必ず `extendedProperties.private` を埋め、検索をメタデータ主体に寄せる。