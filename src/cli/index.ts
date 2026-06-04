#!/usr/bin/env node
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { Command, Option } from "commander";
import readline from "node:readline";
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import packageJson from "../../package.json";
import { createDb, tasks, reviews, goals } from "../db/index";
import { writeData, writeError, writeLog, type Format } from "./output";

const program = new Command();

function formatOption() {
  return new Option("--format <format>", "output format (json|table)")
    .choices(["json", "table"])
    .default("table");
}

function getDb() {
  return createDb();
}

function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoWeek(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function openEditor(content: string): string {
  const editorCmd = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
  const shell = process.env.SHELL ?? "sh";
  const dir = mkdtempSync(join(tmpdir(), "shirube-review-"));
  const file = join(dir, "review.md");
  try {
    writeFileSync(file, content, "utf8");
    // Use the shell to interpret EDITOR (handles paths with spaces and embedded flags like "vim -n")
    const result = spawnSync(shell, ["-c", `${editorCmd} "$1"`, "--", file], { stdio: "inherit" });
    if (result.error !== undefined || result.status !== 0) {
      const msg = result.error?.message ?? `editor exited with status ${result.status ?? "unknown"}`;
      writeError(`Failed to open editor: ${msg}`);
      process.exit(1);
    }
    return readFileSync(file, "utf8");
  } finally {
    rmSync(dir, { recursive: true });
  }
}

program
  .name("shirube")
  .description("shirube CLI")
  .version(packageJson.version)
  .enablePositionalOptions()
  .addOption(formatOption());

program.addHelpCommand(false);

program.configureOutput({
  writeErr: () => {},
});

program.action((options: { format: Format }) => {
  writeData({ version: program.version() }, options.format);
});

program
  .command("add")
  .description("タスクを追加する")
  .argument("<title>", "タスクのタイトル")
  .option("--date <date>", "日付 (YYYY-MM-DD形式、省略時は今日)")
  .addOption(formatOption())
  .action(async (title: string, options: { date?: string; format: Format }) => {
    const db = getDb();
    const date = options.date ?? localDateStr();
    const [task] = await db.insert(tasks).values({ title, date }).returning();
    writeData(task, options.format);
  });

program
  .command("list")
  .description("タスク一覧を表示する")
  .option("--date <date>", "日付 (YYYY-MM-DD形式、省略時は今日)")
  .option("--week", "今週のタスクを表示する")
  .addOption(formatOption())
  .action(
    async (options: { date?: string; week?: boolean; format: Format }) => {
      const db = getDb();

      let results: (typeof tasks.$inferSelect)[];
      if (options.week) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startStr = localDateStr(startOfWeek);
        const endStr = localDateStr(endOfWeek);

        results = await db
          .select()
          .from(tasks)
          .where(
            and(isNull(tasks.deletedAt), gte(tasks.date, startStr), lte(tasks.date, endStr))
          );
      } else {
        const date = options.date ?? localDateStr();
        results = await db
          .select()
          .from(tasks)
          .where(and(isNull(tasks.deletedAt), eq(tasks.date, date)));
      }

      writeData(results, options.format);
    }
  );

program
  .command("done")
  .description("タスクを完了にする")
  .argument("<id>", "タスクID")
  .addOption(formatOption())
  .action(async (id: string, options: { format: Format }) => {
    const db = getDb();
    const taskId = parseInt(id, 10);
    if (Number.isNaN(taskId)) {
      writeError(`Invalid id: ${id}`);
      process.exit(1);
    }
    const [task] = await db
      .update(tasks)
      .set({ doneAt: new Date().toISOString() })
      .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
      .returning();
    if (!task) {
      writeError(`Task not found: ${id}`);
      process.exit(1);
    }
    writeData(task, options.format);
  });

program
  .command("rm")
  .description("タスクを削除する（ソフトデリート）")
  .argument("<id>", "タスクID")
  .option("--yes", "確認なしで削除する（エージェント向け）")
  .addOption(formatOption())
  .action(
    async (id: string, options: { yes?: boolean; format: Format }) => {
      const db = getDb();
      const taskId = parseInt(id, 10);
      if (Number.isNaN(taskId)) {
        writeError(`Invalid id: ${id}`);
        process.exit(1);
      }

      if (!options.yes) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stderr,
        });
        const confirmed = await new Promise<boolean>((resolve) => {
          rl.question(`Delete task ${taskId}? [y/N] `, (answer) => {
            rl.close();
            resolve(
              answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
            );
          });
        });
        if (!confirmed) {
          writeLog("Cancelled.");
          process.exit(0);
        }
      }

      const [task] = await db
        .update(tasks)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
        .returning();
      if (!task) {
        writeError(`Task not found: ${id}`);
        process.exit(1);
      }
      writeData(task, options.format);
    }
  );

program
  .command("edit")
  .description("タスクのタイトルを変更する")
  .argument("<id>", "タスクID")
  .requiredOption("--title <title>", "新しいタイトル")
  .addOption(formatOption())
  .action(async (id: string, options: { title: string; format: Format }) => {
    const db = getDb();
    if (!/^\d+$/.test(id)) {
      writeError(`Invalid id: ${id}`);
      process.exit(1);
    }
    const taskId = Number(id);
    const [task] = await db
      .update(tasks)
      .set({ title: options.title })
      .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
      .returning();
    if (!task) {
      writeError(`Task not found: ${id}`);
      process.exit(1);
    }
    writeData(task, options.format);
  });

program
  .command("show")
  .description("タスクの詳細を表示する")
  .argument("<id>", "タスクID")
  .addOption(formatOption())
  .action(async (id: string, options: { format: Format }) => {
    const db = getDb();
    const taskId = parseInt(id, 10);
    if (Number.isNaN(taskId)) {
      writeError(`Invalid id: ${id}`);
      process.exit(1);
    }
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), isNull(tasks.deletedAt)),
    });
    if (!task) {
      writeError(`Task not found: ${id}`);
      process.exit(1);
    }
    writeData(task, options.format);
  });

const reviewCmd = program
  .command("review")
  .description("週次振り返りを開く/編集する")
  .option("--week <week>", "週の指定 (YYYY-Www形式、省略時は今週)")
  .action(async (options: { week?: string }) => {
    const db = getDb();
    const week = options.week ?? isoWeek();
    if (options.week && !/^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/.test(options.week)) {
      writeError(`Invalid week format: ${options.week} (expected YYYY-Www, weeks 01-53)`);
      process.exit(1);
    }
    const existing = await db.query.reviews.findFirst({
      where: eq(reviews.week, week),
    });
    const content = openEditor(existing?.content ?? "");
    await db
      .insert(reviews)
      .values({ week, content })
      .onConflictDoUpdate({
        target: reviews.week,
        set: { content, updatedAt: new Date().toISOString() },
      });
    writeLog(`Saved review for ${week}`);
  });

reviewCmd
  .command("list")
  .description("過去の振り返り一覧を表示する")
  .addOption(formatOption())
  .action(async (options: { format: Format }) => {
    const db = getDb();
    const results = await db
      .select()
      .from(reviews)
      .orderBy(desc(reviews.week));
    writeData(results, options.format);
  });

const goalCmd = program
  .command("goal")
  .description("目標を管理する");

goalCmd
  .command("add")
  .description("目標を追加する")
  .argument("<title>", "目標のタイトル")
  .addOption(formatOption())
  .action(async (title: string, options: { format: Format }) => {
    const db = getDb();
    const [goal] = await db.insert(goals).values({ title }).returning();
    writeData(goal, options.format);
  });

goalCmd
  .command("list")
  .description("目標一覧を表示する")
  .option("--all", "達成済みの目標も含めて表示する")
  .addOption(formatOption())
  .action(async (options: { all?: boolean; format: Format }) => {
    const db = getDb();
    const results = await db
      .select()
      .from(goals)
      .where(
        options.all
          ? isNull(goals.deletedAt)
          : and(isNull(goals.deletedAt), isNull(goals.doneAt))
      )
      .orderBy(desc(goals.createdAt));
    writeData(results, options.format);
  });

goalCmd
  .command("done")
  .description("目標を達成にする")
  .argument("<id>", "目標ID")
  .addOption(formatOption())
  .action(async (id: string, options: { format: Format }) => {
    const db = getDb();
    if (!/^\d+$/.test(id)) {
      writeError(`Invalid id: ${id}`);
      process.exit(1);
    }
    const goalId = Number(id);
    const [goal] = await db
      .update(goals)
      .set({ doneAt: new Date().toISOString() })
      .where(and(eq(goals.id, goalId), isNull(goals.deletedAt)))
      .returning();
    if (!goal) {
      writeError(`Goal not found: ${id}`);
      process.exit(1);
    }
    writeData(goal, options.format);
  });

goalCmd
  .command("rm")
  .description("目標を削除する（ソフトデリート）")
  .argument("<id>", "目標ID")
  .option("--yes", "確認なしで削除する（エージェント向け）")
  .addOption(formatOption())
  .action(async (id: string, options: { yes?: boolean; format: Format }) => {
    const db = getDb();
    if (!/^\d+$/.test(id)) {
      writeError(`Invalid id: ${id}`);
      process.exit(1);
    }
    const goalId = Number(id);

    if (!options.yes) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stderr,
      });
      const confirmed = await new Promise<boolean>((resolve) => {
        rl.question(`Delete goal ${goalId}? [y/N] `, (answer) => {
          rl.close();
          resolve(
            answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
          );
        });
      });
      if (!confirmed) {
        writeLog("Cancelled.");
        process.exit(0);
      }
    }

    const [goal] = await db
      .update(goals)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(goals.id, goalId), isNull(goals.deletedAt)))
      .returning();
    if (!goal) {
      writeError(`Goal not found: ${id}`);
      process.exit(1);
    }
    writeData(goal, options.format);
  });

program
  .command("serve")
  .description("サーバを起動してブラウザで開く")
  .action(async () => {
    const serverScript = join(__dirname, "server.js");

    writeLog("サーバを起動中...");

    const server = spawn(process.execPath, [serverScript], {
      stdio: ["ignore", "ignore", "inherit"],
    });

    server.on("exit", (code) => {
      process.exit(code ?? 0);
    });

    process.on("SIGINT", () => {
      server.kill("SIGINT");
    });

    process.on("SIGTERM", () => {
      server.kill("SIGTERM");
    });

    const serverUrl = "http://localhost:3000";
    const maxWaitMs = 10000;
    const start = Date.now();
    let ready = false;
    while (Date.now() - start < maxWaitMs) {
      try {
        await fetch(`${serverUrl}/`);
        ready = true;
        break;
      } catch {
        await new Promise<void>((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!ready) {
      writeError("サーバの起動を確認できませんでした");
      server.kill();
      process.exit(1);
    }

    writeLog(serverUrl);
    writeLog("ブラウザを開いています...");
    spawnSync("open", [serverUrl]);
  });

program.exitOverride((err) => {
  if (err.code === "commander.helpDisplayed") {
    process.exit(0);
  }
  if (err.code === "commander.version") {
    process.exit(0);
  }
  writeError(err.message);
  process.exit(1);
});

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  writeError(message);
  process.exit(1);
});
