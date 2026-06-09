import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { makeTask, setMockTasks } from "../test/handlers";
import { server } from "../test/server";
import { TaskListPage } from "./TaskListPage";

afterEach(() => {
	cleanup();
});

describe("TaskListPage", () => {
	it("タスク一覧を表示する", async () => {
		setMockTasks([makeTask({ id: 1, title: "タスク A" })]);

		render(<TaskListPage />);
		expect(await screen.findByText("タスク A")).toBeInTheDocument();
	});

	it("タスクが 0 件のとき「タスクがありません」を表示する", async () => {
		setMockTasks([]);

		render(<TaskListPage />);
		expect(await screen.findByText("タスクがありません")).toBeInTheDocument();
	});

	it("API エラー時にエラーメッセージを表示する", async () => {
		server.use(http.get("/api/tasks", () => HttpResponse.json({ error: "network error" }, { status: 500 })));

		render(<TaskListPage />);
		expect(await screen.findByText(/エラー/)).toBeInTheDocument();
	});
});
