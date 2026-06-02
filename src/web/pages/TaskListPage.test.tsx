import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as tasksApi from "../api/tasks";
import { TaskListPage } from "./TaskListPage";

vi.mock("../api/tasks");

const mockedFetchTasks = vi.mocked(tasksApi.fetchTasks);

afterEach(() => {
  vi.clearAllMocks();
});

describe("TaskListPage", () => {
  it("タスク一覧を表示する", async () => {
    mockedFetchTasks.mockResolvedValue([
      {
        id: 1,
        title: "タスク A",
        date: "2026-06-01",
        doneAt: null,
        deletedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    render(<TaskListPage />);
    expect(await screen.findByText("タスク A")).toBeInTheDocument();
  });

  it("タスクが 0 件のとき「タスクがありません」を表示する", async () => {
    mockedFetchTasks.mockResolvedValue([]);

    render(<TaskListPage />);
    expect(await screen.findByText("タスクがありません")).toBeInTheDocument();
  });

  it("API エラー時にエラーメッセージを表示する", async () => {
    mockedFetchTasks.mockRejectedValue(new Error("network error"));

    render(<TaskListPage />);
    expect(await screen.findByText(/エラー/)).toBeInTheDocument();
  });
});
