# Governance

## Roles

| Role        | Who                                              | Can                                                       |
| ----------- | ------------------------------------------------ | --------------------------------------------------------- |
| Maintainer  | @beiryu                                          | Merge, release, triage, set roadmap, grant roles          |
| Reviewer    | contributors with ≥ 3 merged PRs, invited        | Approve PRs in their area, triage                         |
| Contributor | anyone                                           | Open issues and PRs                                       |
| Agents      | GitHub Actions bots (see [AGENTS.md](AGENTS.md)) | File and label roadmap issues, open PRs. **Never merge.** |

## Merge rules (enforced by branch protection on `main`)

1. All changes go through a pull request; no direct pushes.
2. CI (`CI`, `PR lint`) must pass.
3. At least **one approving review from a code owner** ([CODEOWNERS](.github/CODEOWNERS)). Agent-authored PRs always
   need a human approval.
4. Squash merge only. The PR title (Conventional Commits) becomes the commit message on `main`.
5. Conversations must be resolved before merge.

## Decisions

Day-to-day decisions happen in PRs. Larger changes (new skill, new package, data source, breaking API) start as an
issue labelled `type: feature` and are added to [ROADMAP.md](ROADMAP.md) once a maintainer accepts them. Maintainers
decide by lazy consensus; if there is disagreement the lead maintainer decides.

## Releases

Automated by release-please (see `.github/workflows/release.yml`). Maintainers merge the release PR when ready; npm
publishing happens from CI only.

## Sponsorship

Funding goes through [GitHub Sponsors](https://github.com/sponsors/beiryu) (see `.github/FUNDING.yml`). Funds pay for
CI/API costs of the agent pipeline, provider sandbox accounts for e-invoice adapters, and contributor bounties on
issues labelled `help wanted`. Sponsors get no say over the roadmap or merges.
