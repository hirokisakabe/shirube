import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import * as schema from "./schema";

export function getDbPath(): string {
  return process.env["SHIRUBE_DB_PATH"] ?? join(homedir(), ".shirube", "db.sqlite");
}

function getMigrationsFolder(): string {
  if (process.env["SHIRUBE_MIGRATIONS_PATH"]) {
    return process.env["SHIRUBE_MIGRATIONS_PATH"];
  }
  // バンドル済み: __dirname = dist/ → dist/drizzle/ が存在する
  // ソース実行 (tsx): __dirname = src/db/ → src/db/drizzle/ は存在しないため 2 段上の drizzle/ にフォールバック
  const fromDist = join(__dirname, "drizzle");
  return existsSync(fromDist) ? fromDist : join(__dirname, "../../drizzle");
}

export function createDb(dbPath: string = getDbPath()) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: getMigrationsFolder() });
  return db;
}
