import { useEffect, useRef, useState } from "react";
import { useWeeklyCycle } from "../hooks/useWeeklyCycles";
import { cn, ui } from "../styles";
import { DateU } from "../utils/date";

type Props = {
  week: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function WeeklyCyclePanel({
  week,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const [goalDraft, setGoalDraft] = useState("");
  const [reviewDraft, setReviewDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { cycle, loading, saving, error, save } = useWeeklyCycle(week);

  useEffect(() => {
    setGoalDraft(cycle?.goalContent ?? "");
    setReviewDraft(cycle?.reviewContent ?? "");
    setSaved(false);
  }, [cycle, week]);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const isDirty =
    goalDraft !== (cycle?.goalContent ?? "") ||
    reviewDraft !== (cycle?.reviewContent ?? "");

  const handleSave = async () => {
    const result = await save({
      goalContent: goalDraft,
      reviewContent: reviewDraft,
    });
    if (result) {
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col max-[860px]:border-t max-[860px]:border-[var(--hair)]",
        collapsed ? "items-center" : "pl-0",
      )}
      aria-label="週次サイクル"
    >
      <div
        className={cn(
          "grid h-[40px] grid-cols-[minmax(0,1fr)_36px] items-center border-b border-[var(--hair)] px-0.5 pb-2 pt-1",
          collapsed &&
            "flex w-full justify-center border-b-0 px-0 pb-0 pt-1 max-[860px]:justify-end",
        )}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="font-[var(--num)] text-xs text-[var(--ink-faint)]">
              {DateU.fmtIsoWeek(week)}
            </span>
          </div>
        )}
        <button
          type="button"
          className="flex h-[30px] w-[30px] flex-none flex-col items-center justify-center justify-self-center gap-[3px] rounded-md text-[var(--ink-soft)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "週次サイクルを開く" : "週次サイクルを最小化"}
          title={collapsed ? "週次サイクルを開く" : "週次サイクルを最小化"}
        >
          <span className="h-px w-3.5 rounded-full bg-current" />
          <span className="h-px w-3.5 rounded-full bg-current" />
          <span className="h-px w-3.5 rounded-full bg-current" />
        </button>
      </div>

      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-3 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[var(--hair)] [&::-webkit-scrollbar]:w-[7px]">
          {error && (
            <div
              className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] px-3 py-2 text-[13px] text-[var(--accent)]"
              role="alert"
            >
              エラー: {error}
            </div>
          )}
          {loading ? (
            <div className="text-sm text-[var(--ink-soft)]">読み込み中…</div>
          ) : (
            <>
              <label className="flex min-w-0 flex-col gap-[6px]">
                <span className="text-xs font-medium text-[var(--ink-soft)]">
                  目標
                </span>
                <textarea
                  className="min-h-[132px] w-full resize-y rounded-[var(--radius)] border border-[var(--hair)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-[1.65] text-[var(--ink)] outline-none transition-colors duration-150 placeholder:text-[var(--ink-faint)] focus:border-[var(--ink-faint)]"
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value)}
                  placeholder={`${DateU.fmtIsoWeek(week)}の目標を記録`}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-[6px]">
                <span className="text-xs font-medium text-[var(--ink-soft)]">
                  ふりかえり
                </span>
                <textarea
                  className="min-h-[132px] w-full resize-y rounded-[var(--radius)] border border-[var(--hair)] bg-[var(--surface)] px-3 py-2.5 text-sm leading-[1.65] text-[var(--ink)] outline-none transition-colors duration-150 placeholder:text-[var(--ink-faint)] focus:border-[var(--ink-faint)]"
                  value={reviewDraft}
                  onChange={(event) => setReviewDraft(event.target.value)}
                  placeholder={`${DateU.fmtIsoWeek(week)}のふりかえりを記録`}
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-xs text-[var(--ink-faint)]">
                  {saved
                    ? "保存しました"
                    : cycle?.updatedAt
                      ? `最終更新: ${new Date(cycle.updatedAt).toLocaleString("ja-JP")}`
                      : ""}
                </span>
                <button
                  type="button"
                  className={cn(ui.button, "min-h-[29px] px-4")}
                  onClick={() => void handleSave()}
                  disabled={saving || !isDirty}
                >
                  {saving ? "保存中…" : "保存"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
