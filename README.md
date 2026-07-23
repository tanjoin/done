# done

[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

TypeScript + Vite + classベースで構成したタスク管理アプリです。

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

- `src/`: 画面ごとのクラス実装（`index.ts`, `temporary.ts`, `settings.ts`）
- `public/`: 静的配信ファイル（`tasks.json` など）
- `tools/`: ローカルサーバーや補助スクリプト

