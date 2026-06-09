import { http, HttpResponse } from "msw";
import type { Goal } from "../api/goals";
import type { Review } from "../api/reviews";
import type { Task } from "../api/tasks";

const now = () => new Date().toISOString();

let tasks: Task[] = [];
let goals: Goal[] = [];
let reviews: Review[] = [];

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
	id: 1,
	title: "テストタスク",
	date: "2026-06-01",
	doneAt: null,
	deletedAt: null,
	createdAt: "2026-06-01T00:00:00.000Z",
	...overrides,
});

export const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
	id: 1,
	title: "テスト目標",
	doneAt: null,
	deletedAt: null,
	createdAt: "2026-06-01T00:00:00.000Z",
	...overrides,
});

export const makeReview = (overrides: Partial<Review> = {}): Review => ({
	id: 1,
	week: "2026-W23",
	content: "テスト振り返り",
	createdAt: "2026-06-01T00:00:00.000Z",
	updatedAt: "2026-06-01T00:00:00.000Z",
	...overrides,
});

export function setMockTasks(nextTasks: Task[]) {
	tasks = [...nextTasks];
}

export function setMockGoals(nextGoals: Goal[]) {
	goals = [...nextGoals];
}

export function setMockReviews(nextReviews: Review[]) {
	reviews = [...nextReviews];
}

export function resetMockData() {
	tasks = [];
	goals = [];
	reviews = [];
}

function nextId(items: Array<{ id: number }>) {
	return Math.max(0, ...items.map((item) => item.id)) + 1;
}

export const handlers = [
	http.get("/api/tasks", ({ request }) => {
		const date = new URL(request.url).searchParams.get("date");
		const result = tasks.filter(
			(task) => !task.deletedAt && (!date || task.date === date),
		);
		return HttpResponse.json(result);
	}),
	http.post("/api/tasks", async ({ request }) => {
		const body = (await request.json()) as { title?: string; date?: string };
		if (!body.title)
			return HttpResponse.json({ error: "title is required" }, { status: 400 });
		const task = makeTask({
			id: nextId(tasks),
			title: body.title,
			date: body.date ?? now().slice(0, 10),
			createdAt: now(),
		});
		tasks = [...tasks, task];
		return HttpResponse.json(task, { status: 201 });
	}),
	http.patch("/api/tasks/:id", async ({ params, request }) => {
		const id = Number(params.id);
		if (Number.isNaN(id))
			return HttpResponse.json({ error: "Invalid id" }, { status: 400 });
		const body = (await request.json()) as {
			doneAt?: string | null;
			title?: string;
			date?: string;
		};
		const updates: { doneAt?: string | null; title?: string; date?: string } =
			{};
		if ("doneAt" in body) updates.doneAt = body.doneAt ?? null;
		if (body.title !== undefined) updates.title = body.title;
		if (body.date !== undefined) updates.date = body.date;
		if (Object.keys(updates).length === 0) {
			return HttpResponse.json(
				{ error: "No fields to update" },
				{ status: 400 },
			);
		}
		const task = tasks.find((item) => item.id === id && !item.deletedAt);
		if (!task)
			return HttpResponse.json({ error: "Not found" }, { status: 404 });
		const updated = { ...task, ...updates };
		tasks = tasks.map((item) => (item.id === id ? updated : item));
		return HttpResponse.json(updated);
	}),
	http.delete("/api/tasks/:id", ({ params }) => {
		const id = Number(params.id);
		if (Number.isNaN(id))
			return HttpResponse.json({ error: "Invalid id" }, { status: 400 });
		const task = tasks.find((item) => item.id === id && !item.deletedAt);
		if (!task)
			return HttpResponse.json({ error: "Not found" }, { status: 404 });
		const deleted = { ...task, deletedAt: now() };
		tasks = tasks.map((item) => (item.id === id ? deleted : item));
		return HttpResponse.json(deleted);
	}),

	http.get("/api/goals", ({ request }) => {
		const all = new URL(request.url).searchParams.get("all") === "true";
		const result = goals
			.filter((goal) => !goal.deletedAt && (all || !goal.doneAt))
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return HttpResponse.json(result);
	}),
	http.post("/api/goals", async ({ request }) => {
		const body = (await request.json()) as { title?: string };
		if (!body.title)
			return HttpResponse.json({ error: "title is required" }, { status: 400 });
		const goal = makeGoal({
			id: nextId(goals),
			title: body.title,
			createdAt: now(),
		});
		goals = [goal, ...goals];
		return HttpResponse.json(goal, { status: 201 });
	}),
	http.patch("/api/goals/:id", async ({ params, request }) => {
		const id = Number(params.id);
		if (Number.isNaN(id))
			return HttpResponse.json({ error: "Invalid id" }, { status: 400 });
		const body = (await request.json()) as { doneAt?: string | null };
		const goal = goals.find((item) => item.id === id && !item.deletedAt);
		if (!goal)
			return HttpResponse.json({ error: "Not found" }, { status: 404 });
		const updated = { ...goal, doneAt: body.doneAt ?? null };
		goals = goals.map((item) => (item.id === id ? updated : item));
		return HttpResponse.json(updated);
	}),
	http.delete("/api/goals/:id", ({ params }) => {
		const id = Number(params.id);
		if (Number.isNaN(id))
			return HttpResponse.json({ error: "Invalid id" }, { status: 400 });
		const goal = goals.find((item) => item.id === id && !item.deletedAt);
		if (!goal)
			return HttpResponse.json({ error: "Not found" }, { status: 404 });
		const deleted = { ...goal, deletedAt: now() };
		goals = goals.map((item) => (item.id === id ? deleted : item));
		return HttpResponse.json(deleted);
	}),

	http.get("/api/reviews", () => {
		const result = [...reviews].sort((a, b) => b.week.localeCompare(a.week));
		return HttpResponse.json(result);
	}),
	http.get("/api/reviews/:week", ({ params }) => {
		const review = reviews.find((item) => item.week === params.week);
		if (!review)
			return HttpResponse.json({ error: "Not found" }, { status: 404 });
		return HttpResponse.json(review);
	}),
	http.put("/api/reviews/:week", async ({ params, request }) => {
		const week = String(params.week);
		const body = (await request.json()) as { content?: string };
		if (!body.content)
			return HttpResponse.json(
				{ error: "content is required" },
				{ status: 400 },
			);
		const existing = reviews.find((item) => item.week === week);
		const review = existing
			? { ...existing, content: body.content, updatedAt: now() }
			: makeReview({
					id: nextId(reviews),
					week,
					content: body.content,
					createdAt: now(),
					updatedAt: now(),
				});
		reviews = existing
			? reviews.map((item) => (item.week === week ? review : item))
			: [...reviews, review];
		return HttpResponse.json(review);
	}),
];
