import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tasksApi from "../api/tasks";
import { CalendarPage } from "./CalendarPage";

vi.mock("../api/tasks");
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> };
});

const mockedFetchTasks = vi.mocked(tasksApi.fetchTasks);
const mockedCreateTask = vi.mocked(tasksApi.createTask);
const mockedUpdateTask = vi.mocked(tasksApi.updateTask);
const mockedDeleteTask = vi.mocked(tasksApi.deleteTask);

// Fix Date to 2026-06-01 (Monday) — week starts on 2026-06-01 (Mon) in Monday-start convention
const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("CalendarPage", () => {
  it("週単位でタスクが日付軸に表示される", async () => {
    mockedFetchTasks.mockResolvedValue([
      {
        id: 1,
        title: "月曜タスク",
        date: "2026-06-01",
        doneAt: null,
        deletedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: 2,
        title: "水曜タスク",
        date: "2026-06-03",
        doneAt: null,
        deletedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    render(<CalendarPage />);

    expect(await screen.findByText("月曜タスク")).toBeInTheDocument();
    expect(screen.getByText("水曜タスク")).toBeInTheDocument();
    expect(screen.queryByText("今週 完了")).not.toBeInTheDocument();
    expect(screen.queryByText("%")).not.toBeInTheDocument();
  });

  it("完了タスクと未完了タスクが視覚的に区別できる", async () => {
    mockedFetchTasks.mockResolvedValue([
      {
        id: 1,
        title: "未完了タスク",
        date: "2026-06-01",
        doneAt: null,
        deletedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: 2,
        title: "完了タスク",
        date: "2026-06-01",
        doneAt: "2026-06-01T10:00:00.000Z",
        deletedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    render(<CalendarPage />);

    const undoneEl = await screen.findByText("未完了タスク");
    const doneEl = screen.getByText("完了タスク");

    expect(undoneEl.closest("[data-todo-done]")).toHaveAttribute("data-todo-done", "false");
    expect(doneEl.closest("[data-todo-done]")).toHaveAttribute("data-todo-done", "true");
  });

  it("add inputにタスクを入力してEnterで追加できる", async () => {
    mockedFetchTasks.mockResolvedValue([]);
    mockedCreateTask.mockResolvedValue({
      id: 10,
      title: "新タスク",
      date: "2026-06-01",
      doneAt: null,
      deletedAt: null,
      createdAt: "2026-06-01T00:00:00.000Z",
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<CalendarPage />);

    const inputs = await screen.findAllByPlaceholderText("タスクを追加");
    await user.click(inputs[0]);
    await user.type(inputs[0], "新タスク");
    await user.keyboard("{Enter}");

    expect(mockedCreateTask).toHaveBeenCalledWith("新タスク", "2026-06-01");
    expect(await screen.findByText("新タスク")).toBeInTheDocument();
  });

  it("週表示でタスクを完了・削除できる", async () => {
    const task = {
      id: 1,
      title: "操作対象タスク",
      date: "2026-06-01",
      doneAt: null,
      deletedAt: null,
      createdAt: "2026-06-01T00:00:00.000Z",
    };

    mockedFetchTasks.mockResolvedValue([task]);
    mockedUpdateTask.mockImplementation(async (_id, updates) => ({ ...task, ...updates }));
    mockedDeleteTask.mockResolvedValue({ ...task, deletedAt: "2026-06-01T10:00:00.000Z" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<CalendarPage />);

    const item = (await screen.findByText("操作対象タスク")).closest("[data-todo-done]");
    expect(item).toHaveAttribute("data-todo-done", "false");

    await user.click(screen.getByLabelText("完了にする"));

    expect(mockedUpdateTask).toHaveBeenCalledWith(1, { doneAt: expect.any(String) });
    expect(item).toHaveAttribute("data-todo-done", "true");

    await user.click(screen.getByTitle("削除"));

    expect(mockedDeleteTask).toHaveBeenCalledWith(1);
    expect(screen.queryByText("操作対象タスク")).not.toBeInTheDocument();
  });
});
