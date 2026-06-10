import { and, desc, eq, isNull } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type createDb, tasks, weeklyCycles } from "../db/index";

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
const weeklyCycleCreateSchema = z.object({
  week: weekSchema,
  goalContent: z.string().optional(),
  reviewContent: z.string().optional(),
});
const weeklyCycleUpdateSchema = z.object({
  goalContent: z.string().optional(),
  reviewContent: z.string().optional(),
});
const weeklyCyclePutSchema = z.object({
  goalContent: z.string(),
  reviewContent: z.string(),
});

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
    .get("/api/weekly-cycles", async (c) => {
      const result = await db
        .select()
        .from(weeklyCycles)
        .orderBy(desc(weeklyCycles.week));
      return c.json(result);
    })
    .get(
      "/api/weekly-cycles/:week",
      zValidator("param", weekParamSchema, validationError("Invalid week")),
      async (c) => {
        const { week } = c.req.valid("param");
        const cycle = await db.query.weeklyCycles.findFirst({
          where: eq(weeklyCycles.week, week),
        });
        if (!cycle) return c.json({ error: "Not found" }, 404);
        return c.json(cycle);
      },
    )
    .post(
      "/api/weekly-cycles",
      zValidator(
        "json",
        weeklyCycleCreateSchema,
        bodyValidationError("week", "week is required"),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const existing = await db.query.weeklyCycles.findFirst({
          where: eq(weeklyCycles.week, body.week),
        });
        if (existing) return c.json({ error: "Already exists" }, 409);
        const [cycle] = await db
          .insert(weeklyCycles)
          .values({
            week: body.week,
            goalContent: body.goalContent ?? "",
            reviewContent: body.reviewContent ?? "",
          })
          .returning();
        return c.json(cycle, 201);
      },
    )
    .put(
      "/api/weekly-cycles/:week",
      zValidator("param", weekParamSchema, validationError("Invalid week")),
      zValidator(
        "json",
        weeklyCyclePutSchema,
        validationError("Invalid request body"),
      ),
      async (c) => {
        const { week } = c.req.valid("param");
        const body = c.req.valid("json");
        const now = new Date().toISOString();
        const values = {
          goalContent: body.goalContent ?? "",
          reviewContent: body.reviewContent ?? "",
        };
        const [cycle] = await db
          .insert(weeklyCycles)
          .values({ week, ...values })
          .onConflictDoUpdate({
            target: weeklyCycles.week,
            set: { ...values, updatedAt: now },
          })
          .returning();
        return c.json(cycle);
      },
    )
    .patch(
      "/api/weekly-cycles/:week",
      zValidator("param", weekParamSchema, validationError("Invalid week")),
      zValidator(
        "json",
        weeklyCycleUpdateSchema,
        validationError("Invalid request body"),
      ),
      async (c) => {
        const { week } = c.req.valid("param");
        const body = c.req.valid("json");
        if (!("goalContent" in body) && !("reviewContent" in body)) {
          return c.json({ error: "No fields to update" }, 400);
        }
        const set: {
          goalContent?: string;
          reviewContent?: string;
          updatedAt: string;
        } = { updatedAt: new Date().toISOString() };
        if (body.goalContent !== undefined) set.goalContent = body.goalContent;
        if (body.reviewContent !== undefined)
          set.reviewContent = body.reviewContent;
        const [cycle] = await db
          .update(weeklyCycles)
          .set(set)
          .where(eq(weeklyCycles.week, week))
          .returning();
        if (!cycle) return c.json({ error: "Not found" }, 404);
        return c.json(cycle);
      },
    );
}

export type AppType = ReturnType<typeof createApp>;
