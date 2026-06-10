import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testing";
import { tasks, weeklyCycles } from "./schema";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema";

describe("createTestDb", () => {
  let db: BetterSQLite3Database<typeof schema>;
  let close: () => void;

  beforeEach(() => {
    ({ db, close } = createTestDb());
  });

  afterEach(() => {
    close();
  });

  it("インメモリ DB を作成してマイグレーションを適用できる", () => {
    expect(db).toBeDefined();
  });

  it("テストごとに独立した DB が得られる", () => {
    db.insert(tasks).values({ title: "タスク1", date: "2026-06-01" }).run();

    const result = db.select().from(tasks).all();
    expect(result).toHaveLength(1);
  });

  it("tasks テーブルに対して CRUD 操作ができる", () => {
    db.insert(tasks)
      .values({ title: "テストタスク", date: "2026-06-01" })
      .run();
    const rows = db.select().from(tasks).all();

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("テストタスク");
    expect(rows[0].date).toBe("2026-06-01");
  });

  it("weekly_cycles テーブルに対して CRUD 操作ができる", () => {
    db.insert(weeklyCycles)
      .values({
        week: "2026-W22",
        goalContent: "目標内容",
        reviewContent: "振り返り内容",
      })
      .run();
    const rows = db.select().from(weeklyCycles).all();

    expect(rows).toHaveLength(1);
    expect(rows[0].week).toBe("2026-W22");
    expect(rows[0].goalContent).toBe("目標内容");
    expect(rows[0].reviewContent).toBe("振り返り内容");
  });
});
