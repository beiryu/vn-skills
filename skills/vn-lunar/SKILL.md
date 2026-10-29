---
name: vn-lunar
description: Vietnamese lunar calendar (âm lịch) - convert solar to lunar dates and back, leap months (tháng nhuận), can chi (Giáp Thìn, Ất Tỵ), zodiac, 24 solar terms, Tết date for any year, and Vietnamese public holidays (Tết, Giỗ Tổ Hùng Vương, 30/4, 1/5, 2/9). Uses astronomical new-moon and solar-term calculations at UTC+7, which differs from the Chinese calendar on some dates. Use for "hôm nay là ngày mấy âm lịch", "Tết năm 2027 ngày nào", "lịch âm tháng", "lịch vạn niên", "rằm tháng này", "ngày lễ", "mùng 1", "rằm", "rằm tháng", "ngày âm", scheduling around holidays, or any lunar/solar conversion.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli).
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese lunar calendar (âm lịch)

Astronomical conversion (Meeus formulas) evaluated at **UTC+7**, valid 1800–2199.
The Vietnamese calendar is not the Chinese one: because of the time-zone, some new moons fall on different days
(e.g. Tết 2030 is 2 Feb in Vietnam, 3 Feb in China). Never answer lunar questions from memory; run the tool.

## When to use

- "Ngày 29/01/2025 là ngày mấy âm?", "Tết Bính Ngọ 2026 rơi vào ngày nào?"
- "Năm nay có tháng nhuận không?", "mùng 1 tháng 7 âm là ngày nào dương lịch?"
- "Các ngày nghỉ lễ năm 2026", "lịch Giỗ Tổ".
- Can chi of a day/year for documents, horoscopes, naming.

## How to do it

Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`. Dates accept `dd/mm/yyyy` or `yyyy-mm-dd`.

```bash
npx -y @vn-skills/cli lunar from-solar 29/01/2025
```

Add `--hour <0-23>` for the birth hour ("giờ sinh", "can chi giờ"): the output gains `hourCanChi`, `hourBranch` and `hourRange` (e.g. `Giáp Tý`, `Tý`, `23:00-01:00`). An hour outside 0-23 or a non-integer returns `INVALID_HOUR`. At 23:00 the can of the calendar date you pass is used (the late Tý hour is not moved to the next day). The MCP tool `vn_lunar_from_solar` takes the same optional `hour`.

```json
{
  "ok": true,
  "day": 1,
  "month": 1,
  "year": 2025,
  "leap": false,
  "solar": { "date": "2025-01-29", "weekday": "Thứ tư" },
  "yearCanChi": "Ất Tỵ",
  "monthCanChi": "Mậu Dần",
  "dayCanChi": "Mậu Tuất",
  "zodiacEn": "Snake",
  "solarTerm": "Đại hàn",
  "text": "Mùng 1 tháng Giêng năm Ất Tỵ"
}
```

```bash
npx -y @vn-skills/cli lunar to-solar 15/08/2025          # 2025-10-06  (Trung thu)
npx -y @vn-skills/cli lunar to-solar 01/06/2025 --leap   # leap month 6 of Ất Tỵ
npx -y @vn-skills/cli lunar tet 2027                     # 2027-02-06  Đinh Mùi (Goat)
npx -y @vn-skills/cli lunar holidays 2026 --public       # official days off with solar dates
npx -y @vn-skills/cli lunar canchi 2024                  # Giáp Thìn
npx -y @vn-skills/cli lunar month 02/2027                # whole month: lunar dates, can chi, solar terms, holidays (also yyyy-mm)
```

### Date phrases

```bash
npx -y @vn-skills/cli lunar parse "rằm tháng Giêng năm sau" --ref 2026-10-28   # 2027-02-20
```

Supported (case-insensitive, diacritics optional):

- Lunar: `ngày D tháng M âm`, `D/M âm`, `D/M âm lịch`, `mùng D tháng M`, `rằm tháng M` (day 15); month words `Giêng` (1), `Chạp` (12), `Một` (11); optional `nhuận` after the month.
- Festivals by existing names: `Tết`, `mùng 1 Tết`, `Rằm tháng Giêng`, `Tết Trung thu`, `Vu Lan`, ...
- Year: `năm nay`, `năm sau`, `năm ngoái`, `năm YYYY` (lunar year for lunar phrases, solar year otherwise).
- Relative: `hôm nay`, `ngày mai`, `ngày kia`, `hôm qua`, `N ngày nữa|trước`, `N tuần nữa|trước`, `thứ Hai … Chủ nhật` + `này`/`tuần này`/`tuần sau`/`tuần trước`. Weeks run Monday–Sunday.
- Gregorian: `ngày D tháng M năm Y`, `dd/mm/yyyy`, `yyyy-mm-dd`.

Conventions: a lunar phrase without a year means the next occurrence on or after `ref` (default today, UTC+7). A leap month that does not exist in the target year, or day 30 in a 29-day month, returns `INVALID_DATE` with a hint; nothing is guessed.

Library: `parseVietnameseDate`, `solarToLunar`, `lunarToSolar`, `lunarInfo`, `tetDate`, `holidays`, `yearCanChi`, `dayCanChi`, `leapMonthOf`, `lunarMonthCalendar` from `@vn-skills/core`.

## Rules and gotchas

- Lunar months have 29 or 30 days; `to-solar` fails with `INVALID_DATE` if day 30 does not exist that month.
- A leap month repeats a month number; `--leap` without a leap month that year returns `NOT_LEAP_MONTH` and tells you which month is leap.
- The lunar **year** of a January/February date is usually the previous solar year (2025-01-28 is 29/12 Giáp Thìn **2024**).
- Public holidays (`publicHoliday: true`) follow the Labour Code: 1/1, Tết (5 days around mùng 1), 10/3 âm, 30/4, 1/5,
  2/9 (+1 adjacent day), and 24/11 from 2026 (Resolution 28/2026/QH16). This tool gives the calendar dates; for the
  actual days off of a year (announced Tết days, nghỉ bù, swaps) and working-day arithmetic, use the **vn-holidays**
  skill (`vn-skills holidays year 2026`).
- Algorithm details: [references/algorithm.md](references/algorithm.md).

## Common mistakes to avoid

- Copying Chinese New Year dates or Chinese leap months for Vietnam.
- Assuming "tháng Giêng" = January. Giêng is lunar month 1; "tháng Chạp" is lunar month 12; "tháng Một" is lunar month 11.
- Off-by-one on can chi of the day: use `dayCanChi`, do not compute by hand.
