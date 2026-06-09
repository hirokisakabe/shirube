import { and, desc, eq, isNull } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type createDb, goals, reviews, tasks } from "../db/index";

type Db = ReturnType<typeof createDb>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z.string().refine((value) => {
	if (!datePattern.test(value)) return false;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
});
const weekSchema = z.string().regex(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/);
const idParamSchema = z.object({
	id: z.string().regex(/^\d+$/).transform(Number),
});
const weekParamSchema = z.object({ week: weekSchema });
const taskQuerySchema = z.object({ date: dateSchema.optional() });
const taskCreateSchema = z.object({
	title: z.string().min(1),
	date: dateSchema.optional(),
});
const taskUpdateSchema = z.object({
	doneAt: z.string().nullable().optional(),
	title: z.string().min(1).optional(),
	date: dateSchema.optional(),
});
const goalQuerySchema = z.object({ all: z.enum(["true", "false"]).optional() });
const goalCreateSchema = z.object({ title: z.string().min(1) });
const goalUpdateSchema = z.object({ doneAt: z.string().nullable().optional() });
const reviewUpdateSchema = z.object({ content: z.string().min(1) });

type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

function validationError(message: string) {
	return (
		result: { success: boolean },
		c: { json: (body: { error: string }, status: 400) => Response },
	) => {
		if (!result.success) return c.json({ error: message }, 400);
	};
}

function bodyValidationError(requiredField: string, requiredMessage: string) {
	return (
		result: {
			success: boolean;
			error?: { issues: Array<{ path: PropertyKey[] }> };
		},
		c: { json: (body: { error: string }, status: 400) => Response },
	) => {
		if (result.success) return;
		const hasRequiredFieldError = result.error?.issues.some(
			(issue) => issue.path[0] === requiredField,
		);
		return c.json(
			{
				error: hasRequiredFieldError ? requiredMessage : "Invalid request body",
			},
			400,
		);
	};
}

export function createApp(db: Db) {
	return new Hono()
		.get(
			"/api/tasks",
			zValidator("query", taskQuerySchema, validationError("Invalid query")),
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
		.get(
			"/api/tasks/:id",
			zValidator("param", idParamSchema, validationError("Invalid id")),
			async (c) => {
				const { id } = c.req.valid("param");
				const task = await db.query.tasks.findFirst({
					where: and(eq(tasks.id, id), isNull(tasks.deletedAt)),
				});
				if (!task) return c.json({ error: "Not found" }, 404);
				return c.json(task);
			},
		)
		.post(
			"/api/tasks",
			zValidator(
				"json",
				taskCreateSchema,
				bodyValidationError("title", "title is required"),
			),
			async (c) => {
				const body = c.req.valid("json");
				const date = body.date ?? new Date().toISOString().slice(0, 10);
				const [task] = await db
					.insert(tasks)
					.values({ title: body.title, date })
					.returning();
				return c.json(task, 201);
			},
		)
		.patch(
			"/api/tasks/:id",
			zValidator("param", idParamSchema, validationError("Invalid id")),
			zValidator(
				"json",
				taskUpdateSchema,
				validationError("Invalid request body"),
			),
			async (c) => {
				const { id } = c.req.valid("param");
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
		.delete(
			"/api/tasks/:id",
			zValidator("param", idParamSchema, validationError("Invalid id")),
			async (c) => {
				const { id } = c.req.valid("param");
				const [task] = await db
					.update(tasks)
					.set({ deletedAt: new Date().toISOString() })
					.where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
					.returning();
				if (!task) return c.json({ error: "Not found" }, 404);
				return c.json(task);
			},
		)
		.get("/api/reviews", async (c) => {
			const result = await db
				.select()
				.from(reviews)
				.orderBy(desc(reviews.week));
			return c.json(result);
		})
		.get(
			"/api/reviews/:week",
			zValidator("param", weekParamSchema, validationError("Invalid week")),
			async (c) => {
				const { week } = c.req.valid("param");
				const review = await db.query.reviews.findFirst({
					where: eq(reviews.week, week),
				});
				if (!review) return c.json({ error: "Not found" }, 404);
				return c.json(review);
			},
		)
		.put(
			"/api/reviews/:week",
			zValidator("param", weekParamSchema, validationError("Invalid week")),
			zValidator(
				"json",
				reviewUpdateSchema,
				bodyValidationError("content", "content is required"),
			),
			async (c) => {
				const { week } = c.req.valid("param");
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
		.delete(
			"/api/reviews/:week",
			zValidator("param", weekParamSchema, validationError("Invalid week")),
			async (c) => {
				const { week } = c.req.valid("param");
				const existing = await db.query.reviews.findFirst({
					where: eq(reviews.week, week),
				});
				if (!existing) return c.json({ error: "Not found" }, 404);
				await db.delete(reviews).where(eq(reviews.week, week));
				return c.json(existing);
			},
		)
		.get(
			"/api/goals",
			zValidator("query", goalQuerySchema, validationError("Invalid query")),
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
		.get(
			"/api/goals/:id",
			zValidator("param", idParamSchema, validationError("Invalid id")),
			async (c) => {
				const { id } = c.req.valid("param");
				const goal = await db.query.goals.findFirst({
					where: and(eq(goals.id, id), isNull(goals.deletedAt)),
				});
				if (!goal) return c.json({ error: "Not found" }, 404);
				return c.json(goal);
			},
		)
		.post(
			"/api/goals",
			zValidator(
				"json",
				goalCreateSchema,
				bodyValidationError("title", "title is required"),
			),
			async (c) => {
				const body = c.req.valid("json");
				const [goal] = await db
					.insert(goals)
					.values({ title: body.title })
					.returning();
				return c.json(goal, 201);
			},
		)
		.patch(
			"/api/goals/:id",
			zValidator("param", idParamSchema, validationError("Invalid id")),
			zValidator(
				"json",
				goalUpdateSchema,
				validationError("Invalid request body"),
			),
			async (c) => {
				const { id } = c.req.valid("param");
				const body = c.req.valid("json");
				if (!("doneAt" in body)) {
					return c.json({ error: "No fields to update" }, 400);
				}
				const [goal] = await db
					.update(goals)
					.set({ doneAt: body.doneAt ?? null })
					.where(and(eq(goals.id, id), isNull(goals.deletedAt)))
					.returning();
				if (!goal) return c.json({ error: "Not found" }, 404);
				return c.json(goal);
			},
		)
		.delete(
			"/api/goals/:id",
			zValidator("param", idParamSchema, validationError("Invalid id")),
			async (c) => {
				const { id } = c.req.valid("param");
				const [goal] = await db
					.update(goals)
					.set({ deletedAt: new Date().toISOString() })
					.where(and(eq(goals.id, id), isNull(goals.deletedAt)))
					.returning();
				if (!goal) return c.json({ error: "Not found" }, 404);
				return c.json(goal);
			},
		);
}

export type AppType = ReturnType<typeof createApp>;
