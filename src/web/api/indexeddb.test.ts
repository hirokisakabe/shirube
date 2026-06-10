import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createIndexedDbGoal,
  createIndexedDbTask,
  deleteIndexedDbGoal,
  deleteIndexedDbTask,
  fetchIndexedDbGoals,
  fetchIndexedDbReview,
  fetchIndexedDbReviews,
  fetchIndexedDbTasks,
  resetIndexedDbConnectionForTest,
  updateIndexedDbGoal,
  updateIndexedDbTask,
  upsertIndexedDbReview,
} from "./indexeddb";

function deleteTestDb() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("shirube-preview");
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        request.error instanceof Error
          ? request.error
          : new Error("Failed to delete IndexedDB"),
      );
    request.onblocked = () => reject(new Error("IndexedDB delete blocked"));
  });
}

afterEach(async () => {
  resetIndexedDbConnectionForTest();
  await deleteTestDb();
  resetIndexedDbConnectionForTest();
});

describe("IndexedDB storage backend", () => {
  it("tasksの主要CRUDとsoft delete相当の非表示を保持する", async () => {
    const created = await createIndexedDbTask("IDB task", "2026-06-09");
    await createIndexedDbTask("Other day", "2026-06-10");

    expect(await fetchIndexedDbTasks("2026-06-09")).toMatchObject([
      { title: "IDB task", date: "2026-06-09", deletedAt: null },
    ]);

    const updated = await updateIndexedDbTask(created.id, {
      doneAt: "2026-06-09T00:00:00.000Z",
      title: "Updated IDB task",
    });
    expect(updated).toMatchObject({
      title: "Updated IDB task",
      doneAt: "2026-06-09T00:00:00.000Z",
    });

    const deleted = await deleteIndexedDbTask(created.id);
    expect(deleted.deletedAt).not.toBeNull();
    expect(await fetchIndexedDbTasks("2026-06-09")).toHaveLength(0);
  });

  it("goalsの未達成表示、達成済み表示、createdAt降順、soft deleteを保持する", async () => {
    const first = await createIndexedDbGoal("First goal");
    await new Promise((resolve) => setTimeout(resolve, 1));
    const second = await createIndexedDbGoal("Second goal");

    expect((await fetchIndexedDbGoals()).map((goal) => goal.title)).toEqual([
      "Second goal",
      "First goal",
    ]);

    await updateIndexedDbGoal(second.id, {
      doneAt: "2026-06-09T00:00:00.000Z",
    });
    expect((await fetchIndexedDbGoals()).map((goal) => goal.id)).toEqual([
      first.id,
    ]);
    expect(await fetchIndexedDbGoals(true)).toHaveLength(2);

    await deleteIndexedDbGoal(first.id);
    expect(await fetchIndexedDbGoals(true)).toHaveLength(1);
  });

  it("reviewsのupsert、単体取得、week降順を保持する", async () => {
    expect(await fetchIndexedDbReview("2026-W23")).toBeNull();
    await expect(upsertIndexedDbReview("2026-W23", "")).rejects.toThrow(
      "content is required",
    );

    await upsertIndexedDbReview("2026-W22", "Older review");
    const saved = await upsertIndexedDbReview("2026-W23", "IDB review");
    expect(saved.content).toBe("IDB review");

    const updated = await upsertIndexedDbReview("2026-W23", "Updated review");
    expect(updated.id).toBe(saved.id);
    expect(updated.content).toBe("Updated review");

    expect(await fetchIndexedDbReview("2026-W23")).toMatchObject({
      content: "Updated review",
    });
    expect(
      (await fetchIndexedDbReviews()).map((review) => review.week),
    ).toEqual(["2026-W23", "2026-W22"]);
  });
});
