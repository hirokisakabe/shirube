# Repository Guidelines

## Project Structure & Module Organization

This is a single-package TypeScript project published as the `shirube` CLI. Active source lives in `src/`: `src/cli/` is the Commander CLI, `src/server/` is the Hono API server, `src/web/` is the React/Vite SPA, and `src/db/` contains Drizzle schema, database setup, and test helpers. Database migrations are in `drizzle/`. Web entry points are `index.html` and `src/web/main.tsx`. Build output goes to `dist/`; do not edit generated files.

The build produces npm-publishable output with esbuild and Vite:

```text
dist/
  cli.js     - CLI bundle (bin: shirube)
  server.js  - server bundle
  web/       - web static files
  drizzle/   - copied migration files
```

## Build, Test, and Development Commands

Use pnpm with Node.js `>=22.12.0`.

- `pnpm install` installs dependencies from `pnpm-lock.yaml`.
- `pnpm dev:server` starts the API server on port 3000.
- `pnpm dev:web` starts the Vite dev server on port 5173 and proxies `/api`.
- `pnpm build` builds the web app, CLI, server bundle, and copies migrations into `dist/`.
- `pnpm typecheck` runs TypeScript checks for Node and web configs.
- `pnpm lint` runs ESLint over `src/`.
- `pnpm format` formats files with Prettier.
- `pnpm format:check` checks Prettier formatting.
- `pnpm knip` checks unused files, exports, and dependencies.
- `pnpm test` runs DB/server, web, and CLI Vitest suites.
- `pnpm generate` and `pnpm migrate` manage Drizzle migrations.

`pnpm dev:server` and `pnpm dev:web` should usually run in separate terminals during frontend development.

## Architecture Notes

### Data Layer (`src/db`)

- The default SQLite database is `~/.shirube/db.sqlite`; override it with `SHIRUBE_DB_PATH`.
- `createDb(dbPath?)` returns a database connection and applies migrations from `drizzle/` at startup.
- `SHIRUBE_MIGRATIONS_PATH` can point at alternate migrations, mainly for tests.
- Migration lookup automatically handles bundled execution from `dist/drizzle/` and source execution from the project `drizzle/`.
- Main tables are `tasks` (`date`, `doneAt`, `deletedAt`), `reviews` (`week` is unique), and `goals` (`doneAt`, `deletedAt`).
- Deletes are soft deletes using an ISO string in `deletedAt`.
- Use `createTestDb()` in tests; it returns an in-memory SQLite database and does not touch the user database.

### Server (`src/server`)

- `createApp(db)` returns a Hono app and supports injecting a `createTestDb()` database in tests.
- API routes live under `/api/tasks`, `/api/reviews`, and `/api/goals`.
- Production serving uses `dist/web/` for static web assets.

### CLI (`src/cli`)

- `shirube serve` starts `dist/server.js` as a child process and opens the browser with macOS `open`; it assumes `pnpm build` has already produced `dist/`.
- `--format json` provides machine-readable output.
- `--yes` skips deletion confirmation prompts for agent-driven usage.

## Coding Style & Naming Conventions

Code is TypeScript. Follow ESLint and Prettier: tabs, double quotes, and type-aware lint rules. React components use PascalCase file names such as `GoalPage.tsx`; hooks use `useX.ts`; tests live beside code as `*.test.ts` or `*.test.tsx`. Prefer small functions and existing dependency injection patterns such as `createApp(db)` and `createTestDb()`.

## Testing Guidelines

Vitest is split by environment: `vitest.node.config.ts` for DB/server tests, `vitest.web.config.ts` for jsdom React tests, and `vitest.cli.config.ts` for CLI tests. CLI tests depend on built output, so run `pnpm build` before targeted CLI debugging or rely on `pnpm test`, which builds in CI before tests. Use `createTestDb()` for database tests to avoid writing to the user database.

`vitest.node.config.ts` sets `SHIRUBE_MIGRATIONS_PATH` to `drizzle/` for DB/server tests.

## Commit & Pull Request Guidelines

Git history uses concise Conventional Commit-style messages, for example `fix: compact month add input` and `test: cover weekly task actions`. Keep commits focused and include tests for behavior changes. PR descriptions should be written in Japanese. Only put `close #<issue-number>` at the top when the user explicitly specified that issue. Include screenshots for visible UI changes and mention migration or release impact.

Before creating a PR, check whether the change affects users and needs a Changeset. If a user-facing change was made and the PR does not already include a changeset, run `pnpm changeset` and commit the generated file. Do not add a duplicate changeset when one already exists in the PR.

Use these Changeset version types:

- **patch**: bug fixes and small internal improvements that preserve backward compatibility.
- **minor**: new backward-compatible features.
- **major**: breaking changes that are not backward-compatible.

A changeset is not needed when the change does not require release notes or a version bump. Examples include refactoring with no user-facing behavior change, tests, documentation-only changes, CI configuration, development tooling configuration, and internal operations changes that do not affect release artifacts.

## Security & Configuration Tips

The default SQLite database is `~/.shirube/db.sqlite`. Override with `SHIRUBE_DB_PATH` when developing or testing manually. Use `SHIRUBE_MIGRATIONS_PATH` only when intentionally pointing at alternate migrations.
