import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { makeReview, setMockReviews } from "../test/handlers";
import { server } from "../test/server";
import { ReviewPage } from "./ReviewPage";

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-router")>();
	return { ...actual, Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> };
});

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z"); // 2026-W23 (月曜 6/1)

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("ReviewPage", () => {
	it("今週の振り返りが表示される", async () => {
		setMockReviews([makeReview({ id: 1, week: "2026-W23", content: "今週の振り返り内容" })]);

		render(<ReviewPage />);

		expect(await screen.findByDisplayValue("今週の振り返り内容")).toBeInTheDocument();
	});

	it("週ナビゲーション: 前週ボタンで週が変わる", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
		render(<ReviewPage />);

		await screen.findByText(/6\/1週/);

		await user.click(screen.getByRole("button", { name: "前の週" }));
		expect(await screen.findByText(/5\/25週/)).toBeInTheDocument();
	});

	it("週ナビゲーション: 次週ボタンで週が変わる", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
		render(<ReviewPage />);

		await screen.findByText(/6\/1週/);

		await user.click(screen.getByRole("button", { name: "次の週" }));
		expect(await screen.findByText(/6\/8週/)).toBeInTheDocument();
	});

	it("今週ボタン: 別の週から今週に戻れる", async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
		render(<ReviewPage />);

		await screen.findByText(/6\/1週/);

		await user.click(screen.getByRole("button", { name: "前の週" }));
		await screen.findByText(/5\/25週/);

		await user.click(screen.getByRole("button", { name: "今週" }));
		expect(await screen.findByText(/6\/1週/)).toBeInTheDocument();
	});

	it("振り返りを保存できる", async () => {
		setMockReviews([]);

		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
		render(<ReviewPage />);

		const textarea = await screen.findByRole("textbox");
		await user.type(textarea, "新しい振り返り");
		await user.click(screen.getByRole("button", { name: "保存" }));

		expect(await screen.findByText("保存しました")).toBeInTheDocument();
	});

	it("取得エラー時にエラーメッセージを表示する", async () => {
		server.use(http.get("/api/reviews/:week", () => HttpResponse.json({ error: "network error" }, { status: 500 })));

		render(<ReviewPage />);

		expect(await screen.findByText(/エラー/)).toBeInTheDocument();
	});

	it("過去の振り返り一覧が表示される", async () => {
		setMockReviews([
			makeReview({
				id: 1,
				week: "2026-W22",
				content: "先週の振り返り",
				createdAt: "2026-05-25T00:00:00.000Z",
				updatedAt: "2026-05-25T00:00:00.000Z",
			}),
		]);

		render(<ReviewPage />);

		expect(await screen.findByText(/5\/25週/)).toBeInTheDocument();
	});
});
