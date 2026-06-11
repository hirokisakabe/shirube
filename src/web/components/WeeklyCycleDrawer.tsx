import { useEffect, useRef, useState } from "react";
import { useWeeklyCycle } from "../hooks/useWeeklyCycles";
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
    <div className="cycle-drawer-layer" role="presentation">
      <button
        type="button"
        className="cycle-drawer-scrim"
        aria-label="週次サイクルを閉じる"
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        className="cycle-drawer"
        aria-label={`${DateU.fmtIsoWeek(week)}の週次サイクル`}
        aria-modal="true"
        role="dialog"
      >
        <header className="cycle-drawer-header">
          <div>
            <p className="cycle-drawer-kicker">{DateU.fmtIsoWeek(week)}</p>
            <h2 className="cycle-drawer-title">週次サイクル</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="cycle-drawer-close"
            aria-label="週次サイクルを閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="cycle-drawer-body">
          {error && (
            <div className="review-error" role="alert">
              エラー: {error}
            </div>
          )}
          {loading ? (
            <div className="review-loading">読み込み中…</div>
          ) : (
            <>
              <div className="cycle-editor-grid cycle-editor-grid--drawer">
                <label className="cycle-editor-field">
                  <span className="cycle-editor-label">目標</span>
                  <textarea
                    className="review-textarea cycle-textarea cycle-textarea--drawer"
                    value={goalDraft}
                    onChange={(event) => setGoalDraft(event.target.value)}
                    placeholder={`${DateU.fmtIsoWeek(week)}の目標を記録`}
                  />
                </label>
                <label className="cycle-editor-field">
                  <span className="cycle-editor-label">振り返り</span>
                  <textarea
                    className="review-textarea cycle-textarea cycle-textarea--drawer"
                    value={reviewDraft}
                    onChange={(event) => setReviewDraft(event.target.value)}
                    placeholder={`${DateU.fmtIsoWeek(week)}の振り返りを記録`}
                  />
                </label>
              </div>
              <div className="review-footer cycle-drawer-footer">
                {cycle?.updatedAt && (
                  <span className="review-updated">
                    最終更新:{" "}
                    {new Date(cycle.updatedAt).toLocaleString("ja-JP")}
                  </span>
                )}
                <div className="review-actions">
                  {saved && (
                    <span className="review-saved" role="status">
                      保存しました
                    </span>
                  )}
                  <button
                    type="button"
                    className="review-save-btn"
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
