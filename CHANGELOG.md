# shirube

## 1.0.0

### Major Changes

- 174c5ba: Replace separate goals and reviews with weekly cycles that store goal and review content together per ISO week.

  Existing `goals` and `reviews` tables are dropped by the migration instead of being migrated into the new schema.

### Patch Changes

- 1e012fe: Add an IndexedDB-backed static web preview build for Vercel.

## 0.4.0

### Minor Changes

- db75f5f: 月ビューでタスクの編集・削除・5件目以降を含む全件操作に対応しました。

## 0.3.2

### Patch Changes

- 3457972: 長いタスク名や目標名を省略表示している箇所で、全文を確認できる title を追加しました。

## 0.3.1

### Patch Changes

- 3b19bd6: 日本語 IME 変換中の Enter キーでアイテムが意図せず追加される問題を修正しました。`AddInput` および `TodoItem` の `onKeyDown` ハンドラで `isComposing` を確認することで、IME 確定時の Enter とアイテム追加の Enter を正しく区別します。

## 0.3.0

### Minor Changes

- e38d239: Web UI に目標管理機能を追加する。目標の追加・一覧表示（達成済み含む/含まない切替）・達成済みマーク・削除ができる `/goals` ページを追加した。

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
