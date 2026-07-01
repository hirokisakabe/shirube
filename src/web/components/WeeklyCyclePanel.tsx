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
          ui.panelHeader,
          // Keep the cycle toggle in the outer 36px rail in both states. When
          // collapsed, switch to a single 36px column so the lone button does
          // not auto-place into the content column and jump on the x-axis. Keep
          // the header full-width on narrow screens so the rail can stay
          // right-aligned like the collapsed Inbox panel.
          collapsed
            ? "w-full grid-cols-[36px] justify-center justify-items-center border-b-0 px-0 pb-0 pt-1 max-[860px]:justify-end"
            : "grid-cols-[minmax(0,1fr)_36px] px-0",
        )}
        style={{ paddingLeft: 0, paddingRight: 0 }}
      >
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5 pl-0.5">
            <span className="font-[var(--num)] text-xs text-[var(--ink-faint)]">
              {DateU.fmtIsoWeek(week)}
            </span>
          </div>
        )}
        <button
          type="button"
          className={ui.collapseButton}
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
        <div className={cn(ui.panelScroller, "gap-3 pt-3")}>
          {error && (
            <div className={ui.inlineAlert} role="alert">
              エラー: {error}
            </div>
          )}
          {loading ? (
            <div className="text-sm text-[var(--ink-soft)]">読み込み中…</div>
          ) : (
            <>
              <label className="flex min-w-0 flex-col gap-[6px]">
                <span className={ui.fieldLabel}>目標</span>
                <textarea
                  className={ui.textarea}
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value)}
                  placeholder={`${DateU.fmtIsoWeek(week)}の目標を記録`}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-[6px]">
                <span className={ui.fieldLabel}>ふりかえり</span>
                <textarea
                  className={ui.textarea}
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
