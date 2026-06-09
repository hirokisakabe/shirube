import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import packageJson from "../../package.json";

function runCli(
  args: string[],
  dbPath: string,
  env: Record<string, string> = {},
) {
  return spawnSync("node", [join(__dirname, "../../dist/cli.js"), ...args], {
    encoding: "utf8",
    env: { ...process.env, SHIRUBE_DB_PATH: dbPath, ...env },
  });
}

describe("shirube CLI", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "shirube-test-"));
    dbPath = join(tmpDir, "test.sqlite");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("add", () => {
    it("タスクを追加して JSON で返す", () => {
      const result = runCli(
        ["add", "テストタスク", "--format", "json"],
        dbPath,
      );
      expect(result.status).toBe(0);
      const task = JSON.parse(result.stdout);
      expect(task).toMatchObject({
        title: "テストタスク",
        deletedAt: null,
        doneAt: null,
      });
      expect(typeof task.id).toBe("number");
    });

    it("--date オプションで日付を指定できる", () => {
      const result = runCli(
        ["add", "将来のタスク", "--date", "2030-01-01", "--format", "json"],
        dbPath,
      );
      expect(result.status).toBe(0);
      const task = JSON.parse(result.stdout);
      expect(task.date).toBe("2030-01-01");
    });
  });

  describe("list", () => {
    it("タスク一覧を JSON 配列で返す", () => {
      runCli(["add", "タスク1", "--date", "2026-06-01"], dbPath);
      runCli(["add", "タスク2", "--date", "2026-06-01"], dbPath);

      const result = runCli(
        ["list", "--date", "2026-06-01", "--format", "json"],
        dbPath,
      );
      expect(result.status).toBe(0);
      const tasks = JSON.parse(result.stdout);
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks).toHaveLength(2);
    });

    it("何度実行しても DB 状態が変わらない（副作用ゼロ）", () => {
      runCli(["add", "タスク", "--date", "2026-06-01"], dbPath);

      const before = runCli(
        ["list", "--date", "2026-06-01", "--format", "json"],
        dbPath,
      ).stdout;
      runCli(["list", "--date", "2026-06-01"], dbPath);
      runCli(["list", "--date", "2026-06-01"], dbPath);
      const after = runCli(
        ["list", "--date", "2026-06-01", "--format", "json"],
        dbPath,
      ).stdout;

      expect(before).toBe(after);
    });

    it("--week で今週のタスクを返す", () => {
      runCli(["add", "今週タスク", "--date", "2026-06-01"], dbPath);
      runCli(["add", "来週タスク", "--date", "2026-06-08"], dbPath);

      const result = runCli(
        ["list", "--week", "--format", "json", "--date", "2026-06-01"],
        dbPath,
        {
          TZ: "UTC",
        },
      );
      expect(result.status).toBe(0);
    });

    it("削除済みタスクは一覧に含まれない", () => {
      runCli(["add", "削除するタスク", "--date", "2026-06-01"], dbPath);
      const addResult = runCli(
        ["add", "残すタスク", "--date", "2026-06-01", "--format", "json"],
        dbPath,
      );
      const addedTask = JSON.parse(addResult.stdout);

      const tasks = JSON.parse(
        runCli(["list", "--date", "2026-06-01", "--format", "json"], dbPath)
          .stdout,
      ) as Array<{ id: number }>;
      const taskToDelete = tasks.find((t) => t.id !== addedTask.id);
      if (!taskToDelete) throw new Error("taskToDelete not found");
      runCli(["rm", String(taskToDelete.id), "--yes"], dbPath);

      const afterResult = runCli(
        ["list", "--date", "2026-06-01", "--format", "json"],
        dbPath,
      );
      const remaining = JSON.parse(afterResult.stdout) as Array<{ id: number }>;
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(addedTask.id);
    });
  });

  describe("done", () => {
    it("タスクを完了にして doneAt をセットする", () => {
      const task = JSON.parse(
        runCli(["add", "完了タスク", "--format", "json"], dbPath).stdout,
      );

      const result = runCli(
        ["done", String(task.id), "--format", "json"],
        dbPath,
      );
      expect(result.status).toBe(0);
      const updated = JSON.parse(result.stdout);
      expect(updated.doneAt).not.toBeNull();
      expect(updated.id).toBe(task.id);
    });
  });

  describe("rm", () => {
    it("--yes で確認なしにソフトデリートできる", () => {
      const task = JSON.parse(
        runCli(["add", "削除タスク", "--format", "json"], dbPath).stdout,
      );

      const result = runCli(
        ["rm", String(task.id), "--yes", "--format", "json"],
        dbPath,
      );
      expect(result.status).toBe(0);
      const deleted = JSON.parse(result.stdout);
      expect(deleted.deletedAt).not.toBeNull();
      expect(deleted.id).toBe(task.id);
    });

    it("削除は物理削除ではなく deleted_at をセットする", () => {
      const task = JSON.parse(
        runCli(["add", "ソフトデリートテスト", "--format", "json"], dbPath)
          .stdout,
      );
      runCli(["rm", String(task.id), "--yes"], dbPath);

      const showResult = runCli(
        ["show", String(task.id), "--format", "json"],
        dbPath,
      );
      expect(showResult.status).toBe(1);
      expect(showResult.stderr).toContain("Task not found");
    });

    it("--yes なしでキャンセルすると削除されない", () => {
      const task = JSON.parse(
        runCli(["add", "キャンセルテスト", "--format", "json"], dbPath).stdout,
      );

      const result = spawnSync(
        "node",
        [join(__dirname, "../../dist/cli.js"), "rm", String(task.id)],
        {
          input: "n\n",
          encoding: "utf8",
          env: { ...process.env, SHIRUBE_DB_PATH: dbPath },
        },
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("Cancelled");

      const showResult = runCli(
        ["show", String(task.id), "--format", "json"],
        dbPath,
      );
      expect(showResult.status).toBe(0);
    });
  });

  describe("edit", () => {
    it("--title でタスクのタイトルを変更して JSON で返す", () => {
      const task = JSON.parse(
        runCli(["add", "元のタイトル", "--format", "json"], dbPath).stdout,
      );

      const result = runCli(
        [
          "edit",
          String(task.id),
          "--title",
          "新しいタイトル",
          "--format",
          "json",
        ],
        dbPath,
      );
      expect(result.status).toBe(0);
      const updated = JSON.parse(result.stdout);
      expect(updated.id).toBe(task.id);
      expect(updated.title).toBe("新しいタイトル");
    });

    it("存在しない ID は 1 で終了する", () => {
      const result = runCli(
        ["edit", "99999", "--title", "新しいタイトル"],
        dbPath,
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Task not found");
    });

    it("数字以外の ID は Invalid id エラーになる", () => {
      const result = runCli(
        ["edit", "abc", "--title", "新しいタイトル"],
        dbPath,
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid id");
    });

    it("数字+文字列の混合 ID (例: 12abc) は Invalid id エラーになる", () => {
      const result = runCli(
        ["edit", "12abc", "--title", "新しいタイトル"],
        dbPath,
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid id");
    });

    it("削除済みタスクは編集できない", () => {
      const task = JSON.parse(
        runCli(["add", "削除タスク", "--format", "json"], dbPath).stdout,
      );
      runCli(["rm", String(task.id), "--yes"], dbPath);

      const result = runCli(
        ["edit", String(task.id), "--title", "新タイトル"],
        dbPath,
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Task not found");
    });

    it("--format table でもエラーなく実行できる", () => {
      const task = JSON.parse(
        runCli(["add", "テーブルテスト", "--format", "json"], dbPath).stdout,
      );

      const result = runCli(
        ["edit", String(task.id), "--title", "変更後", "--format", "table"],
        dbPath,
      );
      expect(result.status).toBe(0);
    });
  });

  describe("show", () => {
    it("タスクの詳細を JSON で返す", () => {
      const task = JSON.parse(
        runCli(["add", "詳細テスト", "--format", "json"], dbPath).stdout,
      );

      const result = runCli(
        ["show", String(task.id), "--format", "json"],
        dbPath,
      );
      expect(result.status).toBe(0);
      const shown = JSON.parse(result.stdout);
      expect(shown.id).toBe(task.id);
      expect(shown.title).toBe("詳細テスト");
    });

    it("削除済みタスクは show で取得できない", () => {
      const task = JSON.parse(
        runCli(["add", "削除済みタスク", "--format", "json"], dbPath).stdout,
      );
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
    it("shirube --format json でバージョンを JSON で返す", () => {
      const result = runCli(["--format", "json"], dbPath);
      expect(result.status).toBe(0);
      const data = JSON.parse(result.stdout);
      expect(data).toHaveProperty("version", packageJson.version);
    });
  });

  describe("goal", () => {
    describe("add", () => {
      it("目標を追加して JSON で返す", () => {
        const result = runCli(
          ["goal", "add", "テスト目標", "--format", "json"],
          dbPath,
        );
        expect(result.status).toBe(0);
        const goal = JSON.parse(result.stdout);
        expect(goal).toMatchObject({
          title: "テスト目標",
          deletedAt: null,
          doneAt: null,
        });
        expect(typeof goal.id).toBe("number");
      });
    });

    describe("list", () => {
      it("未達成の目標のみ表示する（デフォルト）", () => {
        const g1 = JSON.parse(
          runCli(["goal", "add", "目標1", "--format", "json"], dbPath).stdout,
        );
        const g2 = JSON.parse(
          runCli(["goal", "add", "目標2", "--format", "json"], dbPath).stdout,
        );
        runCli(["goal", "done", String(g1.id), "--format", "json"], dbPath);

        const result = runCli(["goal", "list", "--format", "json"], dbPath);
        expect(result.status).toBe(0);
        const list = JSON.parse(result.stdout) as Array<{ id: number }>;
        expect(list.find((g) => g.id === g1.id)).toBeUndefined();
        expect(list.find((g) => g.id === g2.id)).toBeDefined();
      });

      it("--all で達成済みも含めて表示する", () => {
        const g1 = JSON.parse(
          runCli(["goal", "add", "目標1", "--format", "json"], dbPath).stdout,
        );
        runCli(["goal", "done", String(g1.id)], dbPath);

        const result = runCli(
          ["goal", "list", "--all", "--format", "json"],
          dbPath,
        );
        expect(result.status).toBe(0);
        const list = JSON.parse(result.stdout) as Array<{ id: number }>;
        expect(list.find((g) => g.id === g1.id)).toBeDefined();
      });

      it("削除済み目標は一覧に含まれない", () => {
        const g1 = JSON.parse(
          runCli(["goal", "add", "削除する目標", "--format", "json"], dbPath)
            .stdout,
        );
        runCli(["goal", "rm", String(g1.id), "--yes"], dbPath);

        const result = runCli(
          ["goal", "list", "--all", "--format", "json"],
          dbPath,
        );
        expect(result.status).toBe(0);
        const list = JSON.parse(result.stdout) as Array<{ id: number }>;
        expect(list.find((g) => g.id === g1.id)).toBeUndefined();
      });
    });

    describe("done", () => {
      it("目標を達成にして doneAt をセットする", () => {
        const goal = JSON.parse(
          runCli(["goal", "add", "達成目標", "--format", "json"], dbPath)
            .stdout,
        );

        const result = runCli(
          ["goal", "done", String(goal.id), "--format", "json"],
          dbPath,
        );
        expect(result.status).toBe(0);
        const updated = JSON.parse(result.stdout);
        expect(updated.doneAt).not.toBeNull();
        expect(updated.id).toBe(goal.id);
      });

      it("存在しない ID は 1 で終了する", () => {
        const result = runCli(["goal", "done", "99999"], dbPath);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Goal not found");
      });

      it("数字以外の ID は Invalid id エラーになる", () => {
        const result = runCli(["goal", "done", "1abc"], dbPath);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Invalid id");
      });
    });

    describe("rm", () => {
      it("--yes で確認なしにソフトデリートできる", () => {
        const goal = JSON.parse(
          runCli(["goal", "add", "削除目標", "--format", "json"], dbPath)
            .stdout,
        );

        const result = runCli(
          ["goal", "rm", String(goal.id), "--yes", "--format", "json"],
          dbPath,
        );
        expect(result.status).toBe(0);
        const deleted = JSON.parse(result.stdout);
        expect(deleted.deletedAt).not.toBeNull();
        expect(deleted.id).toBe(goal.id);
      });

      it("削除は deleted_at をセットするソフトデリートになっている", () => {
        const goal = JSON.parse(
          runCli(
            ["goal", "add", "ソフトデリートテスト", "--format", "json"],
            dbPath,
          ).stdout,
        );
        const deleted = JSON.parse(
          runCli(
            ["goal", "rm", String(goal.id), "--yes", "--format", "json"],
            dbPath,
          ).stdout,
        );
        expect(deleted.deletedAt).not.toBeNull();
        expect(deleted.id).toBe(goal.id);
      });

      it("--yes なしでキャンセルすると削除されない", () => {
        const goal = JSON.parse(
          runCli(
            ["goal", "add", "キャンセルテスト", "--format", "json"],
            dbPath,
          ).stdout,
        );

        const result = spawnSync(
          "node",
          [join(__dirname, "../../dist/cli.js"), "goal", "rm", String(goal.id)],
          {
            input: "n\n",
            encoding: "utf8",
            env: { ...process.env, SHIRUBE_DB_PATH: dbPath },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stderr).toContain("Cancelled");

        const listResult = runCli(
          ["goal", "list", "--all", "--format", "json"],
          dbPath,
        );
        const list = JSON.parse(listResult.stdout) as Array<{ id: number }>;
        expect(list.find((g) => g.id === goal.id)).toBeDefined();
      });

      it("--yes なしで確認プロンプトが出る", () => {
        const goal = JSON.parse(
          runCli(
            ["goal", "add", "プロンプトテスト", "--format", "json"],
            dbPath,
          ).stdout,
        );

        const result = spawnSync(
          "node",
          [join(__dirname, "../../dist/cli.js"), "goal", "rm", String(goal.id)],
          {
            input: "y\n",
            encoding: "utf8",
            env: { ...process.env, SHIRUBE_DB_PATH: dbPath },
          },
        );

        expect(result.status).toBe(0);
        expect(result.stderr).toContain(`Delete goal ${goal.id}?`);
      });

      it("数字以外の ID は Invalid id エラーになる", () => {
        const result = runCli(["goal", "rm", "1abc", "--yes"], dbPath);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Invalid id");
      });
    });
  });

  describe("review", () => {
    function makeMockEditor(content: string): string {
      const { writeFileSync, chmodSync } =
        require("node:fs") as typeof import("fs");
      const scriptPath = join(tmpDir, `mock-editor-${Date.now()}.js`);
      const escaped = JSON.stringify(content);
      writeFileSync(
        scriptPath,
        `const fs = require('fs');\nfs.writeFileSync(process.argv[2], ${escaped}, 'utf8');\n`,
        "utf8",
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
      runCli(["review", "--week", "2024-W01"], dbPath, {
        EDITOR: `node ${editor}`,
      });
      runCli(["review", "--week", "2024-W02"], dbPath, {
        EDITOR: `node ${editor}`,
      });

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
      runCli(["review", "--week", "2024-W10"], dbPath, {
        EDITOR: `node ${editor1}`,
      });

      const editor2 = makeMockEditor("更新後の内容");
      runCli(["review", "--week", "2024-W10"], dbPath, {
        EDITOR: `node ${editor2}`,
      });

      const result = runCli(["review", "list", "--format", "json"], dbPath);
      const list = JSON.parse(result.stdout);
      expect(list).toHaveLength(1);
      expect(list[0].content).toBe("更新後の内容");
    });
  });

  describe("serve", () => {
    it("shirube --help に serve が含まれる", () => {
      const result = runCli(["--help"], dbPath);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("serve");
    });

    it("serve コマンドはヘルプ表示時に stdout にのみ出力する", () => {
      const result = runCli(["serve", "--help"], dbPath);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
    });

    it("serve 起動後に URL を stderr に出力する", async () => {
      const child = spawn(
        "node",
        [join(__dirname, "../../dist/cli.js"), "serve"],
        {
          env: { ...process.env, SHIRUBE_DB_PATH: dbPath },
        },
      );

      let stderrOutput = "";
      const urlLogged = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          child.kill();
          resolve(false);
        }, 15000);

        child.stderr.on("data", (data: Buffer) => {
          stderrOutput += data.toString();
          if (stderrOutput.includes("http://localhost:3000")) {
            clearTimeout(timeout);
            child.kill();
            resolve(true);
          }
        });
      });

      expect(urlLogged, `stderr was: ${stderrOutput}`).toBe(true);
    }, 20000);
  });
});
