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
```
