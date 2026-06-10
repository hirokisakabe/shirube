import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  const { resetIndexedDbConnectionForTest } = await import("./indexeddb");
  resetIndexedDbConnectionForTest();
  await deleteTestDb();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("storage driver selection", () => {
  it("VITE_STORAGE_DRIVER=indexeddbでは公開API wrapperがfetchを使わずIndexedDBへ保存する", async () => {
    vi.stubEnv("VITE_STORAGE_DRIVER", "indexeddb");
    vi.resetModules();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network disabled"));

    const { createTask, fetchTasks } = await import("./tasks");
    const { fetchWeeklyCycle, upsertWeeklyCycle } = await import("./reviews");

    const task = await createTask("Preview task", "2026-06-09");
    expect(await fetchTasks("2026-06-09")).toMatchObject([{ id: task.id }]);

    await upsertWeeklyCycle("2026-W23", {
      goalContent: "Preview goal",
      reviewContent: "Preview review",
    });
    expect(await fetchWeeklyCycle("2026-W23")).toMatchObject({
      goalContent: "Preview goal",
      reviewContent: "Preview review",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("IndexedDB storageではpreview noticeを表示する", async () => {
    vi.stubEnv("VITE_STORAGE_DRIVER", "indexeddb");
    vi.resetModules();

    const { StorageNotice } = await import("../components/StorageNotice");
    render(<StorageNotice />);

    expect(screen.getByText("Preview: ブラウザ内保存")).toBeInTheDocument();
  });
});
