import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MonthView } from "../components/MonthView";
import { StorageNotice } from "../components/StorageNotice";
import { WeekView } from "../components/WeekView";
import { useTasks } from "../hooks/useTasks";
import { DateU } from "../utils/date";

type WeekLayout = "columns" | "focus" | "rows";

export function CalendarPage() {
  const ctx = useTasks();
  const [view, setView] = useState<"week" | "month">("week");
  const [layout] = useState<WeekLayout>("columns");
  const [anchor, setAnchor] = useState(() => DateU.today());
  const [showWeekend, setShowWeekend] = useState(false);

  const weekStart = DateU.startOfWeek(anchor);
  const monthAnchor =
    view === "month"
      ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      : anchor;

  const goPrev = () =>
    setAnchor(DateU.addDays(anchor, view === "week" ? -7 : -30));
  const goNext = () =>
    setAnchor(DateU.addDays(anchor, view === "week" ? 7 : 30));
  const goToday = () => setAnchor(DateU.today());

  const pickDay = (date: Date) => {
    setAnchor(date);
    setView("week");
  };

  if (ctx.loading)
    return (
      <div style={{ padding: 32, color: "var(--ink-soft)" }}>読み込み中…</div>
    );
  if (ctx.error)
    return (
      <div style={{ padding: 32, color: "var(--accent)" }}>
        エラー: {ctx.error}
      </div>
    );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-name">shirube</span>
          <StorageNotice />
        </div>

        <div className="nav">
          <button
            type="button"
            className="nav-btn"
            onClick={goPrev}
            aria-label="前へ"
          >
            ‹
          </button>
          <span className="nav-range">
            {view === "week"
              ? DateU.fmtWeek(weekStart)
              : DateU.fmtMonth(monthAnchor)}
          </span>
          <button
            type="button"
            className="nav-btn"
            onClick={goNext}
            aria-label="次へ"
          >
            ›
          </button>
          <button type="button" className="today-btn" onClick={goToday}>
            今日
          </button>
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className={`weekend-toggle${showWeekend ? " on" : ""}`}
            onClick={() => setShowWeekend((v) => !v)}
            title="週末の表示切替"
          >
            土日
          </button>
          <div className="viewtoggle">
            <button
              type="button"
              className={`vt${view === "week" ? " on" : ""}`}
              onClick={() => setView("week")}
            >
              週
            </button>
            <button
              type="button"
              className={`vt${view === "month" ? " on" : ""}`}
              onClick={() => setView("month")}
            >
              月
            </button>
          </div>
          <Link to="/review" className="review-nav-link">
            週次サイクル
          </Link>
        </div>
      </header>

      {ctx.operationError && (
        <div className="task-operation-error" role="alert">
          {ctx.operationError}
        </div>
      )}
      {ctx.undoState.message && (
        <div className="ui-toast ui-toast--corner task-undo-bar" role="status">
          <span className="ui-toast__message">{ctx.undoState.message}</span>
          <button
            type="button"
            className="ui-button ui-button--compact task-undo-button"
            onClick={() => void ctx.undo()}
            disabled={ctx.undoState.undoing}
          >
            Undo
          </button>
        </div>
      )}

      <main className="stage">
        {view === "week" ? (
          <WeekView
            weekStart={weekStart}
            ctx={ctx}
            layout={layout}
            showWeekend={showWeekend}
          />
        ) : (
          <MonthView
            monthDate={monthAnchor}
            ctx={ctx}
            onPickDay={pickDay}
            showWeekend={showWeekend}
          />
        )}
      </main>
    </div>
  );
}
