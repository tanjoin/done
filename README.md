# done

[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

## 開発

```bash
npm run dev
```

## 型チェック

```bash
npm run compile
```

## ビルド

```bash
npm run build
```

## 主要ディレクトリ

- `src/`: 画面ごとのクラス実装（`index.ts`, `json-organizer.ts`, `settings.ts`）
- `public/`: 静的配信ファイル（`tasks.json` など）
- `tools/`: ローカルサーバーや補助スクリプト

## Google連携の設定方法

Google カレンダーと Google Drive を使うには、Google Cloud Console で OAuth クライアントを作成します。

### 1. OAuth クライアントを作成する

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを選択する
2. 「API とサービス」から Google Calendar API と Google Drive API を有効にする
3. 「認証情報」で種類が「ウェブ アプリケーション」の OAuth 2.0 クライアントを作成する
4. OAuth 同意画面で利用する Google アカウントをテストユーザーまたは公開対象として設定する

### 2. URL を登録する

「承認済みの JavaScript 生成元」には、プロトコルとホストだけを登録します。パスや末尾の `/` は含めません。

```text
http://localhost:5173
```

「承認済みのリダイレクト URI」には、OAuth コールバック URL を 1 つだけ登録します。ログインを開始したページには認証成功後に自動で戻ります。

```text
http://localhost:5173/done/
```

公開環境では `localhost:5173` を実際のホスト名に置き換えます。例えば `https://example.com/done/` を登録します。

### 3. アプリへ設定する

1. 設定画面の「設定・データ管理」に OAuth 2.0 Client ID を入力する
2. 「Google にログイン」で認証する
3. 「カレンダー一覧を取得」で連携可能なカレンダーを読み込み、TODO/DONE を選択する
4. 必要なら「Google Drive 同期を有効にする」を ON にする
5. 「設定を保存する」で保存する

補足:
- `redirect_uri_mismatch` は、上記の OAuth コールバック URL が「承認済みのリダイレクト URI」に完全一致で登録されていない場合に発生します
- OAuth クライアントが複数ある場合は、アプリへ入力する Client ID と URL を登録したクライアントが同じであることを確認してください
- OAuth Client ID と選択したカレンダー ID は暗号化して localStorage に保存されます
- TODO カレンダーの取得は翌日分までを対象にします
- Google Drive 同期が ON の場合、タスク操作後に JSON が Drive の専用ファイル `tanjoin_done_task_sync_backup_v1.json` に保存されます
