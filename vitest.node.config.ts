import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/db/**/*.test.ts", "src/server/**/*.test.ts"],
    env: {
      SHIRUBE_MIGRATIONS_PATH: resolve(__dirname, "drizzle"),
    },
  },
});
