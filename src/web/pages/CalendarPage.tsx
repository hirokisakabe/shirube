import { useState } from "react";
import { InboxPanel } from "../components/InboxPanel";
import { MonthView } from "../components/MonthView";
import { StorageNotice } from "../components/StorageNotice";
import { WeekView } from "../components/WeekView";
import { WeeklyCyclePanel } from "../components/WeeklyCyclePanel";
import { inboxItems, useTasks } from "../hooks/useTasks";
import { cn, ui } from "../styles";
import { DateU } from "../utils/date";

type WeekLayout = "columns" | "focus" | "rows";

export function CalendarPage() {
  const ctx = useTasks();
  const [view, setView] = useState<"week" | "month">("week");
  const [layout] = useState<WeekLayout>("columns");
  const [anchor, setAnchor] = useState(() => DateU.today());
  const [showWeekend, setShowWeekend] = useState(false);
  const [inboxCollapsed, setInboxCollapsed] = useState(false);
  const [cyclePanelCollapsed, setCyclePanelCollapsed] = useState(true);

  const weekStart = DateU.startOfWeek(anchor);
  const currentWeek = DateU.isoWeek(weekStart);
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
    return <div className="p-8 text-[var(--ink-soft)]">読み込み中…</div>;
  if (ctx.error)
    return <div className="p-8 text-[var(--accent)]">エラー: {ctx.error}</div>;

  return (
    <div className="flex h-full flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--hair)] bg-[var(--surface)] px-[26px] py-3.5 max-[760px]:grid-cols-1 max-[760px]:justify-items-start max-[760px]:gap-2.5 max-[760px]:px-[18px] max-[760px]:py-3">
        <div className="flex items-baseline gap-[9px]">
          <span className="text-xl font-bold tracking-[0.04em]">shirube</span>
          <StorageNotice />
        </div>

        <div className="flex items-center justify-self-center gap-2 max-[760px]:justify-self-start">
          <button
            type="button"
            className={ui.navIconButton}
            onClick={goPrev}
            aria-label="前へ"
          >
            ‹
          </button>
          <span className="min-w-[170px] text-center font-[var(--num)] text-[15px] font-medium tracking-[0.02em] max-[760px]:min-w-[150px]">
            {view === "week"
              ? DateU.fmtWeek(weekStart)
              : DateU.fmtMonth(monthAnchor)}
          </span>
          <button
            type="button"
            className={ui.navIconButton}
            onClick={goNext}
            aria-label="次へ"
          >
            ›
          </button>
          <button
            type="button"
            className={cn(ui.subtleButton, "ml-1.5 text-[var(--ink-soft)]")}
            onClick={goToday}
          >
            今日
          </button>
        </div>

        <div className="flex items-center justify-self-end gap-2.5 max-[760px]:flex-wrap max-[760px]:justify-self-start">
          <button
            type="button"
            className={cn(
              ui.subtleButton,
              showWeekend && "border-[var(--ink-faint)] text-[var(--ink-soft)]",
            )}
            onClick={() => setShowWeekend((v) => !v)}
            title="週末の表示切替"
          >
            土日
          </button>
          <div className={ui.segmentGroup}>
            <button
              type="button"
              className={cn(
                ui.segmentButton,
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
                view === "month" && ui.segmentButtonActive,
              )}
              data-active={view === "month" ? "true" : "false"}
              onClick={() => setView("month")}
            >
              月
            </button>
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

      <main className="min-h-0 flex-1 overflow-hidden px-[26px] pb-[26px] pt-[18px] max-[760px]:px-[18px] max-[760px]:pb-[18px]">
        <div
          className={cn(
            "grid h-full min-h-0 gap-[18px] max-[860px]:grid-cols-[minmax(0,1fr)] max-[860px]:gap-4",
            view === "week" && inboxCollapsed
              ? cyclePanelCollapsed
                ? "grid-cols-[36px_minmax(0,1fr)_36px] max-[860px]:grid-rows-[54px_minmax(0,1fr)_54px]"
                : "grid-cols-[36px_minmax(0,1fr)_minmax(220px,260px)] max-[860px]:grid-rows-[54px_minmax(0,1fr)_minmax(260px,34vh)]"
              : view === "week"
                ? cyclePanelCollapsed
                  ? "grid-cols-[minmax(220px,280px)_minmax(0,1fr)_36px] max-[860px]:grid-rows-[minmax(180px,30vh)_minmax(0,1fr)_54px]"
                  : "grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(220px,260px)] max-[860px]:grid-rows-[minmax(180px,30vh)_minmax(0,1fr)_minmax(260px,34vh)]"
                : inboxCollapsed
                  ? "grid-cols-[36px_minmax(0,1fr)] max-[860px]:grid-rows-[54px_minmax(0,1fr)]"
                  : "grid-cols-[minmax(220px,280px)_minmax(0,1fr)] max-[860px]:grid-rows-[minmax(180px,30vh)_minmax(0,1fr)]",
          )}
        >
          <InboxPanel
            tasks={inboxItems(ctx.tasks)}
            collapsed={inboxCollapsed}
            onAdd={(text) => ctx.add(null, text)}
            onToggle={ctx.toggle}
            onRemove={ctx.remove}
            onEdit={ctx.edit}
            onMoveToDate={ctx.moveTo}
            onToggleCollapsed={() => setInboxCollapsed((value) => !value)}
          />
          <div className="min-h-0 min-w-0" data-calendar-main>
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
          {view === "week" && (
            <WeeklyCyclePanel
              week={currentWeek}
              collapsed={cyclePanelCollapsed}
              onToggleCollapsed={() =>
                setCyclePanelCollapsed((value) => !value)
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}
