import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeTask,
  makeWeeklyCycle,
  setMockTasks,
  setMockWeeklyCycles,
} from "../test/handlers";
import { renderWithQueryClient } from "../test/render";
import { server } from "../test/server";
import { CalendarPage } from "./CalendarPage";

// Fix Date to 2026-06-01 (Monday) — week starts on 2026-06-01 (Mon) in Monday-start convention
const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

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

    renderWithQueryClient(<CalendarPage />);

    expect(await screen.findByText("月曜タスク")).toBeInTheDocument();
    expect(screen.getByText("水曜タスク")).toBeInTheDocument();
    expect(screen.queryByText("今週 完了")).not.toBeInTheDocument();
    expect(screen.queryByText("%")).not.toBeInTheDocument();
  });

  it("Inboxで日付未設定タスクを追加・編集・完了・削除・日付移動できる", async () => {
    let tasks = [
      makeTask({ id: 1, title: "Inbox完了移動", date: null }),
      makeTask({ id: 2, title: "Inbox編集", date: null }),
      makeTask({ id: 3, title: "Inbox削除", date: null }),
      makeTask({ id: 4, title: "日付付きタスク", date: "2026-06-01" }),
    ];
    setMockTasks(tasks);
    const requests: Array<{ method: string; id?: string; body?: unknown }> = [];
    server.use(
      http.get("/api/tasks", () =>
        HttpResponse.json(tasks.filter((task) => !task.deletedAt)),
      ),
      http.post("/api/tasks", async ({ request }) => {
        const body = (await request.json()) as {
          title: string;
          date: string | null;
        };
        requests.push({ method: "POST", body });
        const task = makeTask({ id: 5, ...body });
        tasks = [...tasks, task];
        return HttpResponse.json(task, { status: 201 });
      }),
      http.patch("/api/tasks/:id", async ({ params, request }) => {
        const id = Number(params.id);
        const body = (await request.json()) as {
          doneAt?: string | null;
          title?: string;
          date?: string | null;
        };
        requests.push({ method: "PATCH", id: String(params.id), body });
        tasks = tasks.map((task) =>
          task.id === id ? { ...task, ...body } : task,
        );
        return HttpResponse.json(tasks.find((task) => task.id === id));
      }),
      http.delete("/api/tasks/:id", ({ params }) => {
        const id = Number(params.id);
        requests.push({ method: "DELETE", id: String(params.id) });
        tasks = tasks.map((task) =>
          task.id === id
            ? { ...task, deletedAt: "2026-06-01T12:00:00.000Z" }
            : task,
        );
        return HttpResponse.json(tasks.find((task) => task.id === id));
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const { container } = renderWithQueryClient(<CalendarPage />);

    const inbox = await screen.findByRole("complementary", {
      name: "日付未設定",
    });
    expect(within(inbox).getByText("Inbox完了移動")).toBeInTheDocument();
    expect(within(inbox).getByText("Inbox編集")).toBeInTheDocument();
    expect(within(inbox).getByText("Inbox削除")).toBeInTheDocument();
    const calendarMain = container.querySelector(
      "[data-calendar-main]",
    ) as HTMLElement;
    expect(
      within(calendarMain).queryByText("Inbox完了移動"),
    ).not.toBeInTheDocument();
    expect(
      within(calendarMain).getByText("日付付きタスク"),
    ).toBeInTheDocument();

    await user.click(within(inbox).getByPlaceholderText("タスクを追加"));
    await user.type(
      within(inbox).getByPlaceholderText("タスクを追加"),
      "Inbox追加{Enter}",
    );
    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "POST",
        body: { title: "Inbox追加", date: null },
      });
    });
    expect(await within(inbox).findByText("Inbox追加")).toBeInTheDocument();

    await user.click(
      within(
        within(inbox)
          .getByText("Inbox完了移動")
          .closest("[data-todo-done]") as HTMLElement,
      ).getByLabelText("完了にする"),
    );
    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "1",
        body: { doneAt: expect.any(String) },
      });
    });

    await user.dblClick(within(inbox).getByText("Inbox編集"));
    const editInput = within(inbox).getByDisplayValue("Inbox編集");
    await user.clear(editInput);
    await user.type(editInput, "Inbox編集後{Enter}");
    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "2",
        body: { title: "Inbox編集後" },
      });
    });

    await user.click(
      within(
        within(inbox)
          .getByText("Inbox削除")
          .closest("[data-todo-done]") as HTMLElement,
      ).getByTitle("削除"),
    );
    expect(within(inbox).queryByText("Inbox削除")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(requests).toContainEqual({ method: "DELETE", id: "3" });
    });

    const moveDateInput =
      within(inbox).getByLabelText("Inbox完了移動の移動先日付");
    fireEvent.change(moveDateInput, { target: { value: "2026-06-03" } });
    await user.click(
      within(
        moveDateInput.closest("[data-inbox-task]") as HTMLElement,
      ).getByRole("button", { name: "移動" }),
    );
    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "1",
        body: { date: "2026-06-03" },
      });
    });
    expect(within(inbox).queryByText("Inbox完了移動")).not.toBeInTheDocument();
    const wednesdayColumn = screen
      .getByText("3")
      .closest("[data-week-day]") as HTMLElement;
    expect(
      within(wednesdayColumn).getByText("Inbox完了移動"),
    ).toBeInTheDocument();

    await user.click(within(wednesdayColumn).getByTitle("Inboxへ戻す"));
    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "1",
        body: { date: null },
      });
    });
    expect(await within(inbox).findByText("Inbox完了移動")).toBeInTheDocument();
    expect(
      within(wednesdayColumn).queryByText("Inbox完了移動"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "月" }));
    expect(within(inbox).getByText("Inbox編集後")).toBeInTheDocument();
    expect(
      within(
        container.querySelector("[data-calendar-main]") as HTMLElement,
      ).queryByText("Inbox編集後"),
    ).not.toBeInTheDocument();
  });

  it("週表示では週次サイクルドロワーがデフォルトで閉じている", async () => {
    renderWithQueryClient(<CalendarPage />);

    await screen.findAllByPlaceholderText("タスクを追加");

    expect(
      screen.getByRole("button", { name: "週次サイクルを開く" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("日付未設定を最小化して再度開ける", async () => {
    setMockTasks([makeTask({ id: 1, title: "Inboxタスク", date: null })]);
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    const inbox = await screen.findByRole("complementary", {
      name: "日付未設定",
    });
    expect(within(inbox).getByText("Inboxタスク")).toBeInTheDocument();
    expect(
      within(inbox).getByPlaceholderText("タスクを追加"),
    ).toBeInTheDocument();

    await user.click(
      within(inbox).getByRole("button", { name: "日付未設定を最小化" }),
    );

    expect(within(inbox).queryByText("Inboxタスク")).not.toBeInTheDocument();
    expect(
      within(inbox).queryByPlaceholderText("タスクを追加"),
    ).not.toBeInTheDocument();
    expect(
      within(inbox).getByRole("button", { name: "日付未設定を開く" }),
    ).toBeInTheDocument();

    await user.click(
      within(inbox).getByRole("button", { name: "日付未設定を開く" }),
    );

    expect(await within(inbox).findByText("Inboxタスク")).toBeInTheDocument();
    expect(
      within(inbox).getByPlaceholderText("タスクを追加"),
    ).toBeInTheDocument();
  });

  it("週表示のボタンから対象週の週次サイクルパネルを開ける", async () => {
    setMockWeeklyCycles([
      makeWeeklyCycle({
        id: 1,
        week: "2026-W23",
        goalContent: "今週の目標内容",
        reviewContent: "今週の振り返り内容",
      }),
    ]);
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await user.click(
      await screen.findByRole("button", { name: "週次サイクルを開く" }),
    );

    const panel = await screen.findByRole("complementary", {
      name: "週次サイクル",
    });
    expect(
      within(panel).getByRole("button", { name: "週次サイクルを最小化" }),
    ).toBeInTheDocument();
    expect(
      await within(panel).findByDisplayValue("今週の目標内容"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByDisplayValue("今週の振り返り内容"),
    ).toBeInTheDocument();
  });

  it("週次サイクルパネルから目標とふりかえりを保存できる", async () => {
    setMockWeeklyCycles([]);
    const requests: Array<{ week: string; body: unknown }> = [];
    server.use(
      http.put("/api/weekly-cycles/:week", async ({ params, request }) => {
        const body = await request.json();
        requests.push({ week: String(params.week), body });
        return HttpResponse.json(
          makeWeeklyCycle({
            id: 1,
            week: String(params.week),
            goalContent: (body as { goalContent: string }).goalContent,
            reviewContent: (body as { reviewContent: string }).reviewContent,
          }),
        );
      }),
    );
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await user.click(
      await screen.findByRole("button", { name: "週次サイクルを開く" }),
    );
    const panel = await screen.findByRole("complementary", {
      name: "週次サイクル",
    });
    const [goalTextarea, reviewTextarea] =
      within(panel).getAllByRole("textbox");
    await user.type(goalTextarea, "新しい目標");
    await user.type(reviewTextarea, "新しいふりかえり");
    await user.click(within(panel).getByRole("button", { name: "保存" }));

    expect(await screen.findByText("保存しました")).toBeInTheDocument();
    expect(requests).toContainEqual({
      week: "2026-W23",
      body: { goalContent: "新しい目標", reviewContent: "新しいふりかえり" },
    });
  });

  it("週を移動すると開いている週次サイクルパネルの内容も切り替わる", async () => {
    setMockWeeklyCycles([
      makeWeeklyCycle({
        id: 1,
        week: "2026-W23",
        goalContent: "今週の目標",
        reviewContent: "今週の振り返り",
      }),
      makeWeeklyCycle({
        id: 2,
        week: "2026-W24",
        goalContent: "次週の目標",
        reviewContent: "次週の振り返り",
      }),
    ]);
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await user.click(
      await screen.findByRole("button", { name: "週次サイクルを開く" }),
    );
    const panel = await screen.findByRole("complementary", {
      name: "週次サイクル",
    });
    expect(
      await within(panel).findByDisplayValue("今週の目標"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(
      await within(panel).findByDisplayValue("次週の目標"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByDisplayValue("次週の振り返り"),
    ).toBeInTheDocument();
  });

  it("月表示では週次サイクルパネルが表示されない", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await screen.findAllByPlaceholderText("タスクを追加");
    await user.click(screen.getByRole("button", { name: "月" }));

    expect(
      screen.queryByRole("button", { name: "週次サイクルを開く" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "週次サイクル" }),
    ).not.toBeInTheDocument();
  });

  it("週次サイクルパネルを最小化して再度開ける", async () => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await user.click(
      await screen.findByRole("button", { name: "週次サイクルを開く" }),
    );
    const panel = await screen.findByRole("complementary", {
      name: "週次サイクル",
    });
    expect(
      within(panel).getByRole("button", { name: "週次サイクルを最小化" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("textbox", { name: "目標" }),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", { name: "週次サイクルを最小化" }),
    );
    expect(
      within(panel).queryByRole("textbox", { name: "目標" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "週次サイクルを開く" }),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", { name: "週次サイクルを開く" }),
    );
    expect(
      within(panel).getByRole("textbox", { name: "目標" }),
    ).toBeInTheDocument();
  });

  it("週表示の長いタスク名に全文確認用のtitleが付く", async () => {
    const longTitle = "週表示で省略される可能性があるとても長いタスク名";
    setMockTasks([makeTask({ id: 1, title: longTitle })]);

    renderWithQueryClient(<CalendarPage />);

    expect(await screen.findByText(longTitle)).toHaveAttribute(
      "title",
      expect.stringContaining(longTitle),
    );
  });

  it("月表示の長いタスク名に全文確認用のtitleが付く", async () => {
    const longTitle = "月表示で省略される可能性があるとても長いタスク名";
    setMockTasks([makeTask({ id: 1, title: longTitle })]);

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await screen.findByText(longTitle);
    await user.click(screen.getByRole("button", { name: "月" }));

    expect(screen.getByText(longTitle)).toHaveAttribute("title", longTitle);
  });

  it("完了タスクと未完了タスクが視覚的に区別できる", async () => {
    setMockTasks([
      makeTask({ id: 1, title: "未完了タスク" }),
      makeTask({
        id: 2,
        title: "完了タスク",
        doneAt: "2026-06-01T10:00:00.000Z",
      }),
    ]);

    renderWithQueryClient(<CalendarPage />);

    const undoneEl = await screen.findByText("未完了タスク");
    const doneEl = screen.getByText("完了タスク");

    expect(undoneEl.closest("[data-todo-done]")).toHaveAttribute(
      "data-todo-done",
      "false",
    );
    expect(doneEl.closest("[data-todo-done]")).toHaveAttribute(
      "data-todo-done",
      "true",
    );
  });

  it("add inputにタスクを入力してEnterで追加できる", async () => {
    setMockTasks([]);
    const postResponse = deferred();
    let savedTask: ReturnType<typeof makeTask> | null = null;
    let patchRequestCount = 0;
    let deleteRequestCount = 0;
    server.use(
      http.get("/api/tasks", () =>
        HttpResponse.json(savedTask ? [savedTask] : []),
      ),
      http.post("/api/tasks", async ({ request }) => {
        const body = (await request.json()) as { title: string; date: string };
        await postResponse.promise;
        savedTask = makeTask({ id: 1, ...body });
        return HttpResponse.json(savedTask, {
          status: 201,
        });
      }),
      http.patch("/api/tasks/:id", () => {
        patchRequestCount += 1;
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }),
      http.delete("/api/tasks/:id", () => {
        deleteRequestCount += 1;
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    const inputs = await screen.findAllByPlaceholderText("タスクを追加");
    await user.click(inputs[0]);
    await user.type(inputs[0], "新タスク");
    await user.keyboard("{Enter}");

    expect(screen.getByText("新タスク")).toBeInTheDocument();
    const optimisticItem = screen
      .getByText("新タスク")
      .closest("[data-todo-done]") as HTMLElement;
    const optimisticCheck = within(optimisticItem).getByLabelText("完了にする");
    const optimisticRemove = optimisticItem.querySelector(
      "[data-task-action='remove']",
    ) as HTMLButtonElement;

    expect(optimisticItem).toHaveAttribute("draggable", "false");
    expect(optimisticCheck).toBeDisabled();
    expect(optimisticRemove).toBeDisabled();
    fireEvent.click(optimisticCheck);
    fireEvent.click(optimisticRemove);
    expect(patchRequestCount).toBe(0);
    expect(deleteRequestCount).toBe(0);

    postResponse.resolve();
    await waitFor(() => {
      expect(screen.getByLabelText("完了にする")).toBeEnabled();
    });
    expect(
      screen.getByText("新タスク").closest("[data-todo-done]"),
    ).toHaveAttribute("draggable", "true");
  });

  it("週表示でタスクを完了・削除できる", async () => {
    let task = makeTask({ id: 1, title: "操作対象タスク" });
    setMockTasks([task]);
    const requests: Array<{ method: string; id: string; body?: unknown }> = [];
    const patchResponse = deferred();
    const deleteResponse = deferred();
    server.use(
      http.get("/api/tasks", () =>
        HttpResponse.json(task.deletedAt ? [] : [task]),
      ),
      http.patch("/api/tasks/:id", async ({ params, request }) => {
        const body = (await request.json()) as { doneAt?: string | null };
        requests.push({ method: "PATCH", id: String(params.id), body });
        await patchResponse.promise;
        task = { ...task, ...body };
        return HttpResponse.json(task);
      }),
      http.delete("/api/tasks/:id", async ({ params }) => {
        requests.push({ method: "DELETE", id: String(params.id) });
        await deleteResponse.promise;
        task = { ...task, deletedAt: "2026-06-01T12:00:00.000Z" };
        return HttpResponse.json(task);
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    const item = (await screen.findByText("操作対象タスク")).closest(
      "[data-todo-done]",
    );
    expect(item).toHaveAttribute("data-todo-done", "false");

    await user.click(screen.getByLabelText("完了にする"));

    expect(
      screen.getByText("操作対象タスク").closest("[data-todo-done]"),
    ).toHaveAttribute("data-todo-done", "true");
    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "1",
        body: { doneAt: expect.any(String) },
      });
    });
    patchResponse.resolve();
    await waitFor(() => {
      expect(
        screen.getByText("操作対象タスク").closest("[data-todo-done]"),
      ).toHaveAttribute("data-todo-done", "true");
    });

    await user.click(screen.getByTitle("削除"));

    expect(screen.queryByText("操作対象タスク")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(requests).toContainEqual({ method: "DELETE", id: "1" });
    });
    deleteResponse.resolve();
    await waitFor(() => {
      expect(screen.queryByText("操作対象タスク")).not.toBeInTheDocument();
    });
  });

  it("週表示でタスクを編集して別日に移動できる", async () => {
    let task = makeTask({ id: 1, title: "編集前タスク" });
    setMockTasks([task]);
    const requests: Array<{ id: string; body?: unknown }> = [];
    const titlePatchResponse = deferred();
    const movePatchResponse = deferred();
    let patchCallCount = 0;
    server.use(
      http.get("/api/tasks", () => HttpResponse.json([task])),
      http.patch("/api/tasks/:id", async ({ params, request }) => {
        const body = (await request.json()) as {
          title?: string;
          date?: string;
        };
        requests.push({ id: String(params.id), body });
        patchCallCount += 1;
        await (patchCallCount === 1
          ? titlePatchResponse.promise
          : movePatchResponse.promise);
        task = { ...task, ...body };
        return HttpResponse.json(task);
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await user.dblClick(await screen.findByText("編集前タスク"));
    const editInput = screen.getByDisplayValue("編集前タスク");
    await user.clear(editInput);
    await user.type(editInput, "編集後タスク{Enter}");

    expect(screen.getByText("編集後タスク")).toBeInTheDocument();
    await waitFor(() => {
      expect(requests).toContainEqual({
        id: "1",
        body: { title: "編集後タスク" },
      });
    });
    titlePatchResponse.resolve();
    await waitFor(() => {
      expect(screen.getByText("編集後タスク")).toBeInTheDocument();
    });

    const dataTransfer = {
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      getData(type: string) {
        return this.data.get(type) ?? "";
      },
      effectAllowed: "move",
    };
    const todo = screen.getByText("編集後タスク").closest("[draggable]");
    const wednesdayColumn = screen.getByText("3").closest("[data-week-day]");
    fireEvent.dragStart(todo as Element, { dataTransfer });
    fireEvent.drop(wednesdayColumn as Element, { dataTransfer });

    await waitFor(() => {
      expect(
        within(wednesdayColumn as HTMLElement).getByText("編集後タスク"),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(requests).toContainEqual({
        id: "1",
        body: { date: "2026-06-03" },
      });
    });
    movePatchResponse.resolve();
    await waitFor(() => {
      expect(
        within(wednesdayColumn as HTMLElement).getByText("編集後タスク"),
      ).toBeInTheDocument();
    });
  });

  it("タスク操作失敗時にrollbackして失敗表示と再取得を行う", async () => {
    const task = makeTask({ id: 1, title: "失敗確認タスク" });
    setMockTasks([task]);
    let fetchCount = 0;
    const patchResponse = deferred();
    server.use(
      http.get("/api/tasks", () => {
        fetchCount += 1;
        return HttpResponse.json([task]);
      }),
      http.patch("/api/tasks/:id", async () => {
        await patchResponse.promise;
        return HttpResponse.json({ error: "network error" }, { status: 500 });
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    expect(
      (await screen.findByText("失敗確認タスク")).closest("[data-todo-done]"),
    ).toHaveAttribute("data-todo-done", "false");

    await user.click(screen.getByLabelText("完了にする"));

    expect(
      screen.getByText("失敗確認タスク").closest("[data-todo-done]"),
    ).toHaveAttribute("data-todo-done", "true");
    patchResponse.resolve();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "タスク操作に失敗しました",
    );
    expect(
      screen.getByText("失敗確認タスク").closest("[data-todo-done]"),
    ).toHaveAttribute("data-todo-done", "false");
    await waitFor(() => {
      expect(fetchCount).toBeGreaterThanOrEqual(2);
    });
  });

  it("並行操作の一方が失敗しても他方の楽観更新を巻き戻さない", async () => {
    let tasks = [
      makeTask({ id: 1, title: "失敗するタスク" }),
      makeTask({ id: 2, title: "維持するタスク" }),
    ];
    const firstPatchResponse = deferred();
    server.use(
      http.get("/api/tasks", () => HttpResponse.json(tasks)),
      http.patch("/api/tasks/:id", async ({ params, request }) => {
        const id = Number(params.id);
        const body = (await request.json()) as { doneAt?: string | null };
        if (id === 1) {
          await firstPatchResponse.promise;
          return HttpResponse.json({ error: "network error" }, { status: 500 });
        }
        tasks = tasks.map((task) =>
          task.id === id ? { ...task, ...body } : task,
        );
        return HttpResponse.json(tasks.find((task) => task.id === id));
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await screen.findByText("失敗するタスク");
    await user.click(
      screen
        .getByText("失敗するタスク")
        .closest("[data-todo-done]")
        ?.querySelector("[aria-label='完了にする']") as Element,
    );
    await user.click(
      screen
        .getByText("維持するタスク")
        .closest("[data-todo-done]")
        ?.querySelector("[aria-label='完了にする']") as Element,
    );

    firstPatchResponse.resolve();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "タスク操作に失敗しました",
    );
    expect(
      screen.getByText("失敗するタスク").closest("[data-todo-done]"),
    ).toHaveAttribute("data-todo-done", "false");
    expect(
      screen.getByText("維持するタスク").closest("[data-todo-done]"),
    ).toHaveAttribute("data-todo-done", "true");
  });

  it("タスク追加失敗時に仮タスクを消して失敗表示と再取得を行う", async () => {
    setMockTasks([]);
    let fetchCount = 0;
    const postResponse = deferred();
    server.use(
      http.get("/api/tasks", () => {
        fetchCount += 1;
        return HttpResponse.json([]);
      }),
      http.post("/api/tasks", async () => {
        await postResponse.promise;
        return HttpResponse.json({ error: "network error" }, { status: 500 });
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    const inputs = await screen.findAllByPlaceholderText("タスクを追加");
    await user.click(inputs[0]);
    await user.type(inputs[0], "失敗する追加{Enter}");

    expect(screen.getByText("失敗する追加")).toBeInTheDocument();
    postResponse.resolve();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "タスク操作に失敗しました",
    );
    expect(screen.queryByText("失敗する追加")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(fetchCount).toBeGreaterThanOrEqual(2);
    });
  });

  it("タスク削除失敗時に削除前の表示へ戻して失敗表示と再取得を行う", async () => {
    const task = makeTask({ id: 1, title: "削除失敗タスク" });
    setMockTasks([task]);
    let fetchCount = 0;
    const deleteResponse = deferred();
    server.use(
      http.get("/api/tasks", () => {
        fetchCount += 1;
        return HttpResponse.json([task]);
      }),
      http.delete("/api/tasks/:id", async () => {
        await deleteResponse.promise;
        return HttpResponse.json({ error: "network error" }, { status: 500 });
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await screen.findByText("削除失敗タスク");
    await user.click(screen.getByTitle("削除"));

    expect(screen.queryByText("削除失敗タスク")).not.toBeInTheDocument();
    deleteResponse.resolve();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "タスク操作に失敗しました",
    );
    expect(screen.getByText("削除失敗タスク")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchCount).toBeGreaterThanOrEqual(2);
    });
  });

  it("タスク追加直後にはundoを表示しない", async () => {
    setMockTasks([]);
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    const inputs = await screen.findAllByPlaceholderText("タスクを追加");
    await user.click(inputs[0]);
    await user.type(inputs[0], "undo追加{Enter}");

    expect(await screen.findByText("undo追加")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("追加を取り消す")).not.toBeInTheDocument();
  });

  it("タスク名編集直後にはundoを表示しない", async () => {
    setMockTasks([makeTask({ id: 1, title: "編集前undo" })]);
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await user.dblClick(await screen.findByText("編集前undo"));
    const editInput = screen.getByDisplayValue("編集前undo");
    await user.clear(editInput);
    await user.type(editInput, "編集後undo{Enter}");

    expect(await screen.findByText("編集後undo")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("タスクを元に戻す")).not.toBeInTheDocument();
  });

  it("タスク完了切替直後にはundoを表示しない", async () => {
    setMockTasks([makeTask({ id: 1, title: "完了undo" })]);
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    expect(
      (await screen.findByText("完了undo")).closest("[data-todo-done]"),
    ).toHaveAttribute("data-todo-done", "false");

    await user.click(screen.getByLabelText("完了にする"));

    await waitFor(() => {
      expect(
        screen.getByText("完了undo").closest("[data-todo-done]"),
      ).toHaveAttribute("data-todo-done", "true");
    });
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("タスクを元に戻す")).not.toBeInTheDocument();
  });

  it("タスク削除直後にundoすると削除前の状態で一覧に戻る", async () => {
    setMockTasks([
      makeTask({
        id: 1,
        title: "削除undo",
        doneAt: "2026-06-01T09:00:00.000Z",
      }),
    ]);
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await screen.findByText("削除undo");
    await user.click(screen.getByTitle("削除"));

    await waitFor(() => {
      expect(screen.queryByText("削除undo")).not.toBeInTheDocument();
    });
    const undoToast = (await screen.findByText("削除を取り消す")).closest(
      "[role='status']",
    );
    expect(undoToast).toBeInTheDocument();

    const undoButton = screen.getByRole("button", { name: "Undo" });
    expect(undoButton).toBeEnabled();

    await user.click(undoButton);

    expect(await screen.findByText("削除undo")).toBeInTheDocument();
    expect(
      screen.getByText("削除undo").closest("[data-todo-done]"),
    ).toHaveAttribute("data-todo-done", "true");
  });

  it("undo復元に失敗すると失敗表示を出して保存状態に戻す", async () => {
    let task = makeTask({ id: 1, title: "復元失敗undo" });
    setMockTasks([task]);
    server.use(
      http.get("/api/tasks", () =>
        HttpResponse.json(task.deletedAt ? [] : [task]),
      ),
      http.delete("/api/tasks/:id", () => {
        task = { ...task, deletedAt: "2026-06-01T12:00:00.000Z" };
        return HttpResponse.json(task);
      }),
      http.patch("/api/tasks/:id", () =>
        HttpResponse.json({ error: "network error" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await screen.findByText("復元失敗undo");
    await user.click(screen.getByTitle("削除"));
    await waitFor(() => {
      expect(screen.queryByText("復元失敗undo")).not.toBeInTheDocument();
    });

    await user.click(await screen.findByRole("button", { name: "Undo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Undoに失敗しました",
    );
    await waitFor(() => {
      expect(screen.queryByText("復元失敗undo")).not.toBeInTheDocument();
    });
  });

  it("月表示で表示中タスクを追加・完了・編集・削除・移動できる", async () => {
    let task = makeTask({ id: 1, title: "月表示タスク" });
    setMockTasks([task]);
    const requests: Array<{ method: string; id?: string; body?: unknown }> = [];
    server.use(
      http.get("/api/tasks", () =>
        HttpResponse.json(task.deletedAt ? [] : [task]),
      ),
      http.post("/api/tasks", async ({ request }) => {
        const body = (await request.json()) as { title: string; date: string };
        requests.push({ method: "POST", body });
        return HttpResponse.json(makeTask({ id: 2, ...body }), {
          status: 201,
        });
      }),
      http.patch("/api/tasks/:id", async ({ params, request }) => {
        const body = (await request.json()) as {
          doneAt?: string | null;
          title?: string;
          date?: string;
        };
        requests.push({ method: "PATCH", id: String(params.id), body });
        task = { ...task, ...body };
        return HttpResponse.json(task);
      }),
      http.delete("/api/tasks/:id", ({ params }) => {
        requests.push({ method: "DELETE", id: String(params.id) });
        task = { ...task, deletedAt: "2026-06-01T12:00:00.000Z" };
        return HttpResponse.json(task);
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const { container } = renderWithQueryClient(<CalendarPage />);

    await screen.findByText("月表示タスク");
    await user.click(screen.getByRole("button", { name: "月" }));

    const calendarMain = container.querySelector(
      "[data-calendar-main]",
    ) as HTMLElement;
    const inputs = within(calendarMain).getAllByPlaceholderText("タスクを追加");
    await user.click(inputs[0]);
    await user.type(inputs[0], "月表示追加{Enter}");

    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "POST",
        body: { title: "月表示追加", date: "2026-06-01" },
      });
    });

    await user.click(screen.getByLabelText("完了にする"));

    await waitFor(() => {
      expect(
        screen.getByText("月表示タスク").closest("[data-todo-done]"),
      ).toHaveAttribute("data-todo-done", "true");
    });
    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "1",
        body: { doneAt: expect.any(String) },
      });
    });

    await user.dblClick(screen.getByText("月表示タスク"));
    const editInput = screen.getByDisplayValue("月表示タスク");
    await user.clear(editInput);
    await user.type(editInput, "月表示編集後{Enter}");

    expect(await screen.findByText("月表示編集後")).toBeInTheDocument();
    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "1",
        body: { title: "月表示編集後" },
      });
    });

    const dataTransfer = {
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      getData(type: string) {
        return this.data.get(type) ?? "";
      },
      effectAllowed: "move",
    };
    const todo = screen.getByText("月表示編集後").closest("[draggable]");
    const wednesdayCell = screen
      .getAllByText("3")[0]
      .closest("[data-month-cell]");
    fireEvent.dragStart(todo as Element, { dataTransfer });
    fireEvent.drop(wednesdayCell as Element, { dataTransfer });

    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "1",
        body: { date: "2026-06-03" },
      });
    });

    await user.click(screen.getByTitle("削除"));

    expect(screen.queryByText("月表示編集後")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(requests).toContainEqual({ method: "DELETE", id: "1" });
    });
  });

  it("月表示で5件目以降を展開して操作できる", async () => {
    let tasks = Array.from({ length: 5 }, (_, i) =>
      makeTask({
        id: i + 1,
        title: `月表示多件タスク${i + 1}`,
        createdAt: `2026-06-01T00:0${i}:00.000Z`,
      }),
    );
    setMockTasks(tasks);
    const requests: Array<{ method: string; id: string; body?: unknown }> = [];
    server.use(
      http.get("/api/tasks", () =>
        HttpResponse.json(tasks.filter((task) => !task.deletedAt)),
      ),
      http.patch("/api/tasks/:id", async ({ params, request }) => {
        const body = (await request.json()) as {
          doneAt?: string | null;
          title?: string;
          date?: string;
        };
        requests.push({ method: "PATCH", id: String(params.id), body });
        tasks = tasks.map((task) =>
          task.id === Number(params.id) ? { ...task, ...body } : task,
        );
        return HttpResponse.json(
          tasks.find((task) => task.id === Number(params.id)),
        );
      }),
      http.delete("/api/tasks/:id", ({ params }) => {
        requests.push({ method: "DELETE", id: String(params.id) });
        tasks = tasks.map((task) =>
          task.id === Number(params.id)
            ? { ...task, deletedAt: "2026-06-01T12:00:00.000Z" }
            : task,
        );
        return HttpResponse.json(
          tasks.find((task) => task.id === Number(params.id)),
        );
      }),
    );

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await screen.findByText("月表示多件タスク1");
    await user.click(screen.getByRole("button", { name: "月" }));

    expect(screen.queryByText("月表示多件タスク5")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "＋1件" }));

    expect(screen.getByText("月表示多件タスク5")).toBeInTheDocument();
    const sourceCell = screen.getAllByText("1")[0].closest("[data-month-cell]");
    expect(sourceCell).toHaveAttribute("data-expanded", "true");

    const fifthItem = screen
      .getByText("月表示多件タスク5")
      .closest("[data-todo-done]");
    await user.click(
      fifthItem?.querySelector("button[aria-label='完了にする']") as Element,
    );

    await waitFor(() => {
      expect(
        screen.getByText("月表示多件タスク5").closest("[data-todo-done]"),
      ).toHaveAttribute("data-todo-done", "true");
    });

    await user.dblClick(screen.getByText("月表示多件タスク5"));
    const editInput = screen.getByDisplayValue("月表示多件タスク5");
    await user.clear(editInput);
    await user.type(editInput, "月表示多件編集後{Enter}");

    expect(await screen.findByText("月表示多件編集後")).toBeInTheDocument();

    const dataTransfer = {
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      getData(type: string) {
        return this.data.get(type) ?? "";
      },
      effectAllowed: "move",
    };
    const todo = screen.getByText("月表示多件編集後").closest("[draggable]");
    const wednesdayCell = screen
      .getAllByText("3")[0]
      .closest("[data-month-cell]");
    fireEvent.dragStart(todo as Element, { dataTransfer });
    fireEvent.drop(wednesdayCell as Element, { dataTransfer });

    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "5",
        body: { date: "2026-06-03" },
      });
    });
    expect(sourceCell).toHaveAttribute("data-expanded", "false");
    expect(
      screen.queryByRole("button", { name: "折りたたむ" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen
        .getByText("月表示多件編集後")
        .closest("[data-todo-done]")
        ?.querySelector("[title='削除']") as Element,
    );

    expect(screen.queryByText("月表示多件編集後")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(requests).toContainEqual({ method: "DELETE", id: "5" });
    });
  });

  it("月表示の日付セルクリックで週表示へ移動できる", async () => {
    setMockTasks([makeTask({ id: 1, title: "セルクリック確認" })]);

    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    await screen.findByText("セルクリック確認");
    await user.click(screen.getByRole("button", { name: "月" }));
    await user.click(screen.getAllByText("3")[0]);

    expect(screen.getByRole("button", { name: "週" })).toHaveAttribute(
      "data-active",
      "true",
    );
  });
});
