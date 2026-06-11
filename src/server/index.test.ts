import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../db/index";
import { createApp } from "./app";

describe("Server API", () => {
  let close: () => void;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const testDb = createTestDb();
    close = testDb.close;
    app = createApp(testDb.db);
  });

  afterEach(() => {
    close();
  });

  async function expectJsonError(
    res: { json: () => Promise<unknown> },
    error: string,
  ) {
    await expect(res.json()).resolves.toEqual({ error });
  }

  describe("Tasks", () => {
    describe("GET /api/tasks", () => {
      it("空の一覧を返す", async () => {
        const res = await app.request("/api/tasks");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });

      it("作成済みタスクを一覧で返す", async () => {
        await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "タスク1", date: "2026-06-01" }),
        });
        await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "タスク2", date: "2026-06-01" }),
        });

        const res = await app.request("/api/tasks");
        expect(res.status).toBe(200);
        const data = (await res.json()) as Array<{ title: string }>;
        expect(data).toHaveLength(2);
      });

      it("date が null の日付未設定タスクを一覧で返し、date query では除外する", async () => {
        await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Inboxタスク", date: null }),
        });
        await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "日付付き", date: "2026-06-01" }),
        });

        const all = await app.request("/api/tasks");
        const allData = (await all.json()) as Array<{
          title: string;
          date: string | null;
        }>;
        expect(allData).toContainEqual(
          expect.objectContaining({ title: "Inboxタスク", date: null }),
        );

        const byDate = await app.request("/api/tasks?date=2026-06-01");
        const byDateData = (await byDate.json()) as Array<{ title: string }>;
        expect(byDateData).toHaveLength(1);
        expect(byDateData[0]?.title).toBe("日付付き");
      });

      it("削除済みタスクは一覧に含まれない", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "削除するタスク", date: "2026-06-01" }),
        });
        const task = (await created.json()) as { id: number };
        await app.request(`/api/tasks/${task.id}`, { method: "DELETE" });

        const res = await app.request("/api/tasks");
        const data = (await res.json()) as Array<{ id: number }>;
        expect(data.find((t) => t.id === task.id)).toBeUndefined();
      });

      it("date query が不正な場合は 400 を返す", async () => {
        const res = await app.request("/api/tasks?date=2026-99-99");
        expect(res.status).toBe(400);
        await expectJsonError(res, "Invalid query");
      });
    });

    describe("GET /api/tasks/:id", () => {
      it("タスクを取得できる", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "取得テスト", date: "2026-06-01" }),
        });
        const task = (await created.json()) as { id: number; title: string };

        const res = await app.request(`/api/tasks/${task.id}`);
        expect(res.status).toBe(200);
        const data = (await res.json()) as { id: number; title: string };
        expect(data.id).toBe(task.id);
        expect(data.title).toBe("取得テスト");
      });

      it("存在しない ID は 404 を返す", async () => {
        const res = await app.request("/api/tasks/99999");
        expect(res.status).toBe(404);
      });

      it("不正な ID は 400 を返す", async () => {
        const res = await app.request("/api/tasks/not-a-number");
        expect(res.status).toBe(400);
        await expectJsonError(res, "Invalid id");
      });
    });

    describe("POST /api/tasks", () => {
      it("タスクを作成して 201 を返す", async () => {
        const res = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "新しいタスク", date: "2026-06-01" }),
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as {
          id: number;
          title: string;
          date: string;
        };
        expect(data.title).toBe("新しいタスク");
        expect(data.date).toBe("2026-06-01");
        expect(typeof data.id).toBe("number");
      });

      it("date に null を指定して日付未設定タスクを作成できる", async () => {
        const res = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "日付未設定", date: null }),
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as {
          title: string;
          date: string | null;
        };
        expect(data.title).toBe("日付未設定");
        expect(data.date).toBeNull();
      });

      it("title が空の場合は 400 を返す", async () => {
        const res = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "", date: "2026-06-01" }),
        });
        expect(res.status).toBe(400);
      });

      it("date が不正な場合は 400 を返す", async () => {
        const res = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "日付不正", date: "2026-99-99" }),
        });
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toHaveProperty("error");
      });
    });

    describe("PATCH /api/tasks/:id", () => {
      it("タスクを更新して doneAt をセットできる", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "完了するタスク", date: "2026-06-01" }),
        });
        const task = (await created.json()) as { id: number };

        const doneAt = new Date().toISOString();
        const res = await app.request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doneAt }),
        });
        expect(res.status).toBe(200);
        const data = (await res.json()) as { doneAt: string | null };
        expect(data.doneAt).toBe(doneAt);
      });

      it("date を null と日付の間で更新できる", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "日付移動タスク",
            date: "2026-06-01",
          }),
        });
        const task = (await created.json()) as { id: number };

        const movedToInbox = await app.request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: null }),
        });
        expect(movedToInbox.status).toBe(200);
        await expect(movedToInbox.json()).resolves.toMatchObject({
          date: null,
        });

        const movedToDate = await app.request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: "2026-06-03" }),
        });
        expect(movedToDate.status).toBe(200);
        await expect(movedToDate.json()).resolves.toMatchObject({
          date: "2026-06-03",
        });
      });

      it("存在しない ID は 404 を返す", async () => {
        const res = await app.request("/api/tasks/99999", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doneAt: null }),
        });
        expect(res.status).toBe(404);
      });

      it("不正な ID は 400 を返す", async () => {
        const res = await app.request("/api/tasks/not-a-number", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doneAt: null }),
        });
        expect(res.status).toBe(400);
      });

      it("不正な body は 400 を返す", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "不正 body 確認", date: "2026-06-01" }),
        });
        const task = (await created.json()) as { id: number };

        const res = await app.request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doneAt: 123 }),
        });
        expect(res.status).toBe(400);
        await expectJsonError(res, "Invalid request body");
      });

      it("deletedAt に null 以外を指定した場合は 400 を返す", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "不正復元確認", date: "2026-06-01" }),
        });
        const task = (await created.json()) as { id: number };

        const res = await app.request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deletedAt: "2026-06-01T12:00:00.000Z" }),
        });
        expect(res.status).toBe(400);
        await expectJsonError(res, "Invalid request body");
      });

      it("更新項目が空の場合は 400 を返す", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "更新しないタスク",
            date: "2026-06-01",
          }),
        });
        const task = (await created.json()) as { id: number };

        const res = await app.request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
      });

      it("deletedAt に null を指定して削除済みタスクを復元できる", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "復元するタスク",
            date: "2026-06-01",
          }),
        });
        const task = (await created.json()) as { id: number };
        await app.request(`/api/tasks/${task.id}`, { method: "DELETE" });

        const restored = await app.request(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deletedAt: null }),
        });
        expect(restored.status).toBe(200);
        const data = (await restored.json()) as { deletedAt: string | null };
        expect(data.deletedAt).toBeNull();

        const list = await app.request("/api/tasks");
        const listData = (await list.json()) as Array<{ id: number }>;
        expect(listData).toContainEqual(
          expect.objectContaining({ id: task.id }),
        );
      });
    });

    describe("DELETE /api/tasks/:id", () => {
      it("タスクをソフトデリートして deletedAt をセットする", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "削除するタスク", date: "2026-06-01" }),
        });
        const task = (await created.json()) as { id: number };

        const res = await app.request(`/api/tasks/${task.id}`, {
          method: "DELETE",
        });
        expect(res.status).toBe(200);
        const data = (await res.json()) as { deletedAt: string | null };
        expect(data.deletedAt).not.toBeNull();
      });

      it("存在しない ID は 404 を返す", async () => {
        const res = await app.request("/api/tasks/99999", { method: "DELETE" });
        expect(res.status).toBe(404);
      });

      it("不正な ID は 400 を返す", async () => {
        const res = await app.request("/api/tasks/not-a-number", {
          method: "DELETE",
        });
        expect(res.status).toBe(400);
      });

      it("削除後は GET で取得できない", async () => {
        const created = await app.request("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "削除後確認", date: "2026-06-01" }),
        });
        const task = (await created.json()) as { id: number };

        await app.request(`/api/tasks/${task.id}`, { method: "DELETE" });

        const res = await app.request(`/api/tasks/${task.id}`);
        expect(res.status).toBe(404);
      });
    });
  });

  describe("Weekly cycles", () => {
    describe("GET /api/weekly-cycles", () => {
      it("空の一覧を返す", async () => {
        const res = await app.request("/api/weekly-cycles");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });

      it("登録済みサイクルを週降順で返す", async () => {
        await app.request("/api/weekly-cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: "2026-W22", goalContent: "22週目" }),
        });
        await app.request("/api/weekly-cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: "2026-W23", reviewContent: "23週目" }),
        });

        const res = await app.request("/api/weekly-cycles");
        expect(res.status).toBe(200);
        const data = (await res.json()) as Array<{ week: string }>;
        expect(data).toHaveLength(2);
        expect(data[0].week).toBe("2026-W23");
        expect(data[1].week).toBe("2026-W22");
      });
    });

    describe("POST /api/weekly-cycles", () => {
      it("週次サイクルを作成できる", async () => {
        const res = await app.request("/api/weekly-cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            week: "2026-W22",
            goalContent: "目標",
            reviewContent: "振り返り",
          }),
        });
        expect(res.status).toBe(201);
        const data = (await res.json()) as {
          week: string;
          goalContent: string;
          reviewContent: string;
        };
        expect(data.week).toBe("2026-W22");
        expect(data.goalContent).toBe("目標");
        expect(data.reviewContent).toBe("振り返り");
      });

      it("同じ週を重複作成できない", async () => {
        await app.request("/api/weekly-cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: "2026-W22" }),
        });

        const res = await app.request("/api/weekly-cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: "2026-W22" }),
        });
        expect(res.status).toBe(409);
      });

      it("不正な週は 400 を返す", async () => {
        const res = await app.request("/api/weekly-cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: "2026-W00" }),
        });
        expect(res.status).toBe(400);
      });
    });

    describe("GET /api/weekly-cycles/:week", () => {
      it("週を指定して週次サイクルを取得できる", async () => {
        await app.request("/api/weekly-cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week: "2026-W22", goalContent: "目標" }),
        });

        const res = await app.request("/api/weekly-cycles/2026-W22");
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
          week: string;
          goalContent: string;
        };
        expect(data.week).toBe("2026-W22");
        expect(data.goalContent).toBe("目標");
      });

      it("存在しない週は 404 を返す", async () => {
        const res = await app.request("/api/weekly-cycles/2000-W01");
        expect(res.status).toBe(404);
      });

      it("不正な週は 400 を返す", async () => {
        const res = await app.request("/api/weekly-cycles/2026-W00");
        expect(res.status).toBe(400);
        await expectJsonError(res, "Invalid week");
      });
    });

    describe("PUT /api/weekly-cycles/:week", () => {
      it("週次サイクルを upsert できる", async () => {
        const res = await app.request("/api/weekly-cycles/2026-W22", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalContent: "今週の目標",
            reviewContent: "今週の振り返り",
          }),
        });
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
          week: string;
          goalContent: string;
          reviewContent: string;
        };
        expect(data.week).toBe("2026-W22");
        expect(data.goalContent).toBe("今週の目標");
        expect(data.reviewContent).toBe("今週の振り返り");
      });

      it("同じ週を再度 PUT すると 1 レコードのまま更新される", async () => {
        await app.request("/api/weekly-cycles/2026-W22", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalContent: "最初の目標",
            reviewContent: "",
          }),
        });
        await app.request("/api/weekly-cycles/2026-W22", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalContent: "更新後の目標",
            reviewContent: "更新後",
          }),
        });

        const res = await app.request("/api/weekly-cycles/2026-W22");
        const data = (await res.json()) as {
          goalContent: string;
          reviewContent: string;
        };
        expect(data.goalContent).toBe("更新後の目標");
        expect(data.reviewContent).toBe("更新後");

        const listRes = await app.request("/api/weekly-cycles");
        const list = (await listRes.json()) as Array<unknown>;
        expect(list).toHaveLength(1);
      });

      it("PUT で片方の本文を省略すると 400 を返す", async () => {
        const res = await app.request("/api/weekly-cycles/2026-W22", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalContent: "目標だけ" }),
        });
        expect(res.status).toBe(400);
      });
    });

    describe("PATCH /api/weekly-cycles/:week", () => {
      it("指定フィールドだけ更新できる", async () => {
        await app.request("/api/weekly-cycles/2026-W22", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalContent: "目標",
            reviewContent: "振り返り",
          }),
        });

        const res = await app.request("/api/weekly-cycles/2026-W22", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewContent: "更新後の振り返り" }),
        });
        expect(res.status).toBe(200);
        const data = (await res.json()) as {
          goalContent: string;
          reviewContent: string;
        };
        expect(data.goalContent).toBe("目標");
        expect(data.reviewContent).toBe("更新後の振り返り");
      });

      it("更新項目が空の場合は 400 を返す", async () => {
        await app.request("/api/weekly-cycles/2026-W22", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalContent: "目標", reviewContent: "" }),
        });

        const res = await app.request("/api/weekly-cycles/2026-W22", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
      });
    });
  });
});
