---
name: vn-money-words
description: Convert VND amounts to Vietnamese words ("1.200.000 đồng" -> "một triệu hai trăm nghìn đồng") with correct rules for mốt/lăm/tư, lẻ/linh, nghìn/ngàn, zero groups and very large numbers (tỷ tỷ). Use for invoices, contracts, receipts, bank transfer forms, "số tiền bằng chữ", "đọc số tiền thành chữ", "viết bằng chữ", or any time an amount must be spelled out in Vietnamese.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli).
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Money in Vietnamese words (số tiền bằng chữ)

Deterministic, tested reading of integer VND amounts. Use it instead of writing the words yourself; the edge cases
(`105` → "một trăm **lẻ** năm", `1005` → "một nghìn **không trăm lẻ** năm", `24` → "hai mươi **tư**") are easy to get wrong.

## When to use

- "Số tiền bằng chữ" on hóa đơn / hợp đồng / phiếu thu / ủy nhiệm chi.
- Bank transfer notes that must spell the amount.
- Any UI or document that needs the amount in words next to the digits.

## How to do it

Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

```bash
npx -y @vn-skills/cli money words 1200000
# một triệu hai trăm nghìn đồng
npx -y @vn-skills/cli money words 1.200.000 --capitalize --chan
# Một triệu hai trăm nghìn đồng chẵn
npx -y @vn-skills/cli money words 2500000 --thousand ngàn --odd linh
# hai triệu năm trăm ngàn đồng
```

JSON output: `{ "ok": true, "amount": "1200000", "words": "một triệu hai trăm nghìn đồng" }`.

Options:

| Flag               | Effect                                                   |
| ------------------ | -------------------------------------------------------- |
| `--thousand ngàn`  | southern "ngàn" instead of "nghìn"                       |
| `--odd linh`       | "linh" instead of "lẻ" for x0y (105 → một trăm linh năm) |
| `--no-tu`          | read 24 as "hai mươi bốn" instead of "hai mươi tư"       |
| `-u, --unit ""`    | change/remove the unit word (default "đồng")             |
| `-c, --capitalize` | capital first letter (invoice style)                     |
| `--chan`           | append "chẵn" when the amount is a round thousand        |

Library: `moneyToWords(1200000, { capitalize: true })` and `numberToWords(2024)` from `@vn-skills/core`.

## Rules implemented

See [references/reading-rules.md](references/reading-rules.md). Summary:

- Groups of three digits with scale words `nghìn`, `triệu`, `tỷ`; above 10¹² the scale repeats: `nghìn tỷ`, `triệu tỷ`, `tỷ tỷ`.
- `mười` for 10–19, `mươi` for 20–90; `mốt` for x1 (x ≥ 2), `lăm` for x5 (x ≥ 1), `tư` for x4 (x ≥ 2, optional).
- `lẻ`/`linh` when tens = 0 and units > 0 inside a group that has hundreds (or is not the leading group).
- Non-leading groups with hundreds = 0 read `không trăm`; groups that are entirely 0 are skipped.
- `0` → "không đồng"; negatives get "âm" in front.
- Inputs: integers only (number, bigint, or string with `.`/`,` thousands separators). Decimals are rejected: VND has no sub-unit.

## Common mistakes to avoid

- Rounding or truncating amounts before converting. Convert the exact integer.
- Mixing "nghìn" and "ngàn" in one document; pick one via `--thousand`.
- Forgetting "không trăm" (1.005.000 → "một triệu **không trăm lẻ năm** nghìn đồng").
- Forgetting the unit or "chẵn" convention your template uses; ask or follow the existing document style.
