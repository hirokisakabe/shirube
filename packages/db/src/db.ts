import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { homedir } from "os";
import { join } from "path";
import * as schema from "./schema";

export function getDbPath(): string {
  return join(homedir(), ".uchi", "db.sqlite");
}

export function createDb(dbPath: string = getDbPath()) {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}
