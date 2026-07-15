import { useState } from "react";
import { AppErrorState } from "../components/AppErrorState";
import { InboxPanel } from "../components/InboxPanel";
import { MonthView } from "../components/MonthView";
import { StorageNotice } from "../components/StorageNotice";
import { WeekView } from "../components/WeekView";
import { WeeklyCyclePanel } from "../components/WeeklyCyclePanel";
import { inboxItems, useTasks } from "../hooks/useTasks";
import { cn, ui } from "../styles";
import { DateU } from "../utils/date";

type WeekLayout = "columns" | "focus" | "rows";
type SidePanel = "inbox" | "cycle";

export function CalendarPage() {
  const ctx = useTasks();
  const [view, setView] = useState<"week" | "month">("week");
  const [layout] = useState<WeekLayout>("columns");
  const [anchor, setAnchor] = useState(() => DateU.today());
  const [showWeekend, setShowWeekend] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel | null>(null);

  const weekStart = DateU.startOfWeek(anchor);
  const currentWeek = DateU.isoWeek(weekStart);
  const monthAnchor =
    view === "month"
      ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      : anchor;
  const inboxTasks = inboxItems(ctx.tasks);
  const inboxOpenCount = inboxTasks.filter((task) => !task.doneAt).length;

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
    return <div className="p-8 text-[var(--ink-soft)]">読み込み中…</div>;
  if (ctx.error) return <AppErrorState error={ctx.error} />;

  return (
    <div className="flex h-full flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--hair)] bg-[var(--surface)] px-[26px] py-3.5 shadow-[0_1px_0_rgba(16,24,40,0.02)] max-[760px]:grid-cols-1 max-[760px]:justify-items-start max-[760px]:gap-2.5 max-[760px]:px-[18px] max-[760px]:py-3">
        <div className="flex items-baseline gap-[9px]">
          <span className="brand-mark text-xl font-bold tracking-[0.04em]">
            shirube
          </span>
          <StorageNotice />
        </div>

        <span className="min-w-[170px] justify-self-center text-center font-[var(--num)] text-[15px] font-medium tracking-[0.02em] max-[760px]:min-w-0 max-[760px]:justify-self-start">
          {view === "week"
            ? DateU.fmtWeek(weekStart)
            : DateU.fmtMonth(monthAnchor)}
        </span>

        <div className="flex items-center justify-self-end gap-6 max-[760px]:flex-wrap max-[760px]:justify-self-start">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={cn(
                ui.navIconButton,
                "h-[30px] w-[30px] rounded-md text-[18px] leading-none",
              )}
              onClick={goPrev}
              aria-label="前へ"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              >
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
            </button>
            <button
              type="button"
              className={cn(
                "flex h-[30px] flex-none items-center rounded-md border border-[var(--hair)] bg-[var(--surface-2)] p-0.5 text-xs text-[var(--ink-faint)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)]",
              )}
              onClick={goToday}
            >
              <span className="flex h-[26px] items-center whitespace-nowrap rounded-[4px] px-[10.5px] leading-none">
                今日
              </span>
            </button>
            <button
              type="button"
              className={cn(
                ui.navIconButton,
                "h-[30px] w-[30px] rounded-md text-[18px] leading-none",
              )}
              onClick={goNext}
              aria-label="次へ"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
              >
                <path d="m6 3.5 4.5 4.5L6 12.5" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className={cn(
                "flex h-[30px] flex-none items-center rounded-md border border-[var(--hair)] bg-[var(--surface-2)] p-0.5 text-xs text-[var(--ink-faint)] transition-all duration-150",
                showWeekend
                  ? "hover:border-[var(--hair)]"
                  : "hover:border-[var(--accent)] hover:text-[var(--accent)]",
              )}
              onClick={() => setShowWeekend((v) => !v)}
              title="週末の表示切替"
            >
              <span
                className={cn(
                  "flex h-[26px] items-center rounded-[4px] px-[10.5px] leading-none",
                  "whitespace-nowrap",
                  showWeekend && "accent-fill bg-[var(--accent)] text-white",
                )}
              >
                土日
              </span>
            </button>
            <div className={cn(ui.segmentGroup, "h-[30px] items-center")}>
              <button
                type="button"
                className={cn(
                  ui.segmentButton,
                  "flex h-[26px] items-center px-4 py-0",
                  view === "week" && ui.segmentButtonActive,
                )}
                data-active={view === "week" ? "true" : "false"}
                onClick={() => setView("week")}
              >
                週
              </button>
              <button
                type="button"
                className={cn(
                  ui.segmentButton,
                  "flex h-[26px] items-center px-4 py-0",
                  view === "month" && ui.segmentButtonActive,
                )}
                data-active={view === "month" ? "true" : "false"}
                onClick={() => {
                  setView("month");
                  if (sidePanel === "cycle") setSidePanel(null);
                }}
              >
                月
              </button>
            </div>
          </div>
        </div>
      </header>

      {ctx.operationError && (
        <div className={cn(ui.alert, "mx-[26px] mt-3")} role="alert">
          {ctx.operationError}
        </div>
      )}
      {ctx.undoState.message && (
        <div
          className={cn(ui.toast, "fixed bottom-8 left-8 z-20")}
          role="status"
        >
          <span className="min-w-0 break-words">{ctx.undoState.message}</span>
          <button
            type="button"
            className={cn(ui.button, ui.buttonCompact)}
            onClick={() => void ctx.undo()}
            disabled={ctx.undoState.undoing}
          >
            Undo
          </button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-hidden px-[26px] py-[18px] max-[760px]:px-[18px]">
        <div
          className={cn(
            "grid h-full min-h-0 gap-x-2.5 gap-y-[18px] max-[860px]:grid-cols-[minmax(0,1fr)] max-[860px]:gap-4",
            sidePanel
              ? "grid-cols-[36px_minmax(220px,280px)_minmax(0,1fr)] max-[860px]:grid-rows-[36px_minmax(180px,30vh)_minmax(0,1fr)]"
              : "grid-cols-[36px_minmax(0,1fr)] max-[860px]:grid-rows-[36px_minmax(0,1fr)]",
          )}
        >
          <nav
            className="flex min-h-0 flex-col items-center gap-2 pt-1 max-[860px]:flex-row max-[860px]:justify-end max-[860px]:pt-0"
            aria-label="補助ツール"
          >
            <button
              type="button"
              className={cn(
                ui.collapseButton,
                "relative",
                sidePanel === "inbox" &&
                  "bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] text-[var(--accent)]",
              )}
              aria-describedby="inbox-task-count"
              aria-label={
                sidePanel === "inbox"
                  ? "日付未設定を最小化"
                  : "日付未設定を開く"
              }
              title="日付未設定"
              onClick={() =>
                setSidePanel((current) =>
                  current === "inbox" ? null : "inbox",
                )
              }
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const id = Number(event.dataTransfer.getData("text/todo-id"));
                if (id) ctx.moveTo(id, null);
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 18 18"
                className="h-[17px] w-[17px]"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.45"
              >
                <path d="M3 7.25 4.6 4h8.8L15 7.25v6.25H3V7.25Z" />
                <path d="M3 8h3.25l1 1.75h3.5l1-1.75H15" />
              </svg>
              {inboxOpenCount > 0 && (
                <span
                  className="accent-fill absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 font-[var(--num)] text-[9px] font-medium leading-none text-white ring-2 ring-[var(--paper)]"
                  aria-hidden="true"
                  data-inbox-count
                >
                  {inboxOpenCount}
                </span>
              )}
              <span id="inbox-task-count" className="sr-only">
                未完了{inboxOpenCount}件
              </span>
            </button>
            {view === "week" && (
              <button
                type="button"
                className={cn(
                  ui.collapseButton,
                  sidePanel === "cycle" &&
                    "bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] text-[var(--accent)]",
                )}
                aria-label={
                  sidePanel === "cycle"
                    ? "週次サイクルを最小化"
                    : "週次サイクルを開く"
                }
                title="週次サイクル"
                onClick={() =>
                  setSidePanel((current) =>
                    current === "cycle" ? null : "cycle",
                  )
                }
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 18 18"
                  className="h-[17px] w-[17px]"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.45"
                >
                  <path d="M14.4 6.8A5.75 5.75 0 0 0 4.3 5.1" />
                  <path d="M4.15 2.9v2.4h2.4" />
                  <path d="M3.6 11.2a5.75 5.75 0 0 0 10.1 1.7" />
                  <path d="M13.85 15.1v-2.4h-2.4" />
                </svg>
              </button>
            )}
          </nav>
          {sidePanel === "inbox" && (
            <InboxPanel
              tasks={inboxTasks}
              collapsed={false}
              onAdd={(text) => ctx.add(null, text)}
              onToggle={ctx.toggle}
              onRemove={ctx.remove}
              onEdit={ctx.edit}
              onMoveToDate={ctx.moveTo}
              onToggleCollapsed={() => setSidePanel(null)}
              showWeekend={showWeekend}
              showToggle={false}
            />
          )}
          {view === "week" && (
            <div
              className={sidePanel === "cycle" ? "contents" : "hidden"}
              hidden={sidePanel !== "cycle"}
            >
              <WeeklyCyclePanel
                week={currentWeek}
                collapsed={false}
                onToggleCollapsed={() => setSidePanel(null)}
                showToggle={false}
              />
            </div>
          )}
          <div
            className="min-h-0 min-w-0 overflow-hidden rounded-md border border-[var(--hair)] bg-[var(--surface)]"
            data-calendar-main
          >
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
          </div>
        </div>
      </main>
    </div>
  );
}
