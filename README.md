# uchi

pnpm workspaces によるモノレポ。CLI・サーバ・Web UI の 3 アプリを管理する。

## 構成

```
apps/
  cli/     - CLI アプリ (@uchi/cli)
  server/  - サーバアプリ (@uchi/server)
  web/     - Web UI (@uchi/web)
packages/
  db/      - DB スキーマ・マイグレーション・テストユーティリティ (@uchi/db)
```

## 動作環境

- Node.js >= 22.12.0
- pnpm

## セットアップ

```bash
pnpm install
pnpm build
```

## CLI の使い方

```bash
# ヘルプを表示
uchi --help

# バージョンを表示
uchi --version

# JSON 形式で出力（AI エージェント連携向け）
uchi --format json

# テーブル形式で出力（デフォルト）
uchi --format table
```

`--format` オプションは全サブコマンドで共通して利用できます。

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
