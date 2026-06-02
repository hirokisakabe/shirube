# shirube（しるべ）

> 道しるべ — 毎日のタスク・週次レビュー・長期目標を束ねて、進む方向を示すツール。

## コンセプト

「しるべ」は古語で **道しるべ（道標）** を意味します。

タスクをこなすだけでなく、週の終わりに振り返り（review）、長期目標（goal）と照らし合わせる — この 3 つのサイクルを続けることで、日々の行動が自分の向かいたい方向へと積み重なっていきます。shirube はその羅針盤となるツールです。

- **タスク（task）**: 今日・今週やること
- **レビュー（review）**: 週次の振り返りメモ
- **目標（goal）**: 中長期的に達成したいこと

## インストール

```bash
npm install -g shirube
```

インストール後、`shirube --version` でバージョンを確認できます。

## 動作環境

- Node.js >= 22.12.0
- macOS（`shirube serve` のブラウザ自動起動は macOS の `open` コマンドを使用）

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

# 週次振り返りをエディタで開く（省略時は今週）
shirube review
shirube review --week 2026-W22

# 過去の振り返り一覧を表示する
shirube review list

# サーバを起動してブラウザで開く（事前に pnpm build が必要）
shirube serve
```

各コマンドに `--format json` を付けると機械可読な JSON 形式で出力します。

```bash
shirube list --format json
shirube add "テスト" --format json
```

## 開発者向け

### セットアップ

```bash
pnpm install
pnpm build
```

### コマンド

```bash
pnpm build      # Web (Vite) + CLI/Server (esbuild) をビルドして dist/ に出力
pnpm dev:server # API サーバを watch モードで起動（port 3000）
pnpm dev:web    # Vite dev サーバを起動（port 5173、/api を 3000 にプロキシ）
pnpm typecheck  # TypeScript 型チェック
pnpm test       # 全テスト実行
pnpm knip       # 未使用ファイル・export・依存パッケージの検出（CI 組み込みは別途対応予定）
```

### CI

PR 作成・更新および `main` への push で GitHub Actions が自動実行される。

| ステップ | コマンド |
| --- | --- |
| 型チェック | `pnpm typecheck` |
| ビルド | `pnpm build` |
| テスト | `pnpm test` |

## リリース

[Changesets](https://github.com/changesets/changesets) でバージョン管理・CHANGELOG 生成・npm publish を自動化している。

### リリースフロー

1. 実装 PR に changeset ファイルを添付する

   ```bash
   pnpm changeset
   ```

   対話式で変更の種類（major / minor / patch）と概要を入力する。

2. PR をマージすると、GitHub Actions が「Version Packages」PR を自動作成する。

3. 「Version Packages」PR をレビューしてマージすると、`CHANGELOG.md` の更新・バージョン bump・npm publish が自動で実行される。

### 初回セットアップ（リポジトリ管理者向け）

OIDC Trusted Publishing を使用しているため、`NPM_TOKEN` シークレットは不要。npmjs.com 側でこのリポジトリを信頼済みパブリッシャーとして登録するだけでよい。

1. npmjs.com でパッケージを一度手動で publish するか、先に scoped で登録しておく。
2. npmjs.com の **パッケージ設定 → Publishing Access → Granular Access Tokens → Setup OIDC** からこのリポジトリの GitHub Actions ワークフローを Trusted Publisher として登録する。
   - Repository: `hirokisakabe/shirube`
   - Workflow: `release.yml`
   - Environment: （空欄でよい）
