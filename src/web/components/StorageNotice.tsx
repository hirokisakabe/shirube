import { usesIndexedDbStorage } from "../api/storage";

export function StorageNotice() {
  if (!usesIndexedDbStorage) return null;

  return (
    <span
      className="inline-flex min-h-[22px] items-center whitespace-nowrap rounded-full border border-[color-mix(in_srgb,var(--accent)_34%,var(--hair))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))] px-2 py-0.5 text-[11px] font-semibold tracking-normal text-[var(--accent)]"
      title="この preview のデータはブラウザ内に保存されます"
    >
      Preview: ブラウザ内保存
    </span>
  );
}
