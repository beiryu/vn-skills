# @vn-skills/core

Pure TypeScript helpers for Vietnam-specific business logic. No network, no file system; data is bundled.

```ts
import { buildVietQR, parseVietQR, findBank } from '@vn-skills/core'; // VietQR (NAPAS 247 / EMVCo)
import { parseAddress, convertAddress, PROVINCES } from '@vn-skills/core'; // 34 provinces (01/07/2025), old→new mapping
import { validateTaxId } from '@vn-skills/core'; // mã số thuế check digit
import { moneyToWords } from '@vn-skills/core'; // số tiền bằng chữ
import { solarToLunar, lunarToSolar, lunarInfo, holidays } from '@vn-skills/core'; // âm lịch
import { validateInvoice, computeTotals, MockProvider } from '@vn-skills/core'; // hóa đơn điện tử
```

Every function returns `{ ok: true, ... }` or `{ ok: false, error: { code, message, hint } }`.

Part of [vn-skills](https://github.com/beiryu/vn-skills) — Agent Skills + CLI + MCP server. Data sources: `data/SOURCES.md`.
