import { describe, expect, it } from "vitest";
import { createTestDb } from "./testing";
import { tasks, goals, reviews } from "./schema";

describe("createTestDb", () => {
  it("インメモリ DB を作成してマイグレーションを適用できる", () => {
    const db = createTestDb();
    expect(db).toBeDefined();
  });

  it("テストごとに独立した DB が得られる", () => {
    const db1 = createTestDb();
    const db2 = createTestDb();

    db1.insert(tasks).values({ title: "タスク1", date: "2026-06-01" }).run();

    const result1 = db1.select().from(tasks).all();
    const result2 = db2.select().from(tasks).all();

    expect(result1).toHaveLength(1);
    expect(result2).toHaveLength(0);
  });

  it("tasks テーブルに対して CRUD 操作ができる", () => {
    const db = createTestDb();

    db.insert(tasks).values({ title: "テストタスク", date: "2026-06-01" }).run();
    const rows = db.select().from(tasks).all();

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("テストタスク");
    expect(rows[0].date).toBe("2026-06-01");
  });

  it("goals テーブルに対して CRUD 操作ができる", () => {
    const db = createTestDb();

    db.insert(goals).values({ title: "テスト目標" }).run();
    const rows = db.select().from(goals).all();

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("テスト目標");
  });

  it("reviews テーブルに対して CRUD 操作ができる", () => {
    const db = createTestDb();

    db.insert(reviews).values({ week: "2026-W22", content: "振り返り内容" }).run();
    const rows = db.select().from(reviews).all();

    expect(rows).toHaveLength(1);
    expect(rows[0].week).toBe("2026-W22");
  });
});
