import { http, HttpResponse } from "msw";
import type { WeeklyCycle } from "../api/reviews";
import type { Task } from "../api/tasks";

const now = () => new Date().toISOString();

let tasks: Task[] = [];
let weeklyCycles: WeeklyCycle[] = [];

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: "テストタスク",
  date: "2026-06-01",
  doneAt: null,
  deletedAt: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

export const makeWeeklyCycle = (
  overrides: Partial<WeeklyCycle> = {},
): WeeklyCycle => ({
  id: 1,
  week: "2026-W23",
  goalContent: "テスト目標",
  reviewContent: "テスト振り返り",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

export function setMockTasks(nextTasks: Task[]) {
  tasks = [...nextTasks];
}

export function setMockWeeklyCycles(nextCycles: WeeklyCycle[]) {
  weeklyCycles = [...nextCycles];
}

export function resetMockData() {
  tasks = [];
  weeklyCycles = [];
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

  http.get("/api/weekly-cycles", () => {
    const result = [...weeklyCycles].sort((a, b) =>
      b.week.localeCompare(a.week),
    );
    return HttpResponse.json(result);
  }),
  http.get("/api/weekly-cycles/:week", ({ params }) => {
    const cycle = weeklyCycles.find((item) => item.week === params.week);
    if (!cycle)
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    return HttpResponse.json(cycle);
  }),
  http.put("/api/weekly-cycles/:week", async ({ params, request }) => {
    const week = String(params.week);
    const body = (await request.json()) as {
      goalContent?: string;
      reviewContent?: string;
    };
    const existing = weeklyCycles.find((item) => item.week === week);
    const cycle = existing
      ? { ...existing, ...body, updatedAt: now() }
      : makeWeeklyCycle({
          id: nextId(weeklyCycles),
          week,
          goalContent: body.goalContent ?? "",
          reviewContent: body.reviewContent ?? "",
          createdAt: now(),
          updatedAt: now(),
        });
    weeklyCycles = existing
      ? weeklyCycles.map((item) => (item.week === week ? cycle : item))
      : [...weeklyCycles, cycle];
    return HttpResponse.json(cycle);
  }),
];
