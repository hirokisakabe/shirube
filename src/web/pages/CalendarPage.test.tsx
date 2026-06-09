import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeTask, setMockTasks } from "../test/handlers";
import { server } from "../test/server";
import { CalendarPage } from "./CalendarPage";

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-router")>();
	return { ...actual, Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> };
});

// Fix Date to 2026-06-01 (Monday) — week starts on 2026-06-01 (Mon) in Monday-start convention
const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("CalendarPage", () => {
	it("週単位でタスクが日付軸に表示される", async () => {
		setMockTasks([
			makeTask({ id: 1, title: "月曜タスク", date: "2026-06-01" }),
			makeTask({ id: 2, title: "水曜タスク", date: "2026-06-03" }),
		]);

		render(<CalendarPage />);

		expect(await screen.findByText("月曜タスク")).toBeInTheDocument();
		expect(screen.getByText("水曜タスク")).toBeInTheDocument();
		expect(screen.queryByText("今週 完了")).not.toBeInTheDocument();
		expect(screen.queryByText("%")).not.toBeInTheDocument();
	});

	it("週表示の長いタスク名に全文確認用のtitleが付く", async () => {
		const longTitle = "週表示で省略される可能性があるとても長いタスク名";
		setMockTasks([makeTask({ id: 1, title: longTitle })]);

		render(<CalendarPage />);

		expect(await screen.findByText(longTitle)).toHaveAttribute("title", expect.stringContaining(longTitle));
	});

	it("月表示の長いタスク名に全文確認用のtitleが付く", async () => {
		const longTitle = "月表示で省略される可能性があるとても長いタスク名";
		setMockTasks([makeTask({ id: 1, title: longTitle })]);

		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
		render(<CalendarPage />);

		await screen.findByText(longTitle);
		await user.click(screen.getByRole("button", { name: "月" }));

		expect(screen.getByText(longTitle)).toHaveAttribute("title", longTitle);
	});

	it("完了タスクと未完了タスクが視覚的に区別できる", async () => {
		setMockTasks([
			makeTask({ id: 1, title: "未完了タスク" }),
			makeTask({ id: 2, title: "完了タスク", doneAt: "2026-06-01T10:00:00.000Z" }),
		]);

		render(<CalendarPage />);

		const undoneEl = await screen.findByText("未完了タスク");
		const doneEl = screen.getByText("完了タスク");

		expect(undoneEl.closest("[data-todo-done]")).toHaveAttribute("data-todo-done", "false");
		expect(doneEl.closest("[data-todo-done]")).toHaveAttribute("data-todo-done", "true");
	});

	it("add inputにタスクを入力してEnterで追加できる", async () => {
		setMockTasks([]);

		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
		render(<CalendarPage />);

		const inputs = await screen.findAllByPlaceholderText("タスクを追加");
		await user.click(inputs[0]);
		await user.type(inputs[0], "新タスク");
		await user.keyboard("{Enter}");

		expect(await screen.findByText("新タスク")).toBeInTheDocument();
	});

	it("週表示でタスクを完了・削除できる", async () => {
		setMockTasks([makeTask({ id: 1, title: "操作対象タスク" })]);
		const requests: Array<{ method: string; id: string; body?: unknown }> = [];
		server.use(
			http.patch("/api/tasks/:id", async ({ params, request }) => {
				const body = await request.json() as { doneAt?: string | null };
				requests.push({ method: "PATCH", id: String(params.id), body });
				return HttpResponse.json(makeTask({ id: 1, title: "操作対象タスク", ...body }));
			}),
			http.delete("/api/tasks/:id", ({ params }) => {
				requests.push({ method: "DELETE", id: String(params.id) });
				return HttpResponse.json(makeTask({ id: 1, title: "操作対象タスク", deletedAt: "2026-06-01T12:00:00.000Z" }));
			}),
		);

		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
		render(<CalendarPage />);

		const item = (await screen.findByText("操作対象タスク")).closest("[data-todo-done]");
		expect(item).toHaveAttribute("data-todo-done", "false");

		await user.click(screen.getByLabelText("完了にする"));

		expect(item).toHaveAttribute("data-todo-done", "true");
		await waitFor(() => {
			expect(requests).toContainEqual({
				method: "PATCH",
				id: "1",
				body: { doneAt: expect.any(String) },
			});
		});

		await user.click(screen.getByTitle("削除"));

		expect(screen.queryByText("操作対象タスク")).not.toBeInTheDocument();
		await waitFor(() => {
			expect(requests).toContainEqual({ method: "DELETE", id: "1" });
		});
	});
});
