#!/usr/bin/env node
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { Command, Option } from "commander";
import readline from "readline";
import { createDb, tasks } from "@uchi/db";
import { writeData, writeError, writeLog, type Format } from "./output.js";

const program = new Command();

function formatOption() {
  return new Option("--format <format>", "output format (json|table)")
    .choices(["json", "table"])
    .default("table");
}

function getDb() {
  return createDb();
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

program
  .name("uchi")
  .description("uchi CLI")
  .version("0.0.1");

program.addHelpCommand(false);

program.configureOutput({
  writeErr: () => {},
});

program.action(() => {
  writeData({ version: program.version() }, "table");
});

program
  .command("add")
  .description("タスクを追加する")
  .argument("<title>", "タスクのタイトル")
  .option("--date <date>", "日付 (YYYY-MM-DD形式、省略時は今日)")
  .addOption(formatOption())
  .action(async (title: string, options: { date?: string; format: Format }) => {
    const db = getDb();
    const date = options.date ?? todayStr();
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

      let results;
      if (options.week) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startStr = startOfWeek.toISOString().split("T")[0]!;
        const endStr = endOfWeek.toISOString().split("T")[0]!;

        results = await db
          .select()
          .from(tasks)
          .where(
            and(isNull(tasks.deletedAt), gte(tasks.date, startStr), lte(tasks.date, endStr))
          );
      } else {
        const date = options.date ?? todayStr();
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
    if (isNaN(taskId)) {
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
      if (isNaN(taskId)) {
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
  .command("show")
  .description("タスクの詳細を表示する")
  .argument("<id>", "タスクID")
  .addOption(formatOption())
  .action(async (id: string, options: { format: Format }) => {
    const db = getDb();
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      writeError(`Invalid id: ${id}`);
      process.exit(1);
    }
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });
    if (!task) {
      writeError(`Task not found: ${id}`);
      process.exit(1);
    }
    writeData(task, options.format);
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
