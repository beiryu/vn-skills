---
name: vn-number-format
description: Format and parse Vietnamese numbers, currency and dates ("1.234.567,89", "1.200.000 ₫", "1,2 triệu", dd/MM/yyyy) and parse typed amounts like "1tr2", "500k", "1,5 tỷ". Use for "định dạng số", "định dạng tiền", "định dạng ngày", "phân tích số tiền", "1tr2", "500k" or any Vietnamese number/date display or input.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli).
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese number, currency and date format

Vietnamese uses `.` for thousands and `,` for decimals. Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

```bash
npx -y @vn-skills/cli numfmt format 1234567.89   # 1.234.567,89
npx -y @vn-skills/cli numfmt format 1200000 --vnd      # 1.200.000 ₫
npx -y @vn-skills/cli numfmt format 1200000 --compact  # 1,2 triệu
npx -y @vn-skills/cli numfmt date 2025-01-29     # 29/01/2025
npx -y @vn-skills/cli numfmt parse 1tr2          # 1200000
```

MCP tool: `vn_number_format` (`mode`: number, vnd, compact, date, parse).

## Parsing rules

- `maxFractionDigits` must be an integer from 0 to 20, otherwise `INVALID_OPTION`. Numbers with |n| ≥ 1e21 are grouped exactly via BigInt (no exponent notation, no fraction).
- Units: `k`/`nghìn`/`ngàn` = 1.000, `tr`/`triệu`/`m` = 1.000.000, `tỷ`/`b` = 1.000.000.000. Digits after a unit are the fraction: `1tr2` = 1.200.000.
- Suffixes `đ`, `₫`, `đồng`, `vnd` are ignored.
- `,` is always the decimal mark: `1,5` = 1.5, `1,50` = 1.5.
- Ambiguous `1.500`: a lone `.` followed by exactly 3-digit groups is a **thousands separator** (= 1500). Use `1,5k` or `1,5` for decimals.
- Invalid input (`1..2`, `abc`, empty) returns an error.
