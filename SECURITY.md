# Security Policy

## Supported versions

Only the latest minor release of `@vn-skills/core`, `@vn-skills/cli` and `@vn-skills/mcp` receives fixes while the
project is `0.x`.

## Reporting a vulnerability

Please **do not** open a public issue. Use
[GitHub private vulnerability reporting](https://github.com/beiryu/vn-skills/security/advisories/new).
You will get an acknowledgement within 3 working days and a fix or mitigation plan within 14 days.

In scope: code execution or path traversal via CLI/MCP inputs, malicious payloads produced by `vietqr build`,
credential leakage from e-invoice adapters, supply-chain issues in published packages, prompt-injection paths in
`SKILL.md` instructions.

Out of scope: correctness bugs (wrong lunar date, wrong ward) — those are regular [bug reports](https://github.com/beiryu/vn-skills/issues/new/choose).

All npm releases are published from CI with [npm provenance](https://docs.npmjs.com/generating-provenance-statements);
verify with `npm audit signatures`.
