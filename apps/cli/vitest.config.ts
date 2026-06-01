import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "src/globalSetup.ts"],
    globalSetup: ["src/globalSetup.ts"],
  },
});
