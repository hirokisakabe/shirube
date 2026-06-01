#!/usr/bin/env node
import { Command } from "commander";
import { writeData, writeError, type Format } from "./output.js";

const program = new Command();

program
  .name("uchi")
  .description("uchi CLI")
  .version("0.0.1")
  .option("--format <format>", "output format (json|table)", "table");

program.addHelpCommand(false);

program.configureOutput({
  writeErr: () => {},
});

program.action((options: { format: Format }) => {
  writeData({ version: program.version() }, options.format);
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
