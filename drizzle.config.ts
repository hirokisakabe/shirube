import { homedir } from "os";
import { join } from "path";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "sqlite",
	dbCredentials: {
		url: join(homedir(), ".shirube", "db.sqlite"),
	},
});
