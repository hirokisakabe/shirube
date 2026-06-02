import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { createDb, goals, reviews, tasks } from "../db/index";

type Db = ReturnType<typeof createDb>;

export function createApp(db: Db) {
  const app = new Hono();

  // Tasks
  app.get("/api/tasks", async (c) => {
    const date = c.req.query("date");
    const result = await db
      .select()
      .from(tasks)
      .where(date ? and(isNull(tasks.deletedAt), eq(tasks.date, date)) : isNull(tasks.deletedAt));
    return c.json(result);
  });

  app.get("/api/tasks/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), isNull(tasks.deletedAt)),
    });
    if (!task) return c.json({ error: "Not found" }, 404);
    return c.json(task);
  });

  app.post("/api/tasks", async (c) => {
    const body = await c.req.json<{ title: string; date?: string }>();
    if (!body.title) return c.json({ error: "title is required" }, 400);
    const date = body.date ?? new Date().toISOString().slice(0, 10);
    const [task] = await db.insert(tasks).values({ title: body.title, date }).returning();
    return c.json(task, 201);
  });

  app.patch("/api/tasks/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const body = await c.req.json<{ doneAt?: string | null; title?: string; date?: string }>();
    const set: { doneAt?: string | null; title?: string; date?: string } = {};
    if ("doneAt" in body) set.doneAt = body.doneAt ?? null;
    if (body.title !== undefined) set.title = body.title;
    if (body.date !== undefined) set.date = body.date;
    if (Object.keys(set).length === 0) return c.json({ error: "No fields to update" }, 400);
    const [task] = await db
      .update(tasks)
      .set(set)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .returning();
    if (!task) return c.json({ error: "Not found" }, 404);
    return c.json(task);
  });

  app.delete("/api/tasks/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const [task] = await db
      .update(tasks)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .returning();
    if (!task) return c.json({ error: "Not found" }, 404);
    return c.json(task);
  });

  // Reviews
  app.get("/api/reviews", async (c) => {
    const result = await db.select().from(reviews).orderBy(desc(reviews.week));
    return c.json(result);
  });

  app.get("/api/reviews/:week", async (c) => {
    const week = c.req.param("week");
    const review = await db.query.reviews.findFirst({ where: eq(reviews.week, week) });
    if (!review) return c.json({ error: "Not found" }, 404);
    return c.json(review);
  });

  app.put("/api/reviews/:week", async (c) => {
    const week = c.req.param("week");
    const body = await c.req.json<{ content: string }>();
    if (!body.content) return c.json({ error: "content is required" }, 400);
    const [review] = await db
      .insert(reviews)
      .values({ week, content: body.content })
      .onConflictDoUpdate({
        target: reviews.week,
        set: { content: body.content, updatedAt: new Date().toISOString() },
      })
      .returning();
    return c.json(review);
  });

  app.delete("/api/reviews/:week", async (c) => {
    const week = c.req.param("week");
    const existing = await db.query.reviews.findFirst({ where: eq(reviews.week, week) });
    if (!existing) return c.json({ error: "Not found" }, 404);
    await db.delete(reviews).where(eq(reviews.week, week));
    return c.json(existing);
  });

  // Goals
  app.get("/api/goals", async (c) => {
    const all = c.req.query("all") === "true";
    const result = await db
      .select()
      .from(goals)
      .where(
        all
          ? isNull(goals.deletedAt)
          : and(isNull(goals.deletedAt), isNull(goals.doneAt))
      )
      .orderBy(desc(goals.createdAt));
    return c.json(result);
  });

  app.get("/api/goals/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const goal = await db.query.goals.findFirst({
      where: and(eq(goals.id, id), isNull(goals.deletedAt)),
    });
    if (!goal) return c.json({ error: "Not found" }, 404);
    return c.json(goal);
  });

  app.post("/api/goals", async (c) => {
    const body = await c.req.json<{ title: string }>();
    if (!body.title) return c.json({ error: "title is required" }, 400);
    const [goal] = await db.insert(goals).values({ title: body.title }).returning();
    return c.json(goal, 201);
  });

  app.patch("/api/goals/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const body = await c.req.json<{ doneAt?: string | null }>();
    const [goal] = await db
      .update(goals)
      .set({ doneAt: body.doneAt ?? null })
      .where(and(eq(goals.id, id), isNull(goals.deletedAt)))
      .returning();
    if (!goal) return c.json({ error: "Not found" }, 404);
    return c.json(goal);
  });

  app.delete("/api/goals/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json({ error: "Invalid id" }, 400);
    const [goal] = await db
      .update(goals)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(goals.id, id), isNull(goals.deletedAt)))
      .returning();
    if (!goal) return c.json({ error: "Not found" }, 404);
    return c.json(goal);
  });

  return app;
}
