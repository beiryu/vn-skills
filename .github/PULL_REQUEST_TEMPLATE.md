<!-- PR title must follow Conventional Commits, e.g. `feat(vn-lunar): add solar terms`. It becomes the squash commit and the changelog entry. -->

## What & why

Closes #

## Checklist

- [ ] Title follows Conventional Commits (`feat|fix|docs|data|test|refactor|perf|build|ci|chore(scope): …`)
- [ ] Tests added or updated (golden test for every bug fix)
- [ ] `pnpm build && pnpm typecheck && pnpm test && pnpm format:check` pass locally
- [ ] Core stays offline (no `fetch`/HTTP in `packages/core`)
- [ ] Data changes go through `scripts/build-data.ts` and `SOURCES.md` (source + license)
- [ ] SKILL.md / README updated if behaviour changed
