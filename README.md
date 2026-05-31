# uchi

pnpm workspaces によるモノレポ。CLI・サーバ・Web UI の 3 アプリを管理する。

## 構成

```
apps/
  cli/     - CLI アプリ (@uchi/cli)
  server/  - サーバアプリ (@uchi/server)
  web/     - Web UI (@uchi/web)
```

## セットアップ

```bash
pnpm install
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
