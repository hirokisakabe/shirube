import { useState } from "react";
import type { Task } from "../api/tasks";
import { DateU, WEEKDAYS_JP } from "../utils/date";
import { AddInput } from "./AddInput";
import { TodoItem } from "./TodoItem";
import { dayItems, dayStats } from "../hooks/useTasks";

type Ctx = {
	tasks: Task[];
	add: (date: string, text: string) => void;
	toggle: (id: number) => void;
	remove: (id: number) => void;
	edit: (id: number, text: string) => void;
	moveTo: (id: number, date: string) => void;
};

type Props = {
	weekStart: Date;
	ctx: Ctx;
	layout: "columns" | "focus" | "rows";
	showWeekend: boolean;
};

function DropZone({
	dateKey,
	onMove,
	className,
	children,
	style,
	onClick,
}: {
	dateKey: string;
	onMove: (id: number, date: string) => void;
	className: string;
	children: React.ReactNode;
	style?: React.CSSProperties;
	onClick?: () => void;
}) {
	const [over, setOver] = useState(false);
	return (
		<div
			className={className + (over ? " drop-over" : "")}
			style={style}
			onClick={onClick}
			onDragOver={(e) => {
				e.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setOver(false);
				const id = Number(e.dataTransfer.getData("text/todo-id"));
				if (id) onMove(id, dateKey);
			}}
		>
			{children}
		</div>
	);
}

function DayHead({ date }: { date: Date }) {
	const dow = DateU.dowMon(date);
	const isToday = DateU.isToday(date);
	const cls = `dayhead${isToday ? " today" : ""}${dow === 6 ? " sun" : ""}${dow === 5 ? " sat" : ""}`;
	return (
		<div className={cls}>
			<span className="dow">{WEEKDAYS_JP[dow]}</span>
			<span className="dnum">{date.getDate()}</span>
			{isToday && <span className="today-dot" />}
		</div>
	);
}

export function WeekView({ weekStart, ctx, layout, showWeekend }: Props) {
	const dayCount = showWeekend ? 7 : 5;
	const days = Array.from({ length: dayCount }, (_, i) =>
		DateU.addDays(weekStart, i),
	);

	const renderItems = (date: Date) => {
		const k = DateU.key(date);
		return dayItems(ctx.tasks, k).map((t) => (
			<TodoItem
				key={t.id}
				todo={t}
				onToggle={ctx.toggle}
				onRemove={ctx.remove}
				onEdit={ctx.edit}
			/>
		));
	};

	// ----- A: equal columns -----
	if (layout === "columns") {
		return (
			<div
				className="wk wk-columns"
				style={{ gridTemplateColumns: `repeat(${dayCount},1fr)` }}
			>
				{days.map((date) => {
					const k = DateU.key(date);
					const dim = DateU.isPast(date);
					return (
						<DropZone
							key={k}
							dateKey={k}
							onMove={ctx.moveTo}
							className={`col${dim ? " dim" : ""}${DateU.isToday(date) ? " col-today" : ""}`}
						>
							<DayHead date={date} />
							<div className="col-body">
								{renderItems(date)}
								<AddInput onAdd={(text) => ctx.add(k, text)} />
							</div>
						</DropZone>
					);
				})}
			</div>
		);
	}

	// ----- B: today emphasized -----
	if (layout === "focus") {
		return (
			<div className="wk wk-focus">
				{days.map((date) => {
					const k = DateU.key(date);
					const today = DateU.isToday(date);
					const dim = DateU.isPast(date);
					return (
						<DropZone
							key={k}
							dateKey={k}
							onMove={ctx.moveTo}
							className={`col${today ? " col-today" : ""}${dim ? " dim" : ""}`}
						>
							<DayHead date={date} />
							<div className="col-body">
								{renderItems(date)}
								<AddInput
									onAdd={(text) => ctx.add(k, text)}
									placeholder={today ? "今日のタスクを追加" : "追加"}
								/>
							</div>
						</DropZone>
					);
				})}
			</div>
		);
	}

	// ----- C: horizontal rows -----
	return (
		<div className="wk wk-rows">
			{days.map((date) => {
				const k = DateU.key(date);
				const today = DateU.isToday(date);
				const dim = DateU.isPast(date);
				const st = dayStats(ctx.tasks, k);
				const dow = DateU.dowMon(date);
				return (
					<DropZone
						key={k}
						dateKey={k}
						onMove={ctx.moveTo}
						className={`row${today ? " row-today" : ""}${dim ? " dim" : ""}`}
					>
						<div
							className={`row-head${dow === 6 ? " sun" : ""}${dow === 5 ? " sat" : ""}`}
						>
							<span className="row-dow">{WEEKDAYS_JP[dow]}</span>
							<span className="row-dnum">{date.getDate()}</span>
							{today && <span className="row-today-tag">今日</span>}
							{st.total > 0 && (
								<span className="row-frac">
									{st.done}/{st.total}
								</span>
							)}
						</div>
						<div className="row-body">
							{renderItems(date)}
							<AddInput onAdd={(text) => ctx.add(k, text)} />
						</div>
					</DropZone>
				);
			})}
		</div>
	);
}
