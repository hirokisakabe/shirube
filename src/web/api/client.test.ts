import { describe, expect, it } from "vitest";
import {
  fetchWeeklyCycle,
  fetchWeeklyCycles,
  upsertWeeklyCycle,
} from "./weeklyCycles";
import { createTask, deleteTask, fetchTasks, updateTask } from "./tasks";

describe("Hono RPC API client", () => {
  it("tasks wrapperがRPC client経由で主要操作を実行できる", async () => {
    const created = await createTask("RPC task", "2026-06-09");
    expect(created.title).toBe("RPC task");

    await createTask("Other day", "2026-06-10");
    expect(await fetchTasks("2026-06-09")).toHaveLength(1);

    const updated = await updateTask(created.id, {
      doneAt: "2026-06-09T00:00:00.000Z",
    });
    expect(updated.doneAt).toBe("2026-06-09T00:00:00.000Z");

    const deleted = await deleteTask(created.id);
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("weekly cycle wrapperがRPC client経由で主要操作を実行できる", async () => {
    expect(await fetchWeeklyCycle("2026-W23")).toBeNull();

    const saved = await upsertWeeklyCycle("2026-W23", {
      goalContent: "RPC goal",
      reviewContent: "RPC review",
    });
    expect(saved.goalContent).toBe("RPC goal");
    expect(saved.reviewContent).toBe("RPC review");

    const fetched = await fetchWeeklyCycle("2026-W23");
    expect(fetched?.goalContent).toBe("RPC goal");
    expect(fetched?.reviewContent).toBe("RPC review");
    expect(await fetchWeeklyCycles()).toHaveLength(1);
  });
});
