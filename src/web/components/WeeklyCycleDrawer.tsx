import { useEffect, useRef, useState } from "react";
import { useWeeklyCycle } from "../hooks/useWeeklyCycles";
import { cn } from "../styles";
import { DateU } from "../utils/date";

type Props = {
  week: string;
  open: boolean;
  onClose: () => void;
};

export function WeeklyCycleDrawer({ week, open, onClose }: Props) {
  const [goalDraft, setGoalDraft] = useState("");
  const [reviewDraft, setReviewDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const { cycle, loading, saving, error, save } = useWeeklyCycle(week);

  useEffect(() => {
    setGoalDraft(cycle?.goalContent ?? "");
    setReviewDraft(cycle?.reviewContent ?? "");
    setSaved(false);
  }, [cycle, week]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), textarea:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("aria-hidden"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose, open]);

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  if (!open) return null;

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
    <div className="pointer-events-none fixed inset-0 z-30" role="presentation">
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 h-full w-full bg-[rgba(33,32,28,0.18)] max-[760px]:bg-[rgba(33,32,28,0.12)]"
        aria-label="週次サイクルを閉じる"
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        className="pointer-events-auto absolute right-0 top-0 flex h-full w-[min(560px,calc(100vw-28px))] flex-col border-l border-[var(--hair)] bg-[var(--surface)] shadow-[-18px_0_48px_-32px_rgba(33,32,28,0.65)] max-[760px]:bottom-0 max-[760px]:top-auto max-[760px]:h-[min(82vh,660px)] max-[760px]:w-full max-[760px]:border-l-0 max-[760px]:border-t max-[760px]:shadow-[0_-18px_44px_-30px_rgba(33,32,28,0.7)] max-[520px]:h-[min(88vh,680px)]"
        aria-label={`${DateU.fmtIsoWeek(week)}の週次サイクル`}
        aria-modal="true"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--hair-soft)] px-6 pb-4 pt-[22px] max-[760px]:px-[18px] max-[760px]:pb-3 max-[760px]:pt-4">
          <div>
            <p className="m-0 mb-0.5 text-xs font-semibold text-[var(--ink-faint)]">
              {DateU.fmtIsoWeek(week)}
            </p>
            <h2 className="m-0 text-lg font-bold text-[var(--ink)]">
              週次サイクル
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--hair)] text-[22px] leading-none text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            aria-label="週次サイクルを閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-6 pb-6 pt-[18px] max-[760px]:px-[18px] max-[760px]:pb-[18px] max-[760px]:pt-3.5 max-[520px]:gap-3">
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
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5">
                <label className="flex min-w-0 flex-col gap-[7px]">
                  <span className="text-xs font-bold tracking-[0.04em] text-[var(--ink-soft)]">
                    目標
                  </span>
                  <textarea
                    className="min-h-[190px] w-full resize-y rounded-[var(--radius)] border border-[var(--hair)] bg-[var(--surface)] px-4 py-3.5 text-sm leading-[1.7] text-[var(--ink)] outline-none transition-colors duration-150 placeholder:text-[var(--ink-faint)] focus:border-[var(--ink-faint)] max-[760px]:min-h-[150px] max-[520px]:min-h-[132px]"
                    value={goalDraft}
                    onChange={(event) => setGoalDraft(event.target.value)}
                    placeholder={`${DateU.fmtIsoWeek(week)}の目標を記録`}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-[7px]">
                  <span className="text-xs font-bold tracking-[0.04em] text-[var(--ink-soft)]">
                    振り返り
                  </span>
                  <textarea
                    className="min-h-[190px] w-full resize-y rounded-[var(--radius)] border border-[var(--hair)] bg-[var(--surface)] px-4 py-3.5 text-sm leading-[1.7] text-[var(--ink)] outline-none transition-colors duration-150 placeholder:text-[var(--ink-faint)] focus:border-[var(--ink-faint)] max-[760px]:min-h-[150px] max-[520px]:min-h-[132px]"
                    value={reviewDraft}
                    onChange={(event) => setReviewDraft(event.target.value)}
                    placeholder={`${DateU.fmtIsoWeek(week)}の振り返りを記録`}
                  />
                </label>
              </div>
              <div className="flex items-start justify-between gap-3 max-[760px]:flex-col">
                {cycle?.updatedAt && (
                  <span className="text-xs text-[var(--ink-faint)]">
                    最終更新:{" "}
                    {new Date(cycle.updatedAt).toLocaleString("ja-JP")}
                  </span>
                )}
                <div className="flex items-center gap-2.5">
                  {saved && (
                    <span
                      className="text-xs text-[var(--ink-soft)]"
                      role="status"
                    >
                      保存しました
                    </span>
                  )}
                  <button
                    type="button"
                    className={cn(
                      "rounded-md bg-[var(--ink)] px-5 py-[7px] text-[13px] font-medium text-[var(--surface)] transition-opacity duration-150 hover:not-disabled:opacity-80 disabled:cursor-default disabled:opacity-40",
                    )}
                    onClick={() => void handleSave()}
                    disabled={saving || !isDirty}
                  >
                    {saving ? "保存中…" : "保存"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
