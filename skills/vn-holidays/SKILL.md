---
name: vn-holidays
description: Vietnamese public holidays and working days (ngày nghỉ lễ, nghỉ Tết, nghỉ bù, hoán đổi ngày làm việc) - the official days off of a year from the Government notice, whether a date is a working day, and adding N working days to a date and counting the working days between two dates (deadlines, SLAs, payroll). Covers Tết Dương lịch, Tết Âm lịch, Giỗ Tổ Hùng Vương, 30/4, 1/5 and Quốc khánh under the Labour Code 2019. Use for "lịch nghỉ Tết năm nay", "ngày làm việc", "nghỉ lễ 30/4 mấy ngày", "cộng 5 ngày làm việc", "đếm ngày làm việc", "bao nhiêu ngày làm việc", "public holidays", "working days", "business days".
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli; the first run downloads the package). Calculations run offline.
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese public holidays and working days

Official days off for **public-sector staff** (cán bộ, công chức, viên chức: Monday-Friday) under the Labour Code 2019
(Law 45/2019/QH14, Art. 112), with the schedule the Government announces each year. Inside this repo use
`pnpm vn-skills` instead of `npx -y @vn-skills/cli`.

```bash
npx -y @vn-skills/cli holidays year 2026          # days off, nghỉ bù, swapped Saturdays, sources
npx -y @vn-skills/cli holidays check 2026-02-16 --json   # is it a working day?
npx -y @vn-skills/cli holidays add 2026-02-12 3   # 3 working days later
npx -y @vn-skills/cli holidays count 2026-02-10 2026-03-02   # working days in (from, to]
```

`holidays check … --json` prints (JSON is also the default when output is piped):

```json
{ "ok": true, "date": "2026-02-16", "working": false, "certain": true, "reason": "Tết Âm lịch" }
```

Library: `import { publicHolidays, isWorkingDay, addWorkingDays, countWorkingDays } from '@vn-skills/core'`. MCP tools:
`vn_holidays_year`, `vn_holidays_is_working_day`, `vn_holidays_add_working_days`, `vn_holidays_count_working_days`.

`holidays count <from> <to>` counts working days in `(from, to]`: the start date is **not** counted and the end date
**is** (the inverse of `add`). If `to` is before `from` the result is negative. Ranges over 3660 days return
`RANGE_TOO_LARGE`; `certain: false` means an unannounced Tết or National Day window was crossed.

## Rules

- Statutory days off (Art. 112): 1/1; 5 days of Tết Âm lịch; Giỗ Tổ Hùng Vương (10/3 lunar); 30/4; 1/5; 2/9 plus one
  adjacent day; and 24/11 Ngày Văn hóa Việt Nam from 2026 (National Assembly Resolution 28/2026/QH16, Art. 2).
- A holiday on Saturday or Sunday gives a day off on the next working day (nghỉ bù, Art. 111(3)).
- Which 5 days of Tết, which day next to 2/9, and any swap (hoán đổi: a weekday off, a Saturday worked) are fixed by the
  yearly notice. Announced years return `announced: true` and the notice in `sources`.
- Years with no notice in the data return the fixed-date holidays with nghỉ bù, `announced: false`, and `pending`
  entries for Tết and the second National Day. `isWorkingDay` then returns `certain: false` for weekdays from 26 Chạp to mùng 10
  and from 1 to 5 September, and `addWorkingDays` passes `certain: false` on when it crosses one.
- Supported years: 2023-2199 (the first year with a notice in the data; the Labour Code 2019 applies from 2021).

## Common mistakes to avoid

- Applying the public-sector schedule to a company without checking: private employers choose the Tết days and swaps
  within the law, and may work on Saturdays.
- Guessing Tết days for a year that is not announced; say they are not announced yet.
- Forgetting nghỉ bù when a holiday falls on a weekend.
