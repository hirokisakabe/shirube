export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const ui = {
  toast:
    "flex max-w-[min(360px,calc(100vw-48px))] items-center justify-between gap-3 rounded-[7px] border border-[var(--hair)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--ink)] shadow-[0_10px_34px_-22px_rgba(40,30,20,0.55)]",
  button:
    "inline-flex min-h-[30px] flex-none items-center justify-center rounded-md border border-[var(--hair)] bg-[var(--surface-2)] px-3 text-[13px] text-[var(--ink)] transition-[border-color,color,opacity] duration-150 hover:not-disabled:border-[var(--accent)] hover:not-disabled:text-[var(--accent)] disabled:cursor-default disabled:opacity-55",
  buttonCompact: "min-h-[26px] px-2.5",
  subtleButton:
    "rounded-md border border-[var(--hair)] px-[11px] py-[5px] text-xs text-[var(--ink-faint)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)]",
  navIconButton:
    "flex h-[30px] w-[30px] items-center justify-center rounded-md text-[19px] text-[var(--ink-soft)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
  collapseButton:
    "flex h-[30px] w-[30px] flex-none flex-col items-center justify-center justify-self-center gap-[3px] rounded-md text-[var(--ink-soft)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
  panelHeader:
    "grid h-[40px] items-center border-b border-[var(--hair)] px-0.5 pb-2 pt-1",
  panelHeaderCollapsed:
    "flex w-full justify-center border-b-0 px-0 pb-0 pt-1 max-[860px]:justify-end",
  panelScroller:
    "flex min-h-0 flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[var(--hair)] [&::-webkit-scrollbar]:w-[7px]",
  panelTitle:
    "m-0 text-[13px] font-medium tracking-normal text-[var(--ink-soft)]",
  countBadge:
    "inline-flex h-[22px] min-w-6 items-center justify-center rounded-full border border-[var(--hair)] px-1 font-[var(--num)] text-xs text-[var(--ink-soft)]",
  field:
    "min-w-0 rounded-md border border-[var(--hair)] bg-[var(--surface)] text-[var(--ink)] outline-none focus:border-[var(--ink-faint)]",
  textarea:
    "min-h-[132px] w-full resize-y rounded-[var(--radius)] border border-[var(--hair)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-[1.65] text-[var(--ink)] outline-none transition-colors duration-150 placeholder:text-[var(--ink-faint)] focus:border-[var(--ink-faint)]",
  fieldLabel: "text-xs font-medium text-[var(--ink-soft)]",
  alert:
    "rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--surface))] px-3 py-2 text-[13px] text-[var(--accent)]",
  inlineAlert:
    "rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] px-3 py-2 text-[13px] text-[var(--accent)]",
  segmentGroup:
    "flex rounded-md border border-[var(--hair)] bg-[var(--surface-2)] p-0.5",
  segmentButton:
    "rounded-[4px] px-4 py-[5px] text-sm text-[var(--ink-soft)] transition-all duration-150",
  segmentButtonActive: "bg-[var(--ink)] text-[var(--surface)]",
  taskActionButton:
    "flex items-center justify-center rounded text-[15px] text-[var(--ink-faint)] hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] hover:text-[var(--accent)] disabled:cursor-wait disabled:hover:bg-transparent disabled:hover:text-[var(--ink-faint)]",
};
