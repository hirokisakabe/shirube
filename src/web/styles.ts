export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const ui = {
  toast:
    "flex max-w-[min(360px,calc(100vw-48px))] items-center justify-between gap-3 rounded-[7px] border border-[var(--hair)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--ink)] shadow-[0_10px_34px_-22px_rgba(40,30,20,0.55)]",
  button:
    "inline-flex min-h-[30px] flex-none items-center justify-center rounded-md border border-[var(--hair)] bg-[var(--surface-2)] px-3 text-[13px] text-[var(--ink)] transition-[border-color,color,opacity] duration-150 hover:not-disabled:border-[var(--accent)] hover:not-disabled:text-[var(--accent)] disabled:cursor-default disabled:opacity-55",
  buttonCompact: "min-h-[26px] px-2.5",
};
