import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import * as schema from "./schema";

export function getDbPath(): string {
  return process.env["SHIRUBE_DB_PATH"] ?? join(homedir(), ".shirube", "db.sqlite");
}

export function createDb(dbPath: string = getDbPath()) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: join(__dirname, "../drizzle") });
  return db;
}
