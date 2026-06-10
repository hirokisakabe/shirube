# shirube

毎日のタスクと週ごとの目標・振り返りを束ねて、進む方向を示すツール。

## コンセプト

タスクをこなすだけでなく、週ごとの目標（goal）と振り返り（review）を同じまとまりで記録することで、日々の行動が自分の向かいたい方向へと積み重なっていきます。shirube はその羅針盤となるツールです。

- **タスク（task）**: 今日・今週やること
- **週次サイクル（weekly cycle）**: 1 週分の目標本文と振り返り本文

## インストール

```bash
npm install -g shirube
```

## 動作環境

- Node.js >= 22.12.0
- macOS

## Web preview

Vercel では静的 Web preview としてデプロイします。main branch の Production Deployment は正式な production-ready Web 版ではなく、latest preview という位置づけです。PR branch では Vercel の Preview Deployment を使い、UI 変更を URL で確認します。

Web preview は Hono API server や SQLite を使わず、ブラウザ内 IndexedDB に tasks / weekly cycles を保存します。データはそのブラウザ内に残り、サーバ同期、マルチデバイス同期、バックアップはありません。

```bash
# CLI / server bundle を作らず Web static assets だけ生成
pnpm build:web:preview
```

Vercel の build command は `pnpm build:web:preview`、output directory は `dist/web` です。`pnpm build:web:preview` が build-time に `VITE_STORAGE_DRIVER=indexeddb` を設定します。未指定の通常 Web build では、ローカル server 版と同じ Hono API client 経由で動作します。

## 使い方

```bash
# ヘルプを表示
shirube --help

# バージョンを表示
shirube --version

# タスクを追加（--date 省略時は今日）
shirube add "タスクのタイトル"
shirube add "タスクのタイトル" --date 2026-06-15

# タスク一覧を表示（デフォルトは今日）
shirube list
shirube list --date 2026-06-15
shirube list --week          # 今週のタスクを一覧表示

# タスクを完了にする
shirube done <id>

# タスクを削除（ソフトデリート）
shirube rm <id>              # 確認プロンプトあり
shirube rm <id> --yes        # 確認なし（AI エージェント向け）

# タスクのタイトルを変更する
shirube edit <id> --title "新しいタイトル"

# タスクの詳細を表示
shirube show <id>

# 週次目標本文をエディタで開く（省略時は今週）
shirube goal
shirube goal --week 2026-W22

# 週次振り返りをエディタで開く（省略時は今週）
shirube review
shirube review --week 2026-W22

# 週次サイクル一覧を表示する
shirube goal list
shirube review list

# サーバを起動してブラウザで開く（事前に pnpm build が必要）
shirube serve
```

各コマンドに `--format json` を付けると機械可読な JSON 形式で出力します。

```bash
shirube list --format json
shirube add "テスト" --format json
```
