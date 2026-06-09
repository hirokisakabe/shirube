import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { makeGoal, setMockGoals } from "../test/handlers";
import { renderWithQueryClient } from "../test/render";
import { server } from "../test/server";
import { GoalPage } from "./GoalPage";

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-router")>();
	return {
		...actual,
		Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
			<a href={to}>{children}</a>
		),
	};
});

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("GoalPage", () => {
	it("目標一覧が表示される", async () => {
		setMockGoals([
			makeGoal({ id: 1, title: "目標A" }),
			makeGoal({ id: 2, title: "目標B" }),
		]);

		renderWithQueryClient(<GoalPage />);

		expect(await screen.findByText("目標A")).toBeInTheDocument();
		expect(screen.getByText("目標B")).toBeInTheDocument();
	});

	it("長い目標名に全文確認用のtitleが付く", async () => {
		const longTitle = "目標一覧で省略される可能性があるとても長い目標名";
		setMockGoals([makeGoal({ id: 1, title: longTitle })]);

		renderWithQueryClient(<GoalPage />);

		expect(await screen.findByText(longTitle)).toHaveAttribute(
			"title",
			longTitle,
		);
	});

	it("目標がない場合にメッセージを表示する", async () => {
		setMockGoals([]);

		renderWithQueryClient(<GoalPage />);

		expect(await screen.findByText("目標がありません")).toBeInTheDocument();
	});

	it("Enter キーで目標を追加できる", async () => {
		setMockGoals([]);

		const user = userEvent.setup({
			advanceTimers: vi.advanceTimersByTime.bind(vi),
		});
		renderWithQueryClient(<GoalPage />);

		await screen.findByPlaceholderText("目標を追加");
		await user.type(
			screen.getByPlaceholderText("目標を追加"),
			"新しい目標{Enter}",
		);

		expect(await screen.findByText("新しい目標")).toBeInTheDocument();
	});

	it("達成ボタンで showAchieved === false のとき一覧から消える", async () => {
		setMockGoals([makeGoal({ id: 1, title: "消える目標" })]);

		const user = userEvent.setup({
			advanceTimers: vi.advanceTimersByTime.bind(vi),
		});
		renderWithQueryClient(<GoalPage />);

		await screen.findByText("消える目標");
		await user.click(screen.getByRole("button", { name: "達成済みにする" }));

		await waitFor(() => {
			expect(screen.queryByText("消える目標")).not.toBeInTheDocument();
		});
	});

	it("「達成済みを表示」フィルタ切替で達成済みの目標を表示する", async () => {
		setMockGoals([
			makeGoal({
				id: 1,
				title: "達成済み目標",
				doneAt: "2026-06-01T12:00:00.000Z",
			}),
		]);

		const user = userEvent.setup({
			advanceTimers: vi.advanceTimersByTime.bind(vi),
		});
		renderWithQueryClient(<GoalPage />);

		await screen.findByText("目標がありません");
		await user.click(screen.getByRole("button", { name: /達成済みを表示/ }));

		expect(await screen.findByText("達成済み目標")).toBeInTheDocument();
	});

	it("削除ボタンで目標が消え、失敗時に復元される", async () => {
		setMockGoals([makeGoal({ id: 1, title: "削除目標" })]);
		server.use(
			http.delete("/api/goals/:id", () =>
				HttpResponse.json({ error: "network error" }, { status: 500 }),
			),
		);

		const user = userEvent.setup({
			advanceTimers: vi.advanceTimersByTime.bind(vi),
		});
		renderWithQueryClient(<GoalPage />);

		await screen.findByText("削除目標");
		await user.click(screen.getByTitle("削除"));

		await waitFor(() => {
			expect(screen.getByText("削除目標")).toBeInTheDocument();
		});
	});

	it("取得エラー時にエラーメッセージを表示する", async () => {
		server.use(
			http.get("/api/goals", () =>
				HttpResponse.json({ error: "network error" }, { status: 500 }),
			),
		);

		renderWithQueryClient(<GoalPage />);

		expect(await screen.findByText(/エラー/)).toBeInTheDocument();
	});
});
