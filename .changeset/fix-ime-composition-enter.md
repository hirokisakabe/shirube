---
"shirube": patch
---

日本語IME変換中のEnterキーでアイテムが意図せず追加される問題を修正しました。`AddInput` および `TodoItem` の `onKeyDown` ハンドラで `isComposing` を確認することで、IME確定時のEnterとアイテム追加のEnterを正しく区別します。
