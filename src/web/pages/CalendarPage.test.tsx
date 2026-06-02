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

  it("月ビューのAddInputでタスクを追加できる", async () => {
    mockedFetchTasks.mockResolvedValue([]);
    mockedCreateTask.mockResolvedValue({
      id: 10,
      title: "月ビュータスク",
      date: "2026-06-01",
      doneAt: null,
      deletedAt: null,
      createdAt: "2026-06-01T00:00:00.000Z",
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const { container } = render(<CalendarPage />);

    // 読み込み完了を待つ & 月ビューに切り替え
    await screen.findAllByPlaceholderText("タスクを追加");
    await user.click(screen.getByRole("button", { name: "月" }));

    // 今日（2026-06-01）のセル内の input を取得
    const todayCell = container.querySelector(".mcell.today");
    expect(todayCell).not.toBeNull();
    const todayInput = todayCell!.querySelector("input.add-input") as HTMLInputElement;
    expect(todayInput).not.toBeNull();

    await user.click(todayInput);
    await user.type(todayInput, "月ビュータスク");
    await user.keyboard("{Enter}");

    expect(mockedCreateTask).toHaveBeenCalledWith("月ビュータスク", "2026-06-01");
    expect(await screen.findByText("月ビュータスク")).toBeInTheDocument();
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

    // 読み込み完了を待つ
    const inputs = await screen.findAllByPlaceholderText("タスクを追加");
    // 月曜列（最初の列）のinputに入力
    await user.click(inputs[0]);
    await user.type(inputs[0], "新タスク");
    await user.keyboard("{Enter}");

    expect(mockedCreateTask).toHaveBeenCalledWith("新タスク", "2026-06-01");
    expect(await screen.findByText("新タスク")).toBeInTheDocument();
  });
});
