import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as goalsApi from "../api/goals";
import { GoalPage } from "./GoalPage";

vi.mock("../api/goals");
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> };
});

const mockedFetchGoals = vi.mocked(goalsApi.fetchGoals);
const mockedCreateGoal = vi.mocked(goalsApi.createGoal);
const mockedUpdateGoal = vi.mocked(goalsApi.updateGoal);
const mockedDeleteGoal = vi.mocked(goalsApi.deleteGoal);

const makeGoal = (overrides: Partial<goalsApi.Goal> = {}): goalsApi.Goal => ({
  id: 1,
  title: "テスト目標",
  doneAt: null,
  deletedAt: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
  mockedFetchGoals.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GoalPage", () => {
  it("目標一覧が表示される", async () => {
    mockedFetchGoals.mockResolvedValue([
      makeGoal({ id: 1, title: "目標A" }),
      makeGoal({ id: 2, title: "目標B" }),
    ]);

    render(<GoalPage />);

    expect(await screen.findByText("目標A")).toBeInTheDocument();
    expect(screen.getByText("目標B")).toBeInTheDocument();
  });

  it("長い目標名に全文確認用のtitleが付く", async () => {
    const longTitle = "目標一覧で省略される可能性があるとても長い目標名";
    mockedFetchGoals.mockResolvedValue([
      makeGoal({ id: 1, title: longTitle }),
    ]);

    render(<GoalPage />);

    expect(await screen.findByText(longTitle)).toHaveAttribute("title", longTitle);
  });

  it("目標がない場合にメッセージを表示する", async () => {
    mockedFetchGoals.mockResolvedValue([]);

    render(<GoalPage />);

    expect(await screen.findByText("目標がありません")).toBeInTheDocument();
  });

  it("Enter キーで目標を追加できる", async () => {
    const newGoal = makeGoal({ id: 10, title: "新しい目標" });
    mockedCreateGoal.mockResolvedValue(newGoal);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<GoalPage />);

    await screen.findByPlaceholderText("目標を追加");
    await user.type(screen.getByPlaceholderText("目標を追加"), "新しい目標{Enter}");

    await waitFor(() => {
      expect(mockedCreateGoal).toHaveBeenCalledWith("新しい目標");
    });
    expect(await screen.findByText("新しい目標")).toBeInTheDocument();
  });

  it("達成ボタンで showAchieved === false のとき一覧から消える", async () => {
    const goal = makeGoal({ id: 1, title: "消える目標" });
    mockedFetchGoals.mockResolvedValue([goal]);
    mockedUpdateGoal.mockResolvedValue({ ...goal, doneAt: "2026-06-01T12:00:00.000Z" });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<GoalPage />);

    await screen.findByText("消える目標");
    await user.click(screen.getByRole("button", { name: "達成済みにする" }));

    await waitFor(() => {
      expect(screen.queryByText("消える目標")).not.toBeInTheDocument();
    });
  });

  it("「達成済みを表示」フィルタ切替で fetchGoals が再呼び出される", async () => {
    mockedFetchGoals.mockResolvedValue([]);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<GoalPage />);

    await screen.findByText("目標がありません");
    await user.click(screen.getByRole("button", { name: /達成済みを表示/ }));

    await waitFor(() => {
      expect(mockedFetchGoals).toHaveBeenCalledWith(true);
    });
  });

  it("削除ボタンで目標が消え、失敗時に復元される", async () => {
    const goal = makeGoal({ id: 1, title: "削除目標" });
    mockedFetchGoals.mockResolvedValue([goal]);
    mockedDeleteGoal.mockRejectedValue(new Error("network error"));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<GoalPage />);

    await screen.findByText("削除目標");
    await user.click(screen.getByTitle("削除"));

    await waitFor(() => {
      expect(screen.getByText("削除目標")).toBeInTheDocument();
    });
  });

  it("取得エラー時にエラーメッセージを表示する", async () => {
    mockedFetchGoals.mockRejectedValue(new Error("network error"));

    render(<GoalPage />);

    expect(await screen.findByText(/エラー/)).toBeInTheDocument();
  });
});
