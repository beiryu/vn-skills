# Contributing

Thanks for helping make coding agents better at Vietnamese business logic.

## Setup

```bash
corepack enable          # or: npm i -g pnpm
pnpm install
pnpm build               # builds packages/core, cli, mcp
pnpm test                # vitest (builds first)
pnpm vn-skills --help    # run the CLI from the repo
```

## Layout

- `skills/<name>/SKILL.md` — Agent Skills (spec: https://agentskills.io). Keep `name` equal to the folder, body < 500 lines, commands use `npx -y @vn-skills/cli`.
- `packages/core` — pure functions, no network, data bundled from `packages/core/data`.
- `packages/cli` — `vn-skills` binary used by the skills. JSON output when piped.
- `packages/mcp` — MCP server exposing the same functions as tools.
- `scripts/build-data.ts` — the only code that downloads anything. Pin upstream commits; update `SOURCES.md` by re-running it.
- `tests/` — vitest; each skill has ≥ 20 cases including edge cases.

## Rules

1. Core must work offline. Never add `fetch`/HTTP to `packages/core`.
2. No scraping of government systems (tax portal, invoice portal). E-invoice adapters are sandbox-only and read credentials from env.
3. Data changes go through `scripts/build-data.ts` with a pinned commit SHA and license check (MIT/Apache/CC-BY are fine).
4. Add a golden test for every bug fix (e.g. a Tết date, an address that failed).
5. Run `pnpm format` before committing.

## Adding a skill

1. Add functions in `packages/core/src/<area>/` and export from `src/index.ts`.
2. Add a CLI command in `packages/cli/src/commands/` and MCP tool(s) in `packages/mcp/src/server.ts`.
3. Create `skills/<name>/SKILL.md` (+ `references/`) following the existing ones.
4. Add `tests/<name>.test.ts` and update the list in `tests/skills.test.ts`.
