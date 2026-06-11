import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createIndexedDbTask,
  deleteIndexedDbTask,
  fetchIndexedDbTasks,
  fetchIndexedDbWeeklyCycle,
  fetchIndexedDbWeeklyCycles,
  resetIndexedDbConnectionForTest,
  updateIndexedDbTask,
  upsertIndexedDbWeeklyCycle,
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

    const restored = await updateIndexedDbTask(created.id, { deletedAt: null });
    expect(restored.deletedAt).toBeNull();
    expect(await fetchIndexedDbTasks("2026-06-09")).toMatchObject([
      { title: "Updated IDB task", date: "2026-06-09", deletedAt: null },
    ]);
  });

  it("dateがnullの日付未設定タスクを保存し、日付指定取得からは除外する", async () => {
    const inboxTask = await createIndexedDbTask("Inbox IDB task", null);
    await createIndexedDbTask("Dated IDB task", "2026-06-10");

    expect(await fetchIndexedDbTasks()).toContainEqual(
      expect.objectContaining({ id: inboxTask.id, date: null }),
    );
    expect(await fetchIndexedDbTasks("2026-06-10")).toMatchObject([
      { title: "Dated IDB task", date: "2026-06-10" },
    ]);

    const movedToDate = await updateIndexedDbTask(inboxTask.id, {
      date: "2026-06-11",
    });
    expect(movedToDate.date).toBe("2026-06-11");

    const movedToInbox = await updateIndexedDbTask(inboxTask.id, {
      date: null,
    });
    expect(movedToInbox.date).toBeNull();
  });

  it("weekly cyclesのupsert、単体取得、week降順を保持する", async () => {
    expect(await fetchIndexedDbWeeklyCycle("2026-W23")).toBeNull();

    await upsertIndexedDbWeeklyCycle("2026-W22", {
      goalContent: "Older goal",
      reviewContent: "Older review",
    });
    const saved = await upsertIndexedDbWeeklyCycle("2026-W23", {
      goalContent: "IDB goal",
      reviewContent: "IDB review",
    });
    expect(saved.goalContent).toBe("IDB goal");
    expect(saved.reviewContent).toBe("IDB review");

    const updated = await upsertIndexedDbWeeklyCycle("2026-W23", {
      goalContent: "Updated goal",
      reviewContent: "Updated review",
    });
    expect(updated.id).toBe(saved.id);
    expect(updated.goalContent).toBe("Updated goal");
    expect(updated.reviewContent).toBe("Updated review");

    expect(await fetchIndexedDbWeeklyCycle("2026-W23")).toMatchObject({
      goalContent: "Updated goal",
      reviewContent: "Updated review",
    });
    expect(
      (await fetchIndexedDbWeeklyCycles()).map((cycle) => cycle.week),
    ).toEqual(["2026-W23", "2026-W22"]);
  });
});
