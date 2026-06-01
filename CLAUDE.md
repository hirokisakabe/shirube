# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 依存関係インストール＆ビルド
pnpm install
pnpm build          # 全パッケージをビルド (pnpm -r build)

# 型チェック
pnpm typecheck      # 全パッケージ (pnpm -r typecheck)

# テスト
pnpm test           # 全パッケージ (pnpm -r --if-present test)

# 個別パッケージのテスト
pnpm --filter @shirube/db test
pnpm --filter @shirube/server test
pnpm --filter @shirube/cli test
pnpm --filter @shirube/web test

# DB マイグレーション生成・適用 (packages/db で実行)
pnpm --filter @shirube/db generate   # drizzle-kit generate
pnpm --filter @shirube/db migrate    # drizzle-kit migrate

# 開発サーバ起動（フロントエンド開発時）
pnpm --filter @shirube/server dev    # ターミナル1: API サーバ (port 3000)
pnpm --filter @shirube/web dev       # ターミナル2: Vite dev サーバ (port 5173, /api を 3000 にプロキシ)
```

## アーキテクチャ

### モノレポ構成

pnpm workspaces による monorepo。依存関係の方向は `cli/server → @shirube/db`、`web` は独立（`@shirube/db` に依存しない）。

```
apps/cli/     - Commander.js ベースの CLI (@shirube/cli)
apps/server/  - Hono + @hono/node-server の API サーバ (@shirube/server)
apps/web/     - React 19 + TanStack Router + Vite の SPA (@shirube/web)
packages/db/  - better-sqlite3 + Drizzle ORM のスキーマ・マイグレーション (@shirube/db)
```

### データ層 (`packages/db`)

- SQLite ファイルは `~/.shirube/db.sqlite`（`SHIRUBE_DB_PATH` 環境変数で上書き可能）
- `createDb(dbPath?)` が DB 接続を返す。起動時に `drizzle/` フォルダのマイグレーションを自動適用
- スキーマ: `tasks`（date, doneAt, deletedAt）・`reviews`（week が UNIQUE キー）・`goals`（doneAt, deletedAt）
- 削除はすべてソフトデリート（`deletedAt` に ISO 文字列をセット）
- テスト用に `createTestDb()` を公開。in-memory SQLite を返すため DB ファイルを汚染しない

### サーバ (`apps/server`)

- `createApp(db)` が Hono app を返すファクトリパターン。テスト時に `createTestDb()` の DB を注入できる
- エンドポイント: `/api/tasks`・`/api/reviews`・`/api/goals`（CRUD）
- `apps/web/dist` を静的ファイルとして配信（本番時）

### CLI (`apps/cli`)

- `shirube serve` は `apps/server/dist/index.js` を子プロセスで起動し、macOS の `open` でブラウザを開く（`pnpm build` が前提）
- `--format json` オプションで機械可読出力。`--yes` フラグで削除の確認プロンプトをスキップ（AI エージェント向け）

### テストの注意点

- `@shirube/server` の vitest は `@shirube/db` を `packages/db/src/index.ts` へエイリアス解決するため、`@shirube/db` のビルドなしで実行できる
- `@shirube/cli` のテストスクリプトは `pnpm --filter @shirube/db build && pnpm build` を前置実行する（ビルド成果物を require するため）
- `@shirube/web` のテストは jsdom 環境で動作し `src/test/setup.ts` でセットアップされる
