# Repository Guidelines

## Project Structure & Module Organization

This is a single-package TypeScript project published as the `shirube` CLI. Active source lives in `src/`: `src/cli/` is the Commander CLI, `src/server/` is the Hono API server, `src/web/` is the React/Vite SPA, and `src/db/` contains Drizzle schema, database setup, and test helpers. Database migrations are in `drizzle/`. Web entry points are `index.html` and `src/web/main.tsx`. Build output goes to `dist/`; do not edit generated files.

## Build, Test, and Development Commands

Use pnpm with Node.js `>=22.12.0`.

- `pnpm install` installs dependencies from `pnpm-lock.yaml`.
- `pnpm dev:server` starts the API server on port 3000.
- `pnpm dev:web` starts the Vite dev server on port 5173 and proxies `/api`.
- `pnpm build` builds the web app, CLI, server bundle, and copies migrations into `dist/`.
- `pnpm typecheck` runs TypeScript checks for Node and web configs.
- `pnpm lint` runs Biome linting over `src/`.
- `pnpm knip` checks unused files, exports, and dependencies.
- `pnpm test` runs DB/server, web, and CLI Vitest suites.
- `pnpm generate` and `pnpm migrate` manage Drizzle migrations.

## Coding Style & Naming Conventions

Code is TypeScript. Follow Biome: tabs, double quotes, recommended lint rules, and organized imports. React components use PascalCase file names such as `GoalPage.tsx`; hooks use `useX.ts`; tests live beside code as `*.test.ts` or `*.test.tsx`. Prefer small functions and existing dependency injection patterns such as `createApp(db)` and `createTestDb()`.

## Testing Guidelines

Vitest is split by environment: `vitest.node.config.ts` for DB/server tests, `vitest.web.config.ts` for jsdom React tests, and `vitest.cli.config.ts` for CLI tests. CLI tests depend on built output, so run `pnpm build` before targeted CLI debugging or rely on `pnpm test`, which builds in CI before tests. Use `createTestDb()` for database tests to avoid writing to the user database.

## Commit & Pull Request Guidelines

Git history uses concise Conventional Commit-style messages, for example `fix: compact month add input` and `test: cover weekly task actions`. Keep commits focused and include tests for behavior changes. PR descriptions should be written in Japanese. Only put `close #<issue-number>` at the top when the user explicitly specified that issue. Include screenshots for visible UI changes and mention migration or release impact; add a Changeset when publishing behavior changes require a version bump.

## Security & Configuration Tips

The default SQLite database is `~/.shirube/db.sqlite`. Override with `SHIRUBE_DB_PATH` when developing or testing manually. Use `SHIRUBE_MIGRATIONS_PATH` only when intentionally pointing at alternate migrations.
