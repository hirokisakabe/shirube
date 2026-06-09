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
				await expect(res.json()).resolves.toEqual({
					error: "Invalid request body",
				});
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
					body: JSON.stringify({ date: "invalid" }),
				});
				expect(res.status).toBe(400);
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

	describe("Reviews", () => {
		describe("GET /api/reviews", () => {
			it("空の一覧を返す", async () => {
				const res = await app.request("/api/reviews");
				expect(res.status).toBe(200);
				const data = await res.json();
				expect(Array.isArray(data)).toBe(true);
				expect(data).toHaveLength(0);
			});

			it("登録済みレビューを週降順で返す", async () => {
				await app.request("/api/reviews/2026-W22", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "22週目" }),
				});
				await app.request("/api/reviews/2026-W23", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "23週目" }),
				});

				const res = await app.request("/api/reviews");
				expect(res.status).toBe(200);
				const data = (await res.json()) as Array<{ week: string }>;
				expect(data).toHaveLength(2);
				expect(data[0].week).toBe("2026-W23");
				expect(data[1].week).toBe("2026-W22");
			});
		});

		describe("GET /api/reviews/:week", () => {
			it("週を指定してレビューを取得できる", async () => {
				await app.request("/api/reviews/2026-W22", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "振り返り内容" }),
				});

				const res = await app.request("/api/reviews/2026-W22");
				expect(res.status).toBe(200);
				const data = (await res.json()) as { week: string; content: string };
				expect(data.week).toBe("2026-W22");
				expect(data.content).toBe("振り返り内容");
			});

			it("存在しない週は 404 を返す", async () => {
				const res = await app.request("/api/reviews/2000-W01");
				expect(res.status).toBe(404);
			});

			it("不正な週は 400 を返す", async () => {
				const res = await app.request("/api/reviews/2026-W00");
				expect(res.status).toBe(400);
			});
		});

		describe("PUT /api/reviews/:week", () => {
			it("レビューを作成できる", async () => {
				const res = await app.request("/api/reviews/2026-W22", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "振り返り内容" }),
				});
				expect(res.status).toBe(200);
				const data = (await res.json()) as { week: string; content: string };
				expect(data.week).toBe("2026-W22");
				expect(data.content).toBe("振り返り内容");
			});

			it("同じ週を再度 PUT すると内容が更新される", async () => {
				await app.request("/api/reviews/2026-W22", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "最初の内容" }),
				});
				await app.request("/api/reviews/2026-W22", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "更新後の内容" }),
				});

				const res = await app.request("/api/reviews/2026-W22");
				const data = (await res.json()) as { content: string };
				expect(data.content).toBe("更新後の内容");

				const listRes = await app.request("/api/reviews");
				const list = (await listRes.json()) as Array<unknown>;
				expect(list).toHaveLength(1);
			});

			it("content が空の場合は 400 を返す", async () => {
				const res = await app.request("/api/reviews/2026-W22", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "" }),
				});
				expect(res.status).toBe(400);
			});

			it("不正な週は 400 を返す", async () => {
				const res = await app.request("/api/reviews/2026-W00", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "振り返り内容" }),
				});
				expect(res.status).toBe(400);
			});
		});

		describe("DELETE /api/reviews/:week", () => {
			it("レビューを削除できる", async () => {
				await app.request("/api/reviews/2026-W22", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "削除するレビュー" }),
				});

				const res = await app.request("/api/reviews/2026-W22", {
					method: "DELETE",
				});
				expect(res.status).toBe(200);

				const getRes = await app.request("/api/reviews/2026-W22");
				expect(getRes.status).toBe(404);
			});

			it("存在しない週は 404 を返す", async () => {
				const res = await app.request("/api/reviews/2000-W01", {
					method: "DELETE",
				});
				expect(res.status).toBe(404);
			});

			it("不正な週は 400 を返す", async () => {
				const res = await app.request("/api/reviews/2026-W00", {
					method: "DELETE",
				});
				expect(res.status).toBe(400);
			});
		});
	});

	describe("Goals", () => {
		describe("GET /api/goals", () => {
			it("空の一覧を返す", async () => {
				const res = await app.request("/api/goals");
				expect(res.status).toBe(200);
				const data = await res.json();
				expect(Array.isArray(data)).toBe(true);
				expect(data).toHaveLength(0);
			});

			it("未達成の目標のみ返す（デフォルト）", async () => {
				const g1 = (await (
					await app.request("/api/goals", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ title: "達成する目標" }),
					})
				).json()) as { id: number };
				await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "未達成の目標" }),
				});
				await app.request(`/api/goals/${g1.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ doneAt: new Date().toISOString() }),
				});

				const res = await app.request("/api/goals");
				const data = (await res.json()) as Array<{ id: number }>;
				expect(data.find((g) => g.id === g1.id)).toBeUndefined();
			});

			it("?all=true で達成済みも含めて返す", async () => {
				const g1 = (await (
					await app.request("/api/goals", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ title: "達成する目標" }),
					})
				).json()) as { id: number };
				await app.request(`/api/goals/${g1.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ doneAt: new Date().toISOString() }),
				});

				const res = await app.request("/api/goals?all=true");
				const data = (await res.json()) as Array<{ id: number }>;
				expect(data.find((g) => g.id === g1.id)).toBeDefined();
			});

			it("all query が不正な場合は 400 を返す", async () => {
				const res = await app.request("/api/goals?all=yes");
				expect(res.status).toBe(400);
			});
		});

		describe("GET /api/goals/:id", () => {
			it("目標を取得できる", async () => {
				const created = await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "取得テスト目標" }),
				});
				const goal = (await created.json()) as { id: number; title: string };

				const res = await app.request(`/api/goals/${goal.id}`);
				expect(res.status).toBe(200);
				const data = (await res.json()) as { id: number; title: string };
				expect(data.id).toBe(goal.id);
				expect(data.title).toBe("取得テスト目標");
			});

			it("存在しない ID は 404 を返す", async () => {
				const res = await app.request("/api/goals/99999");
				expect(res.status).toBe(404);
			});

			it("不正な ID は 400 を返す", async () => {
				const res = await app.request("/api/goals/not-a-number");
				expect(res.status).toBe(400);
			});
		});

		describe("POST /api/goals", () => {
			it("目標を作成して 201 を返す", async () => {
				const res = await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "新しい目標" }),
				});
				expect(res.status).toBe(201);
				const data = (await res.json()) as { id: number; title: string };
				expect(data.title).toBe("新しい目標");
				expect(typeof data.id).toBe("number");
			});

			it("title が空の場合は 400 を返す", async () => {
				const res = await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "" }),
				});
				expect(res.status).toBe(400);
			});

			it("不正な body は 400 を返す", async () => {
				const res = await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: 123 }),
				});
				expect(res.status).toBe(400);
			});
		});

		describe("PATCH /api/goals/:id", () => {
			it("目標を達成にして doneAt をセットできる", async () => {
				const created = await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "達成する目標" }),
				});
				const goal = (await created.json()) as { id: number };

				const doneAt = new Date().toISOString();
				const res = await app.request(`/api/goals/${goal.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ doneAt }),
				});
				expect(res.status).toBe(200);
				const data = (await res.json()) as { doneAt: string | null };
				expect(data.doneAt).toBe(doneAt);
			});

			it("存在しない ID は 404 を返す", async () => {
				const res = await app.request("/api/goals/99999", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ doneAt: null }),
				});
				expect(res.status).toBe(404);
			});

			it("不正な ID は 400 を返す", async () => {
				const res = await app.request("/api/goals/not-a-number", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ doneAt: null }),
				});
				expect(res.status).toBe(400);
			});

			it("更新項目が空の場合は 400 を返す", async () => {
				const created = await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "更新しない目標" }),
				});
				const goal = (await created.json()) as { id: number };

				const res = await app.request(`/api/goals/${goal.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				});
				expect(res.status).toBe(400);
			});
		});

		describe("DELETE /api/goals/:id", () => {
			it("目標をソフトデリートして deletedAt をセットする", async () => {
				const created = await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "削除する目標" }),
				});
				const goal = (await created.json()) as { id: number };

				const res = await app.request(`/api/goals/${goal.id}`, {
					method: "DELETE",
				});
				expect(res.status).toBe(200);
				const data = (await res.json()) as { deletedAt: string | null };
				expect(data.deletedAt).not.toBeNull();
			});

			it("存在しない ID は 404 を返す", async () => {
				const res = await app.request("/api/goals/99999", { method: "DELETE" });
				expect(res.status).toBe(404);
			});

			it("不正な ID は 400 を返す", async () => {
				const res = await app.request("/api/goals/not-a-number", {
					method: "DELETE",
				});
				expect(res.status).toBe(400);
			});

			it("削除後は GET で取得できない", async () => {
				const created = await app.request("/api/goals", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "削除後確認" }),
				});
				const goal = (await created.json()) as { id: number };

				await app.request(`/api/goals/${goal.id}`, { method: "DELETE" });

				const res = await app.request(`/api/goals/${goal.id}`);
				expect(res.status).toBe(404);
			});
		});
	});
});
