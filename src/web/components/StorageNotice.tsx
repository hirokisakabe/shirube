import { usesIndexedDbStorage } from "../api/storage";

export function StorageNotice() {
  if (!usesIndexedDbStorage) return null;

  return (
    <span
      className="storage-notice"
      title="この preview のデータはブラウザ内に保存されます"
    >
      Preview: ブラウザ内保存
    </span>
  );
}
