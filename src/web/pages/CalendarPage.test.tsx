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
import { makeTask, setMockTasks } from "../test/handlers";
import { renderWithQueryClient } from "../test/render";
import { server } from "../test/server";
import { CalendarPage } from "./CalendarPage";

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
      ".act",
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
    const wednesdayColumn = screen.getByText("3").closest(".col");
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

  it("タスク追加直後にundoすると追加したタスクが消える", async () => {
    setMockTasks([]);
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderWithQueryClient(<CalendarPage />);

    const inputs = await screen.findAllByPlaceholderText("タスクを追加");
    await user.click(inputs[0]);
    await user.type(inputs[0], "undo追加{Enter}");

    expect(await screen.findByText("undo追加")).toBeInTheDocument();
    expect(await screen.findByText("追加を取り消す")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(screen.queryByText("undo追加")).not.toBeInTheDocument();
    });
  });

  it("タスク名編集直後にundoすると編集前の値に戻る", async () => {
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
    expect(await screen.findByText("タスクを元に戻す")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(await screen.findByText("編集前undo")).toBeInTheDocument();
    expect(screen.queryByText("編集後undo")).not.toBeInTheDocument();
  });

  it("タスク完了切替直後にundoすると切り替え前の状態に戻る", async () => {
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
    expect(await screen.findByText("タスクを元に戻す")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(
        screen.getByText("完了undo").closest("[data-todo-done]"),
      ).toHaveAttribute("data-todo-done", "false");
    });
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
    expect(await screen.findByText("削除を取り消す")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

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
    renderWithQueryClient(<CalendarPage />);

    await screen.findByText("月表示タスク");
    await user.click(screen.getByRole("button", { name: "月" }));

    const inputs = screen.getAllByPlaceholderText("タスクを追加");
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
    const wednesdayCell = screen.getAllByText("3")[0].closest(".mcell");
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
    const sourceCell = screen.getAllByText("1")[0].closest(".mcell");
    expect(sourceCell).toHaveClass("expanded");

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
    const wednesdayCell = screen.getAllByText("3")[0].closest(".mcell");
    fireEvent.dragStart(todo as Element, { dataTransfer });
    fireEvent.drop(wednesdayCell as Element, { dataTransfer });

    await waitFor(() => {
      expect(requests).toContainEqual({
        method: "PATCH",
        id: "5",
        body: { date: "2026-06-03" },
      });
    });
    expect(sourceCell).not.toHaveClass("expanded");
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

    expect(screen.getByRole("button", { name: "週" })).toHaveClass("on");
  });
});
