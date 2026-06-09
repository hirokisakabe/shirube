import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { type createDb, goals, reviews, tasks } from "../db/index";

type Db = ReturnType<typeof createDb>;
type TaskCreateInput = { title: string; date?: string };
type TaskUpdateInput = { doneAt?: string | null; title?: string; date?: string };
type GoalCreateInput = { title: string };
type GoalUpdateInput = { doneAt?: string | null };
type ReviewUpdateInput = { content: string };

function parseJsonBody<T extends Record<string, unknown>>(value: unknown): T | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? value as T
		: null;
}

export function createApp(db: Db) {
	return new Hono()
		.get(
			"/api/tasks",
			validator("query", (value) => ({ date: value.date as string | undefined })),
			async (c) => {
				const { date } = c.req.valid("query");
				const result = await db
					.select()
					.from(tasks)
					.where(
						date
							? and(isNull(tasks.deletedAt), eq(tasks.date, date))
							: isNull(tasks.deletedAt),
					);
				return c.json(result);
			},
		)
		.get("/api/tasks/:id", async (c) => {
			const id = Number(c.req.param("id"));
			if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, id), isNull(tasks.deletedAt)),
			});
			if (!task) return c.json({ error: "Not found" }, 404);
			return c.json(task);
		})
		.post(
			"/api/tasks",
			validator("json", (value, c) => {
				const body = parseJsonBody<TaskCreateInput>(value);
				if (!body?.title) return c.json({ error: "title is required" }, 400);
				return body;
			}),
			async (c) => {
				const body = c.req.valid("json");
				const date = body.date ?? new Date().toISOString().slice(0, 10);
				const [task] = await db.insert(tasks).values({ title: body.title, date }).returning();
				return c.json(task, 201);
			},
		)
		.patch(
			"/api/tasks/:id",
			validator("json", (value) => parseJsonBody<TaskUpdateInput>(value) ?? {}),
			async (c) => {
				const id = Number(c.req.param("id"));
				if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
				const body = c.req.valid("json");
				const set: TaskUpdateInput = {};
				if ("doneAt" in body) set.doneAt = body.doneAt ?? null;
				if (body.title !== undefined) set.title = body.title;
				if (body.date !== undefined) set.date = body.date;
				if (Object.keys(set).length === 0) {
					return c.json({ error: "No fields to update" }, 400);
				}
				const [task] = await db
					.update(tasks)
					.set(set)
					.where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
					.returning();
				if (!task) return c.json({ error: "Not found" }, 404);
				return c.json(task);
			},
		)
		.delete("/api/tasks/:id", async (c) => {
			const id = Number(c.req.param("id"));
			if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
			const [task] = await db
				.update(tasks)
				.set({ deletedAt: new Date().toISOString() })
				.where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
				.returning();
			if (!task) return c.json({ error: "Not found" }, 404);
			return c.json(task);
		})
		.get("/api/reviews", async (c) => {
			const result = await db.select().from(reviews).orderBy(desc(reviews.week));
			return c.json(result);
		})
		.get("/api/reviews/:week", async (c) => {
			const week = c.req.param("week");
			const review = await db.query.reviews.findFirst({ where: eq(reviews.week, week) });
			if (!review) return c.json({ error: "Not found" }, 404);
			return c.json(review);
		})
		.put(
			"/api/reviews/:week",
			validator("json", (value, c) => {
				const body = parseJsonBody<ReviewUpdateInput>(value);
				if (!body?.content) return c.json({ error: "content is required" }, 400);
				return body;
			}),
			async (c) => {
				const week = c.req.param("week");
				const body = c.req.valid("json");
				const [review] = await db
					.insert(reviews)
					.values({ week, content: body.content })
					.onConflictDoUpdate({
						target: reviews.week,
						set: { content: body.content, updatedAt: new Date().toISOString() },
					})
					.returning();
				return c.json(review);
			},
		)
		.delete("/api/reviews/:week", async (c) => {
			const week = c.req.param("week");
			const existing = await db.query.reviews.findFirst({ where: eq(reviews.week, week) });
			if (!existing) return c.json({ error: "Not found" }, 404);
			await db.delete(reviews).where(eq(reviews.week, week));
			return c.json(existing);
		})
		.get(
			"/api/goals",
			validator("query", (value) => ({ all: value.all as string | undefined })),
			async (c) => {
				const all = c.req.valid("query").all === "true";
				const result = await db
					.select()
					.from(goals)
					.where(
						all
							? isNull(goals.deletedAt)
							: and(isNull(goals.deletedAt), isNull(goals.doneAt)),
					)
					.orderBy(desc(goals.createdAt));
				return c.json(result);
			},
		)
		.get("/api/goals/:id", async (c) => {
			const id = Number(c.req.param("id"));
			if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
			const goal = await db.query.goals.findFirst({
				where: and(eq(goals.id, id), isNull(goals.deletedAt)),
			});
			if (!goal) return c.json({ error: "Not found" }, 404);
			return c.json(goal);
		})
		.post(
			"/api/goals",
			validator("json", (value, c) => {
				const body = parseJsonBody<GoalCreateInput>(value);
				if (!body?.title) return c.json({ error: "title is required" }, 400);
				return body;
			}),
			async (c) => {
				const body = c.req.valid("json");
				const [goal] = await db.insert(goals).values({ title: body.title }).returning();
				return c.json(goal, 201);
			},
		)
		.patch(
			"/api/goals/:id",
			validator("json", (value) => parseJsonBody<GoalUpdateInput>(value) ?? {}),
			async (c) => {
				const id = Number(c.req.param("id"));
				if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
				const body = c.req.valid("json");
				const [goal] = await db
					.update(goals)
					.set({ doneAt: body.doneAt ?? null })
					.where(and(eq(goals.id, id), isNull(goals.deletedAt)))
					.returning();
				if (!goal) return c.json({ error: "Not found" }, 404);
				return c.json(goal);
			},
		)
		.delete("/api/goals/:id", async (c) => {
			const id = Number(c.req.param("id"));
			if (Number.isNaN(id)) return c.json({ error: "Invalid id" }, 400);
			const [goal] = await db
				.update(goals)
				.set({ deletedAt: new Date().toISOString() })
				.where(and(eq(goals.id, id), isNull(goals.deletedAt)))
				.returning();
			if (!goal) return c.json({ error: "Not found" }, 404);
			return c.json(goal);
		});
}

export type AppType = ReturnType<typeof createApp>;
