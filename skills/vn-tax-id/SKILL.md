---
name: vn-tax-id
description: Validate Vietnamese tax identification numbers (mã số thuế, MST) offline - 10-digit enterprise IDs, 13-digit branch IDs (0100233488-001) with check-digit verification, and 12-digit personal IDs (CCCD used as tax ID since 01/07/2025). Use when a user pastes a tax code, asks "MST này có hợp lệ không", needs to validate seller/buyer tax IDs on invoices or contracts, or builds a form that accepts mã số thuế. Does not query the tax authority.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli). No network access.
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese tax ID (mã số thuế)

Offline structural validation of Vietnamese tax IDs. It catches typos (the 10th digit is a checksum) and malformed
branch suffixes. It **cannot** tell whether the ID is registered or active; for that the user must use the official
portal (tracuunnt.gdt.gov.vn) themselves. Never scrape it.

## When to use

- "Check MST 0100233488-001", "mã số thuế này đúng không?"
- Validating `seller.taxId` / `buyer.taxId` before issuing an e-invoice (the `vn-einvoice` skill calls this).
- Building input validation for a form field.

## How to do it

Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

```bash
npx -y @vn-skills/cli taxid validate "0100233488-001"
```

```json
{
  "ok": true,
  "valid": true,
  "normalized": "0100233488001",
  "formatted": "0100233488-001",
  "kind": "branch",
  "root": "0100233488",
  "branch": "001",
  "prefix": "01",
  "checksumValid": true,
  "warnings": []
}
```

Failure (exit code 1):

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_CHECKSUM",
    "message": "Check digit 0 does not match the expected value 8",
    "hint": "..."
  }
}
```

Compute the check digit for the first 9 digits: `npx -y @vn-skills/cli taxid check-digit 010023348` → `0100233488`.

Library: `import { validateTaxId, isValidTaxId, taxIdCheckDigit } from '@vn-skills/core'`.

## Format rules (Circular 105/2020/TT-BTC, Law on Tax Administration 2019 art. 30)

- **10 digits** `N1N2 N3N4N5N6N7N8N9 N10`: N1N2 = issuing province/authority code, N3–N9 = sequence (not all zeros), N10 = check digit.
- **13 digits** `10 digits + 3 digits` (written `0100233488-001`): dependent units / branches; suffix `001`–`999`, never `000`. The root's checksum must be valid.
- **12 digits**: since 01/07/2025 individuals use their personal identification number (CCCD) as tax ID. Only the length is checked (`checksumValid: null`).
- Check digit: weights `31 29 23 19 17 13 7 5 3` on digits 1–9, `check = 10 − (sum mod 11)`; a result of 10 means the sequence cannot exist. See [references/check-digit.md](references/check-digit.md).

## Common mistakes to avoid

- Treating a valid checksum as proof the company exists. Say "structurally valid" in your answer.
- Dropping the dash and then mis-reading `0100233488-01` as a 12-digit personal ID. The tool rejects dashed forms that are not 10-3.
- Stripping leading zeros (`0100233488` must keep its `0`). Store tax IDs as strings, never numbers.
