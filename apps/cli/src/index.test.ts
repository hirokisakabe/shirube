import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function runCli(args: string[], dbPath: string, env: Record<string, string> = {}) {
  return spawnSync("node", [join(__dirname, "../dist/index.js"), ...args], {
    encoding: "utf8",
    env: { ...process.env, UCHI_DB_PATH: dbPath, ...env },
  });
}

describe("uchi CLI", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "uchi-test-"));
    dbPath = join(tmpDir, "test.sqlite");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("add", () => {
    it("タスクを追加して JSON で返す", () => {
      const result = runCli(["add", "テストタスク", "--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const task = JSON.parse(result.stdout);
      expect(task).toMatchObject({ title: "テストタスク", deletedAt: null, doneAt: null });
      expect(typeof task.id).toBe("number");
    });

    it("--date オプションで日付を指定できる", () => {
      const result = runCli(["add", "将来のタスク", "--date", "2030-01-01", "--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const task = JSON.parse(result.stdout);
      expect(task.date).toBe("2030-01-01");
    });
  });

  describe("list", () => {
    it("タスク一覧を JSON 配列で返す", () => {
      runCli(["add", "タスク1", "--date", "2026-06-01"], dbPath);
      runCli(["add", "タスク2", "--date", "2026-06-01"], dbPath);

      const result = runCli(["list", "--date", "2026-06-01", "--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const tasks = JSON.parse(result.stdout);
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks).toHaveLength(2);
    });

    it("何度実行しても DB 状態が変わらない（副作用ゼロ）", () => {
      runCli(["add", "タスク", "--date", "2026-06-01"], dbPath);

      const before = runCli(["list", "--date", "2026-06-01", "--format", "json"], dbPath).stdout;
      runCli(["list", "--date", "2026-06-01"], dbPath);
      runCli(["list", "--date", "2026-06-01"], dbPath);
      const after = runCli(["list", "--date", "2026-06-01", "--format", "json"], dbPath).stdout;

      expect(before).toBe(after);
    });

    it("--week で今週のタスクを返す", () => {
      runCli(["add", "今週タスク", "--date", "2026-06-01"], dbPath);
      runCli(["add", "来週タスク", "--date", "2026-06-08"], dbPath);

      const result = runCli(["list", "--week", "--format", "json", "--date", "2026-06-01"], dbPath, {
        TZ: "UTC",
      });
      expect(result.status).toBe(0);
    });

    it("削除済みタスクは一覧に含まれない", () => {
      runCli(["add", "削除するタスク", "--date", "2026-06-01"], dbPath);
      const addResult = runCli(["add", "残すタスク", "--date", "2026-06-01", "--format", "json"], dbPath);
      const addedTask = JSON.parse(addResult.stdout);

      const tasks = JSON.parse(runCli(["list", "--date", "2026-06-01", "--format", "json"], dbPath).stdout) as Array<{id: number}>;
      const taskToDelete = tasks.find((t) => t.id !== addedTask.id)!;
      runCli(["rm", String(taskToDelete.id), "--yes"], dbPath);

      const afterResult = runCli(["list", "--date", "2026-06-01", "--format", "json"], dbPath);
      const remaining = JSON.parse(afterResult.stdout) as Array<{id: number}>;
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).toBe(addedTask.id);
    });
  });

  describe("done", () => {
    it("タスクを完了にして doneAt をセットする", () => {
      const task = JSON.parse(runCli(["add", "完了タスク", "--format", "json"], dbPath).stdout);

      const result = runCli(["done", String(task.id), "--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const updated = JSON.parse(result.stdout);
      expect(updated.doneAt).not.toBeNull();
      expect(updated.id).toBe(task.id);
    });
  });

  describe("rm", () => {
    it("--yes で確認なしにソフトデリートできる", () => {
      const task = JSON.parse(runCli(["add", "削除タスク", "--format", "json"], dbPath).stdout);

      const result = runCli(["rm", String(task.id), "--yes", "--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const deleted = JSON.parse(result.stdout);
      expect(deleted.deletedAt).not.toBeNull();
      expect(deleted.id).toBe(task.id);
    });

    it("削除は物理削除ではなく deleted_at をセットする", () => {
      const task = JSON.parse(runCli(["add", "ソフトデリートテスト", "--format", "json"], dbPath).stdout);
      runCli(["rm", String(task.id), "--yes"], dbPath);

      const showResult = runCli(["show", String(task.id), "--format", "json"], dbPath);
      expect(showResult.status).toBe(1);
      expect(showResult.stderr).toContain("Task not found");
    });

    it("--yes なしでキャンセルすると削除されない", () => {
      const task = JSON.parse(runCli(["add", "キャンセルテスト", "--format", "json"], dbPath).stdout);

      const result = spawnSync("node", [join(__dirname, "../dist/index.js"), "rm", String(task.id)], {
        input: "n\n",
        encoding: "utf8",
        env: { ...process.env, UCHI_DB_PATH: dbPath },
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("Cancelled");

      const showResult = runCli(["show", String(task.id), "--format", "json"], dbPath);
      expect(showResult.status).toBe(0);
    });
  });

  describe("show", () => {
    it("タスクの詳細を JSON で返す", () => {
      const task = JSON.parse(runCli(["add", "詳細テスト", "--format", "json"], dbPath).stdout);

      const result = runCli(["show", String(task.id), "--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const shown = JSON.parse(result.stdout);
      expect(shown.id).toBe(task.id);
      expect(shown.title).toBe("詳細テスト");
    });

    it("削除済みタスクは show で取得できない", () => {
      const task = JSON.parse(runCli(["add", "削除済みタスク", "--format", "json"], dbPath).stdout);
      runCli(["rm", String(task.id), "--yes"], dbPath);

      const result = runCli(["show", String(task.id)], dbPath);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Task not found");
    });

    it("存在しない ID は 1 で終了する", () => {
      const result = runCli(["show", "99999"], dbPath);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Task not found");
    });
  });

  describe("--format json (ルートコマンド)", () => {
    it("uchi --format json でバージョンを JSON で返す", () => {
      const result = runCli(["--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data).toHaveProperty("version");
    });
  });

  describe("review", () => {
    function makeMockEditor(content: string): string {
      const { writeFileSync, chmodSync } = require("fs") as typeof import("fs");
      const scriptPath = join(tmpDir, `mock-editor-${Date.now()}.js`);
      const escaped = JSON.stringify(content);
      writeFileSync(
        scriptPath,
        `const fs = require('fs');\nfs.writeFileSync(process.argv[2], ${escaped}, 'utf8');\n`,
        "utf8"
      );
      chmodSync(scriptPath, 0o755);
      return scriptPath;
    }

    it("review で今週の振り返りを保存できる", () => {
      const editor = makeMockEditor("今週の振り返り内容");
      const result = runCli(["review"], dbPath, { EDITOR: `node ${editor}` });
      expect(result.status).toBe(0);
      expect(result.stderr).toContain("Saved review for");
    });

    it("review --week で指定週の振り返りを保存できる", () => {
      const editor = makeMockEditor("振り返り内容");
      const result = runCli(["review", "--week", "2024-W01"], dbPath, {
        EDITOR: `node ${editor}`,
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toContain("Saved review for 2024-W01");
    });

    it("review --week に不正なフォーマットを渡すとエラーになる", () => {
      const editor = makeMockEditor("");
      const result = runCli(["review", "--week", "invalid"], dbPath, {
        EDITOR: `node ${editor}`,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid week format");
    });

    it("review --week W00 は ISO 週として不正なためエラーになる", () => {
      const editor = makeMockEditor("");
      const result = runCli(["review", "--week", "2024-W00"], dbPath, {
        EDITOR: `node ${editor}`,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid week format");
    });

    it("review --week W54 は ISO 週として不正なためエラーになる", () => {
      const editor = makeMockEditor("");
      const result = runCli(["review", "--week", "2024-W54"], dbPath, {
        EDITOR: `node ${editor}`,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid week format");
    });

    it("存在しない EDITOR を指定するとエラーになる", () => {
      const result = runCli(["review", "--week", "2024-W01"], dbPath, {
        EDITOR: "/nonexistent-editor-binary",
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Failed to open editor");
    });

    it("review list --format json で振り返り一覧を JSON で取得できる", () => {
      const editor = makeMockEditor("振り返り内容");
      runCli(["review", "--week", "2024-W01"], dbPath, { EDITOR: `node ${editor}` });
      runCli(["review", "--week", "2024-W02"], dbPath, { EDITOR: `node ${editor}` });

      const result = runCli(["review", "list", "--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const list = JSON.parse(result.stdout);
      expect(Array.isArray(list)).toBe(true);
      expect(list).toHaveLength(2);
      expect(list[0].week).toBe("2024-W02");
      expect(list[1].week).toBe("2024-W01");
    });

    it("同じ週を再度 review すると内容が更新される", () => {
      const editor1 = makeMockEditor("最初の内容");
      runCli(["review", "--week", "2024-W10"], dbPath, { EDITOR: `node ${editor1}` });

      const editor2 = makeMockEditor("更新後の内容");
      runCli(["review", "--week", "2024-W10"], dbPath, { EDITOR: `node ${editor2}` });

      const result = runCli(["review", "list", "--format", "json"], dbPath);
      const list = JSON.parse(result.stdout);
      expect(list).toHaveLength(1);
      expect(list[0].content).toBe("更新後の内容");
    });
  });
});
