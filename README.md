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

# タスクを追加（--date 省略時は今日）
uchi add "タスクのタイトル"
uchi add "タスクのタイトル" --date 2026-06-15

# タスク一覧を表示（デフォルトは今日）
uchi list
uchi list --date 2026-06-15
uchi list --week          # 今週のタスクを一覧表示

# タスクを完了にする
uchi done <id>

# タスクを削除（ソフトデリート）
uchi rm <id>              # 確認プロンプトあり
uchi rm <id> --yes        # 確認なし（AI エージェント向け）

# タスクの詳細を表示
uchi show <id>

# 目標を追加する
uchi goal add "目標のタイトル"

# 目標一覧を表示（デフォルトは未達成のみ）
uchi goal list
uchi goal list --all      # 達成済みも含めて表示

# 目標を達成にする
uchi goal done <id>

# 目標を削除（ソフトデリート）
uchi goal rm <id>         # 確認プロンプトあり
uchi goal rm <id> --yes   # 確認なし（AI エージェント向け）
```

各コマンドに `--format json` を付けると機械可読な JSON 形式で出力します。

```bash
uchi list --format json
uchi add "テスト" --format json
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
