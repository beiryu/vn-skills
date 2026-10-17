# Roadmap

This file is the **single source of truth** for planned work. Each `planned` item gets one GitHub issue titled
`[RM-NNN] …`; the status moves to `filed (#N)` and, when the PR lands, to `done (#PR)`.

## Item format (keep it — tooling parses it)

```
### RM-NNN · <scope>: <title>
- status: idea | planned | filed (#N) | done (#PR)
- milestone: vX.Y
- labels: comma-separated labels from .github/labels.yml
- size: s | m | l
- depends: RM-NNN, …         # optional
<free text: goal, then an "Acceptance:" checklist>
```

Rules: IDs are never reused. `size: l` items must be split before work starts. Items that need money, accounts, legal
judgement or real third-party APIs need a maintainer to drive them.

## Technical direction

- **Language: TypeScript stays the only implementation language for the core.** Agent runtimes (Claude Code, Cursor,
  Codex) and MCP clients already ship Node; one implementation means one set of bugs. The Python package is a thin
  port verified against the **same JSON golden fixtures** (`tests/golden/`), not an independent rewrite.
- **Project language:** code, commits, issues and PRs in English; user docs in English + Vietnamese (`README.vi.md`);
  every `SKILL.md` description includes Vietnamese trigger words (e.g. "chuyển khoản", "hóa đơn").
- Offline core, no scraping of government systems, cited data sources — unchanged from [CONTRIBUTING.md](CONTRIBUTING.md).

---

## v0.2 — Launch-ready

### RM-001 · repo: golden fixtures shared by TS and future Python port

- status: done (#12)
- milestone: v0.2
- labels: type: chore, area: core
- size: m

Move the hard-coded expected values in `tests/*.test.ts` that are pure input→output into `tests/golden/<skill>.json`
and load them from the tests.
Acceptance:

- [ ] Each of the 6 skills has a `tests/golden/<skill>.json` with ≥ 20 cases
- [ ] Tests iterate the fixtures; no coverage lost (same or more assertions)

### RM-002 · cli: `vn-skills install <skill|all> --agent claude|cursor|codex`

- status: done (#26)
- milestone: v0.2
- labels: type: feature, area: cli
- size: m

Copy skill folders (bundled in the CLI package) into the right directory for each agent, project or user scope.
Acceptance:

- [ ] `--agent claude` → `.claude/skills/<name>` (project) or `~/.claude/skills/<name>` (`--global`)
- [ ] `--agent cursor` → `.cursor/skills/`, `--agent codex` → `.codex/skills/`
- [ ] Refuses to overwrite without `--force`; `--dry-run` prints actions
- [ ] Tests use a temp dir; README install section updated

### RM-003 · docs: per-agent install guides + demo GIF

- status: idea
- milestone: v0.2
- labels: type: docs
- size: s

Needs a human screen recording.

### RM-004 · repo: skill trigger evals

- status: filed (#4)
- milestone: v0.2
- labels: type: chore, area: skill
- size: m

A test that checks each `SKILL.md` description contains the Vietnamese and English keywords listed in a
`tests/golden/triggers.json` (e.g. vietqr: "VietQR", "chuyển khoản", "QR thanh toán"), so description edits can't
silently break triggering.
Acceptance:

- [ ] ≥ 5 keywords per skill, both languages
- [ ] Fails with a clear message naming the missing keyword

### RM-005 · ci: monthly data-freshness check

- status: filed (#5)
- milestone: v0.2
- labels: type: chore, area: infra, type: data
- size: s

Scheduled workflow that runs `pnpm build-data` against the latest upstream commits (not the pinned ones) and opens an
issue labelled `type: data` if the output differs.
Acceptance:

- [ ] Runs on the 1st of each month and on `workflow_dispatch`
- [ ] Does not open a duplicate if an open issue with the same title exists

---

## v0.3 — New skills

### RM-010 · vn-id: validate and decode CCCD (12-digit citizen ID)

- status: filed (#6)
- milestone: v0.3
- labels: type: feature, area: skill, area: core
- size: m

Validate format and decode the first 6 digits: province code (3, legacy 63-province codes), sex + century (1), year of
birth (2). Map the legacy province to the 2025 province with the existing address mapping. Also validate the 9-digit
legacy CMND format (format only). Offline, no lookups.
Acceptance:

- [ ] `@vn-skills/core` `parseCitizenId()`, CLI `vn-skills id parse`, MCP tool `vn_id_parse`, `skills/vn-id/SKILL.md`
- [ ] ≥ 20 tests incl. century boundaries (1999/2000, 2099/2100 codes) and unknown province codes
- [ ] SKILL.md warns: format validity ≠ identity exists; never send IDs to third parties

### RM-011 · vn-holidays: official days off per year

- status: filed (#7)
- milestone: v0.3
- labels: type: feature, area: skill, area: lunar
- size: m
- depends: RM-001

Build on `vn-lunar`: statutory holidays under the Labour Code (Tết Dương lịch, Tết Âm lịch, Giỗ Tổ Hùng Vương, 30/4,
1/5, 2/9) plus a data file of announced compensatory/swap days per year with source URLs. `isWorkingDay(date)` and
`addWorkingDays(date, n)`.
Acceptance:

- [ ] Data file `packages/core/data/holidays.json` with a source for every announced year
- [ ] ≥ 20 tests incl. weekend-collision compensation
- [ ] Years without an announcement return statutory days and `announced: false`

### RM-012 · vn-phone: normalise and classify Vietnamese phone numbers

- status: filed (#8)
- milestone: v0.3
- labels: type: feature, area: skill, area: core
- size: s

Normalise `+84`/`84`/`0` forms, convert pre-2018 11-digit mobile prefixes to 10-digit, identify carrier by prefix,
detect landline area codes. Format as `0912 345 678` and E.164.
Acceptance:

- [ ] Core + CLI + MCP + SKILL.md, ≥ 20 tests incl. old 01xx prefixes and invalid lengths
- [ ] Prefix table in `packages/core/data/` with source

### RM-013 · vn-number-format: Vietnamese number, currency and date formatting

- status: done (#24)
- milestone: v0.3
- labels: type: feature, area: skill, area: money
- size: s

`1.234.567,89`, `1.200.000 ₫` / `1,2 triệu`, `dd/MM/yyyy`, parsing user-typed amounts like "1tr2", "500k", "1,5 tỷ".
Acceptance:

- [ ] Parse + format both directions, ≥ 20 tests incl. ambiguous "1.500" (thousand vs decimal) documented behaviour

### RM-014 · vn-name: split and sort Vietnamese full names

- status: filed (#10)
- milestone: v0.3
- labels: type: feature, area: skill, area: core
- size: s

Split họ / tên đệm / tên, handle compound surnames (Tôn Thất, Nguyễn Phúc, …), sort by tên with Vietnamese collation,
generate unaccented slugs and initials.
Acceptance:

- [ ] ≥ 20 tests incl. compound surnames and single-word names

### RM-015 · vn-pit: personal income tax calculator

- status: idea
- milestone: v0.3
- labels: type: feature, area: skill, area: core
- size: m

Progressive PIT on salary with family deductions and mandatory insurance. Deduction levels and brackets change by law;
needs a maintainer to confirm the current legal source and effective dates before work starts.

### RM-016 · vn-bank-statement: parse bank statement exports

- status: idea
- milestone: v0.3
- labels: type: feature, area: skill
- size: l

Needs real (anonymised) CSV/XLSX samples per bank. Split per bank before implementing.

---

## v0.4 — Ecosystem

### RM-020 · python: `vn-skills` on PyPI passing the shared golden fixtures

- status: idea
- milestone: v0.4
- labels: type: feature, area: core
- size: l
- depends: RM-001

### RM-021 · vn-einvoice: MISA meInvoice sandbox adapter

- status: idea
- milestone: v0.4
- labels: type: feature, area: einvoice
- size: m

Needs sandbox credentials (maintainer-owned). Same for Viettel S-Invoice (RM-022) and VNPT (RM-023).

### RM-024 · vietqr: decode VietQR from an image

- status: filed (#11)
- milestone: v0.4
- labels: type: feature, area: vietqr, area: cli
- size: s

`vn-skills vietqr decode qr.png` using the existing `jsqr` dev dependency (move to CLI deps), then `parseVietQR`.
Acceptance:

- [ ] Round-trip test: `build --out` PNG → `decode` → same fields
- [ ] Clear error for images without a QR

### RM-025 · docs: bilingual docs site

- status: idea
- milestone: v0.4
- labels: type: docs
- size: m
