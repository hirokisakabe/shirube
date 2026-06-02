# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 依存関係インストール＆ビルド
pnpm install
pnpm build          # Web (Vite) + CLI/Server (esbuild) をビルドして dist/ に出力

# 型チェック
pnpm typecheck      # CLI/Server/DB と Web の型チェック

# テスト
pnpm test           # 全テスト (DB・Server・Web・CLI)

# 未使用ファイル・export・依存パッケージの検出
pnpm knip           # knip による静的解析（CI でも自動実行）

# DB マイグレーション生成・適用
pnpm generate       # drizzle-kit generate
pnpm migrate        # drizzle-kit migrate

# 開発サーバ起動（フロントエンド開発時）
pnpm dev:server     # ターミナル1: API サーバ (port 3000)
pnpm dev:web        # ターミナル2: Vite dev サーバ (port 5173, /api を 3000 にプロキシ)
```

## アーキテクチャ

### 単一パッケージ構成

単一の `package.json` による単一パッケージ。esbuild でバンドルして npm 公開可能な形式に出力する。

```
src/cli/     - Commander.js ベースの CLI
src/server/  - Hono + @hono/node-server の API サーバ
src/web/     - React 19 + TanStack Router + Vite の SPA
src/db/      - better-sqlite3 + Drizzle ORM のスキーマ・マイグレーション
drizzle/     - DB マイグレーションファイル
dist/        - ビルド成果物
  cli.js     - CLI バンドル (bin: shirube)
  server.js  - サーバーバンドル
  web/       - Web 静的ファイル
  drizzle/   - マイグレーションファイル (コピー)
```

### データ層 (`src/db`)

- SQLite ファイルは `~/.shirube/db.sqlite`（`SHIRUBE_DB_PATH` 環境変数で上書き可能）
- `createDb(dbPath?)` が DB 接続を返す。起動時に `drizzle/` フォルダのマイグレーションを自動適用
- マイグレーションパスは `SHIRUBE_MIGRATIONS_PATH` 環境変数で上書き可能（テスト時に注入）
- バンドル済みは `dist/drizzle/`、ソース実行 (tsx) 時はプロジェクトルートの `drizzle/` を自動判別
- スキーマ: `tasks`（date, doneAt, deletedAt）・`reviews`（week が UNIQUE キー）・`goals`（doneAt, deletedAt）
- 削除はすべてソフトデリート（`deletedAt` に ISO 文字列をセット）
- テスト用に `createTestDb()` を公開。in-memory SQLite を返すため DB ファイルを汚染しない

### サーバ (`src/server`)

- `createApp(db)` が Hono app を返すファクトリパターン。テスト時に `createTestDb()` の DB を注入できる
- エンドポイント: `/api/tasks`・`/api/reviews`・`/api/goals`（CRUD）
- `dist/web/` を静的ファイルとして配信（本番時）

### CLI (`src/cli`)

- `shirube serve` は `dist/server.js` を子プロセスで起動し、macOS の `open` でブラウザを開く（`pnpm build` が前提）
- `--format json` オプションで機械可読出力。`--yes` フラグで削除の確認プロンプトをスキップ（AI エージェント向け）

### テストの注意点

- `vitest.node.config.ts`: DB・Server テスト (node 環境)。`SHIRUBE_MIGRATIONS_PATH` を `drizzle/` に設定
- `vitest.web.config.ts`: Web テスト (jsdom 環境)
- `vitest.cli.config.ts`: CLI テスト (node 環境)。ビルド済み `dist/cli.js` を使用するため `pnpm build` が前提
