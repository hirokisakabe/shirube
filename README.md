# shirube（しるべ）

> 道しるべ — 毎日のタスク・週次レビュー・長期目標を束ねて、進む方向を示すツール。

## コンセプト

「しるべ」は古語で **道しるべ（道標）** を意味します。

タスクをこなすだけでなく、週の終わりに振り返り（review）、長期目標（goal）と照らし合わせる — この 3 つのサイクルを続けることで、日々の行動が自分の向かいたい方向へと積み重なっていきます。shirube はその羅針盤となるツールです。

- **タスク（task）**: 今日・今週やること
- **レビュー（review）**: 週次の振り返りメモ
- **目標（goal）**: 中長期的に達成したいこと

## 構成

pnpm workspaces によるモノレポ。CLI・サーバ・Web UI の 3 アプリを管理する。

```
apps/
  cli/     - CLI アプリ (@shirube/cli)
  server/  - サーバアプリ (@shirube/server)
  web/     - Web UI (@shirube/web)
packages/
  db/      - DB スキーマ・マイグレーション・テストユーティリティ (@shirube/db)
```

## 動作環境

- Node.js >= 22.12.0
- pnpm
- macOS（`shirube serve` のブラウザ自動起動は macOS の `open` コマンドを使用）

## セットアップ

```bash
pnpm install
pnpm build
```

## サーバの起動

Web UI のバックエンドサーバを起動します。ポート 3000 で待ち受けます。

```bash
# CLI でサーバを起動してブラウザを自動で開く（macOS）
pnpm build
shirube serve

# pnpm から直接起動する場合
pnpm build
pnpm --filter @shirube/server start
```

起動後は以下でアクセスできます。

- Web UI: `http://localhost:3000/`
- API: `http://localhost:3000/api/tasks`、`/api/reviews`、`/api/goals`

> **注意**: サーバは `apps/web/dist` を静的ファイルとして配信します。`pnpm build` を先に実行してください。

## フロントエンド開発

`apps/web` の変更を開発中に確認するには、Vite dev サーバーを使います。

```bash
# ターミナル 1: API サーバーを起動
pnpm --filter @shirube/server dev

# ターミナル 2: Vite dev サーバーを起動（HMR 有効、/api を 3000 番にプロキシ）
pnpm --filter @shirube/web dev
```

Vite dev サーバーは `http://localhost:5173/` で起動し、`/api/*` は自動的に `http://localhost:3000` へプロキシされます。

> **注意**: `pnpm dev`（全 app 並列起動）も同様に動作しますが、フロント変更は `http://localhost:5173/` で確認してください。`http://localhost:3000/` は `dist` を配信するため、ビルドなしでは最新変更が反映されません。

## CLI の使い方

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

# タスクの詳細を表示
shirube show <id>

# 目標を追加する
shirube goal add "目標のタイトル"

# 目標一覧を表示（デフォルトは未達成のみ）
shirube goal list
shirube goal list --all      # 達成済みも含めて表示

# 目標を達成にする
shirube goal done <id>

# 目標を削除（ソフトデリート）
shirube goal rm <id>         # 確認プロンプトあり
shirube goal rm <id> --yes   # 確認なし（AI エージェント向け）

# サーバを起動してブラウザで開く（事前に pnpm build が必要）
shirube serve
```

各コマンドに `--format json` を付けると機械可読な JSON 形式で出力します。

```bash
shirube list --format json
shirube add "テスト" --format json
```

## コマンド

```bash
pnpm build      # 全 app をビルド (pnpm -r build)
pnpm dev        # 全 app を watch モードで起動 (並列)
pnpm typecheck  # 全 app の TypeScript 型チェック (tsc --noEmit)
pnpm test       # 全 app のテスト実行 (test script がある app のみ)
```

## CI

PR 作成・更新および `main` への push で GitHub Actions が自動実行される。

| ステップ | コマンド |
| --- | --- |
| 型チェック | `pnpm typecheck` |
| ビルド | `pnpm build` |
| テスト | `pnpm test` |
