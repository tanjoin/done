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

1. [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 Client ID を作成する
2. 承認済み JavaScript 生成元に利用する URL を登録する
3. 設定画面の「設定・データ管理」に OAuth 2.0 Client ID を入力する
4. 「カレンダー一覧を取得」で連携可能なカレンダーを読み込み、TODO/DONE を選択する
5. 必要なら「Google Drive 同期を有効にする」を ON にする
6. 「設定を保存する」で保存する

補足:
- OAuth Client ID と選択したカレンダー ID は暗号化して localStorage に保存されます
- TODO カレンダーの取得は翌日分までを対象にします
- Google Drive 同期が ON の場合、タスク操作後に JSON が Drive の専用ファイル `tanjoin_done_task_sync_backup_v1.json` に保存されます
