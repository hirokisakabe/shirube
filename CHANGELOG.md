# shirube

## 0.2.0

### Minor Changes

- f8f71ef: Web UI に振り返り機能を追加する。今週の振り返りを作成・編集できるページ（`/review`）を追加し、過去の振り返り一覧も閲覧できるようになった。

## 0.1.0

### Minor Changes

- 2012323: CLI に `shirube edit <id> --title <新タイトル>` コマンドを追加する。タスクのタイトルをコマンドラインから変更できるようになる。

### Patch Changes

- 0f58123: 月ビューの各日付セルにタスク追加 UI (AddInput) を追加
- 590e4dd: 翌日へ繰り越しボタン（`›`）と関連ロジックを削除する
- 60196f4: ページタイトルとヘッダーの「仕事の todo」サブテキストを削除する
- e8efccd: `shirube serve` 起動時にアクセス先 URL (`http://localhost:3000`) をターミナルに出力するようになりました
