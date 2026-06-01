import { execSync } from "child_process";

export function setup() {
  execSync("pnpm --filter @uchi/db build && pnpm --filter @uchi/cli build", {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}
