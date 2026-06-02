import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useReviews, useWeekReview } from "../hooks/useReviews";
import { DateU } from "../utils/date";

export function ReviewPage() {
  const [currentWeek, setCurrentWeek] = useState(() => DateU.isoWeek());
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { review, loading: loadingWeek, saving, save } = useWeekReview(currentWeek);
  const { reviews, loading: loadingList, reload } = useReviews();

  useEffect(() => {
    setDraft(review?.content ?? "");
  }, [review]);

  const handleSave = async () => {
    const result = await save(draft);
    if (result) {
      setSaved(true);
      void reload();
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    }
  };

  const isCurrentWeek = currentWeek === DateU.isoWeek();
  const isDirty = draft !== (review?.content ?? "");

  const pastReviews = reviews.filter((r) => r.week !== currentWeek);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-name">shirube</span>
          <span className="brand-sub">振り返り</span>
        </div>

        <div className="nav">
          <button
            className="nav-btn"
            onClick={() => setCurrentWeek((w) => DateU.addWeeks(w, -1))}
            aria-label="前の週"
          >
            ‹
          </button>
          <span className="nav-range">{DateU.fmtIsoWeek(currentWeek)}</span>
          <button
            className="nav-btn"
            onClick={() => setCurrentWeek((w) => DateU.addWeeks(w, 1))}
            aria-label="次の週"
          >
            ›
          </button>
          {!isCurrentWeek && (
            <button className="today-btn" onClick={() => setCurrentWeek(DateU.isoWeek())}>
              今週
            </button>
          )}
        </div>

        <div className="topbar-right">
          <Link to="/" className="review-nav-link">カレンダー</Link>
        </div>
      </header>

      <main className="review-main">
        <section className="review-editor-section">
          {loadingWeek ? (
            <div className="review-loading">読み込み中…</div>
          ) : (
            <>
              <textarea
                className="review-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`${DateU.fmtIsoWeek(currentWeek)}の振り返りを記録しましょう…`}
              />
              <div className="review-footer">
                {review?.updatedAt && (
                  <span className="review-updated">
                    最終更新: {new Date(review.updatedAt).toLocaleString("ja-JP")}
                  </span>
                )}
                <div className="review-actions">
                  {saved && <span className="review-saved">保存しました</span>}
                  <button
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
          <h2 className="review-history-title">過去の振り返り</h2>
          {loadingList ? (
            <div className="review-loading">読み込み中…</div>
          ) : pastReviews.length === 0 ? (
            <p className="review-empty">過去の振り返りはありません</p>
          ) : (
            <ul className="review-list">
              {pastReviews.map((r) => (
                <li key={r.week} className="review-item">
                  <button
                    className="review-item-header"
                    onClick={() => setExpandedWeek(expandedWeek === r.week ? null : r.week)}
                  >
                    <span className="review-item-week">{DateU.fmtIsoWeek(r.week)}</span>
                    <span className="review-item-preview">
                      {expandedWeek === r.week ? "" : r.content.split("\n")[0]?.slice(0, 60)}
                    </span>
                    <span className="review-item-toggle">{expandedWeek === r.week ? "▲" : "▼"}</span>
                  </button>
                  {expandedWeek === r.week && (
                    <pre className="review-item-content">{r.content}</pre>
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
