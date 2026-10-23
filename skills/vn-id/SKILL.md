---
name: vn-id
description: Validate and decode Vietnamese citizen ID numbers offline - 12-digit CCCD (province, sex, birth year, legacy province mapped to the 2025 province) and format check of 9-digit CMND. Use when a user asks "kiểm tra số CCCD", "giải mã căn cước công dân", "CCCD này của tỉnh nào", "CMND 9 số hợp lệ không", or builds a form that accepts số CCCD/CMND. Never queries any registry.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli). No network access.
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese citizen ID (CCCD / CMND)

Offline format validation and decoding. **Format validity does not mean the identity exists.** Never send ID
numbers to third parties (APIs, LLM tools, logs); they are personal data.

## How to do it

Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

```bash
npx -y @vn-skills/cli id parse 048090123456
```

Library: `import { parseCitizenId } from '@vn-skills/core'`. MCP tool: `vn_id_parse`.

## Structure of the 12-digit CCCD

Sources: Circular 59/2021/TT-BCA (15/05/2021), Appendices I and III; Decree 137/2015/NĐ-CP, Art. 7.

- Digits 1–3: province code = `0` + 2-digit GSO province code (legacy 63 provinces), e.g. `001` Hà Nội, `048` Đà Nẵng,
  `079` TP. Hồ Chí Minh, `096` Cà Mau. The result also gives the 2025 province via the old→new mapping.
- Digit 4: sex + century. Male/female: 1900–1999 `0`/`1`, 2000–2099 `2`/`3`, 2100–2199 `4`/`5`,
  2200–2299 `6`/`7`, 2300–2399 `8`/`9`.
- Digits 5–6: last two digits of the birth year. Digits 7–12: random.
- A decoded birth year after the current year (e.g. digit `9` gives 23xx) stays `ok: true` but adds a warning that the
  ID is probably mistyped.
- Unknown codes (e.g. `000`, registered abroad) are reported with `province: null`, not rejected.
- 9 digits: legacy CMND, format only.

## Common mistakes to avoid

- Stripping leading zeros: keep IDs as strings.
- Claiming the person or ID is real. Say "structurally valid".
