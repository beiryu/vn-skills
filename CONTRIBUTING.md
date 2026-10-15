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

## Commits and pull requests

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`.
  Types: `feat`, `fix`, `data`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `revert`.
  Scopes: a skill name (`vietqr`, `vn-address`, …), `core`, `cli`, `mcp`, `data`, `deps`, `repo`.
  `pnpm install` installs a `commit-msg` hook that runs commitlint; CI checks it again.
- One logical change per PR. PRs are **squash-merged**, so the PR title must also be a valid Conventional Commit — it
  becomes the changelog entry (`feat` → minor, `fix`/`data` → patch, `!` or `BREAKING CHANGE:` → major).
- Every PR needs green CI and one approval from a code owner. See [GOVERNANCE.md](GOVERNANCE.md).
- Link the issue (`Closes #123`). For roadmap work, keep the `RM-NNN` id in the PR body.
- Language: English for code, commits, issues and PRs. Vietnamese is welcome in issue discussions and is required in
  `README.vi.md` and SKILL.md trigger words.

## Finding something to work on

- [`good first issue`](https://github.com/beiryu/vn-skills/labels/good%20first%20issue) and
  [`help wanted`](https://github.com/beiryu/vn-skills/labels/help%20wanted) issues are reserved for humans.
- [ROADMAP.md](ROADMAP.md) lists planned work; comment on the issue before starting a `size: m` or larger item.
- Issues labelled `agent: ready` may be picked up by the implementer agent ([AGENTS.md](AGENTS.md)). If you want one,
  comment and a maintainer will remove the label.

## Adding a skill

1. Add functions in `packages/core/src/<area>/` and export from `src/index.ts`.
2. Add a CLI command in `packages/cli/src/commands/` and MCP tool(s) in `packages/mcp/src/server.ts`.
3. Create `skills/<name>/SKILL.md` (+ `references/`) following the existing ones.
4. Add `tests/<name>.test.ts` and update the list in `tests/skills.test.ts`.
