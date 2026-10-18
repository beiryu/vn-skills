---
name: vn-phone
description: Normalise and classify Vietnamese phone numbers (số điện thoại) offline - converts +84/84/0 forms to 0912 345 678 and E.164, converts pre-2018 11-digit mobile prefixes (0162 → 032) to 10 digits, identifies the original carrier (Viettel, VinaPhone, MobiFone) and landline area codes (mã vùng). Use when a user pastes a phone number, asks "số này của nhà mạng nào", "đổi đầu số 11 số sang 10 số", or builds a phone input form.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli). No network access.
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese phone numbers (số điện thoại)

Offline normalisation and classification. Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

```bash
npx -y @vn-skills/cli phone "+84 162 123 4567"
```

```json
{
  "ok": true,
  "type": "mobile",
  "national": "0321234567",
  "formatted": "0321 234 567",
  "e164": "+84321234567",
  "carrier": "Viettel",
  "convertedFrom": "01621234567"
}
```

Landlines return `areaCode`, `province` (legacy 63-province name) and `province2025` (the province it was merged into).
Invalid input exits with code 1 and `error.code` of `INVALID_FORMAT`, `INVALID_LENGTH` or `UNKNOWN_PREFIX`.

Library: `import { parsePhone } from '@vn-skills/core'`. MCP tool: `vn_phone`.

## Rules

- Mobile numbers have 10 digits (prefix 03x/05x/07x/08x/09x). Landlines have 11 digits with the leading 0: area code
  `024`/`028` + 8 digits, or a 4-digit area code (e.g. `0236`) + 7 digits.
- Pre-2018 11-digit mobile prefixes (0120, 0121, …, 0199) are converted with the MIC 2018 table; the subscriber digits are kept.
- Area codes follow the 63 pre-2025 provinces and were not changed by the 2025 merger.
- Tables are hand-curated in `packages/core/src/phone/prefixes.ts` with sources (Circular 22/2014/TT-BTTTT, MIC 2018 conversion).

## Common mistakes to avoid

- Treating `carrier` as the current carrier. Number portability exists since 16/11/2018, so the prefix gives the
  **original** carrier only.
- Storing phone numbers as numbers; keep them as strings so the leading `0` survives.
- Assuming a valid format means the number is in service.
