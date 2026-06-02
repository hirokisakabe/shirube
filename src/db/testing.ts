import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync } from "fs";
import { join } from "path";
import * as schema from "./schema";

function getMigrationsFolder(): string {
  if (process.env["SHIRUBE_MIGRATIONS_PATH"]) {
    return process.env["SHIRUBE_MIGRATIONS_PATH"];
  }
  const fromDist = join(__dirname, "drizzle");
  return existsSync(fromDist) ? fromDist : join(__dirname, "../../drizzle");
}

export function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: getMigrationsFolder() });
  return { db, close: (): void => { sqlite.close(); } };
}
