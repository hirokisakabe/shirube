import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { StorageNotice } from "../components/StorageNotice";
import { useWeeklyCycle, useWeeklyCycles } from "../hooks/useWeeklyCycles";
import { DateU } from "../utils/date";

export function ReviewPage() {
  const [currentWeek, setCurrentWeek] = useState(() => DateU.isoWeek());
  const [goalDraft, setGoalDraft] = useState("");
  const [reviewDraft, setReviewDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    cycle,
    loading: loadingWeek,
    saving,
    error: weekError,
    save,
  } = useWeeklyCycle(currentWeek);
  const {
    cycles,
    loading: loadingList,
    error: listError,
    reload,
  } = useWeeklyCycles();

  useEffect(() => {
    setGoalDraft(cycle?.goalContent ?? "");
    setReviewDraft(cycle?.reviewContent ?? "");
  }, [cycle]);

  const handleSave = async () => {
    const result = await save({
      goalContent: goalDraft,
      reviewContent: reviewDraft,
    });
    if (result) {
      setSaved(true);
      void reload();
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    }
  };

  const isCurrentWeek = currentWeek === DateU.isoWeek();
  const isDirty =
    goalDraft !== (cycle?.goalContent ?? "") ||
    reviewDraft !== (cycle?.reviewContent ?? "");

  const pastCycles = cycles.filter((item) => item.week !== currentWeek);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-name">shirube</span>
          <span className="brand-sub">週次サイクル</span>
          <StorageNotice />
        </div>

        <div className="nav">
          <button
            type="button"
            className="nav-btn"
            onClick={() => setCurrentWeek((w) => DateU.addWeeks(w, -1))}
            aria-label="前の週"
          >
            ‹
          </button>
          <span className="nav-range">{DateU.fmtIsoWeek(currentWeek)}</span>
          <button
            type="button"
            className="nav-btn"
            onClick={() => setCurrentWeek((w) => DateU.addWeeks(w, 1))}
            aria-label="次の週"
          >
            ›
          </button>
          {!isCurrentWeek && (
            <button
              type="button"
              className="today-btn"
              onClick={() => setCurrentWeek(DateU.isoWeek())}
            >
              今週
            </button>
          )}
        </div>

        <div className="topbar-right">
          <Link to="/" className="review-nav-link">
            カレンダー
          </Link>
        </div>
      </header>

      <main className="review-main">
        <section className="review-editor-section">
          {weekError && <div className="review-error">エラー: {weekError}</div>}
          {loadingWeek ? (
            <div className="review-loading">読み込み中…</div>
          ) : (
            <>
              <div className="cycle-editor-grid">
                <label className="cycle-editor-field">
                  <span className="cycle-editor-label">目標</span>
                  <textarea
                    className="review-textarea cycle-textarea"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    placeholder={`${DateU.fmtIsoWeek(currentWeek)}の目標を記録`}
                  />
                </label>
                <label className="cycle-editor-field">
                  <span className="cycle-editor-label">振り返り</span>
                  <textarea
                    className="review-textarea cycle-textarea"
                    value={reviewDraft}
                    onChange={(e) => setReviewDraft(e.target.value)}
                    placeholder={`${DateU.fmtIsoWeek(currentWeek)}の振り返りを記録`}
                  />
                </label>
              </div>
              <div className="review-footer">
                {cycle?.updatedAt && (
                  <span className="review-updated">
                    最終更新:{" "}
                    {new Date(cycle.updatedAt).toLocaleString("ja-JP")}
                  </span>
                )}
                <div className="review-actions">
                  {saved && <span className="review-saved">保存しました</span>}
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
        </section>

        <section className="review-history-section">
          <h2 className="review-history-title">過去の週次サイクル</h2>
          {listError && <div className="review-error">エラー: {listError}</div>}
          {loadingList ? (
            <div className="review-loading">読み込み中…</div>
          ) : pastCycles.length === 0 ? (
            <p className="review-empty">過去の週次サイクルはありません</p>
          ) : (
            <ul className="review-list">
              {pastCycles.map((item) => (
                <li key={item.week} className="review-item">
                  <button
                    type="button"
                    className="review-item-header"
                    onClick={() =>
                      setExpandedWeek(
                        expandedWeek === item.week ? null : item.week,
                      )
                    }
                  >
                    <span className="review-item-week">
                      {DateU.fmtIsoWeek(item.week)}
                    </span>
                    <span className="review-item-preview">
                      {expandedWeek === item.week
                        ? ""
                        : (item.goalContent || item.reviewContent)
                            .split("\n")[0]
                            ?.slice(0, 60)}
                    </span>
                    <span className="review-item-toggle">
                      {expandedWeek === item.week ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedWeek === item.week && (
                    <div className="cycle-history-content">
                      <span className="cycle-editor-label">目標</span>
                      <pre className="review-item-content">
                        {item.goalContent}
                      </pre>
                      <span className="cycle-editor-label">振り返り</span>
                      <pre className="review-item-content">
                        {item.reviewContent}
                      </pre>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
