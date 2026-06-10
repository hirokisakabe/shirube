import { Link } from "@tanstack/react-router";
import { AddInput } from "../components/AddInput";
import { StorageNotice } from "../components/StorageNotice";
import { useGoals } from "../hooks/useGoals";

export function GoalPage() {
  const {
    goals,
    loading,
    error,
    showAchieved,
    toggleShowAchieved,
    add,
    toggle,
    remove,
  } = useGoals();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-name">shirube</span>
          <span className="brand-sub">目標</span>
          <StorageNotice />
        </div>

        <div className="nav">
          <button
            type="button"
            className={`weekend-toggle${showAchieved ? " on" : ""}`}
            onClick={toggleShowAchieved}
          >
            達成済みを表示
          </button>
        </div>

        <div className="topbar-right">
          <Link to="/" className="review-nav-link">
            カレンダー
          </Link>
          <Link to="/review" className="review-nav-link">
            振り返り
          </Link>
        </div>
      </header>

      <main className="goal-main">
        {error && <div className="review-error">エラー: {error}</div>}
        {loading ? (
          <div className="review-loading">読み込み中…</div>
        ) : (
          <div className="goal-list">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className={`todo${goal.doneAt ? " done" : ""}`}
              >
                <button
                  type="button"
                  className="check"
                  aria-label={goal.doneAt ? "未達成に戻す" : "達成済みにする"}
                  onClick={() => toggle(goal.id)}
                >
                  <span className="check-mark" />
                </button>
                <span className="todo-text" title={goal.title}>
                  {goal.title}
                </span>
                <span className="todo-actions">
                  <button
                    type="button"
                    className="act"
                    title="削除"
                    onClick={() => remove(goal.id)}
                  >
                    ×
                  </button>
                </span>
              </div>
            ))}
            {goals.length === 0 && (
              <p className="review-empty">目標がありません</p>
            )}
            <AddInput onAdd={add} placeholder="目標を追加" />
          </div>
        )}
      </main>
    </div>
  );
}
