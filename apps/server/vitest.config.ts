import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shirube/db": resolve(__dirname, "../../packages/db/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**"],
  },
});
