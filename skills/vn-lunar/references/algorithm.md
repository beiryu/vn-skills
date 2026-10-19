# Lunar calendar algorithm

The code in `packages/core/src/lunar` is an independent implementation of the published astronomical formulas in Jean
Meeus, _Astronomical Algorithms_ (2nd ed., 1998): new moons from chapter 49 (full periodic and planetary terms), the Sun
from chapter 25, ΔT (TT − UT) from the Espenak & Meeus polynomials. Hồ Ngọc Đức's _Âm lịch Việt Nam_ (2004) popularised
this way of computing the Vietnamese calendar; none of its code is used.

## Rules of the Vietnamese lunar calendar

1. A lunar month begins on the day (local time, UTC+7) of the new moon.
2. Lunar month 11 is the month containing the winter solstice (Sun longitude 270°).
3. A lunar year between two month-11s with 13 months has a leap month: the first month that contains **no**
   major solar term (Sun longitude multiple of 30°).
4. The lunar new year (Tết) is the first day of month 1, two months after month 11.

## Functions

| Function                             | Purpose                                                               |
| ------------------------------------ | --------------------------------------------------------------------- |
| `jdFromDate(d,m,y)` / `jdToDate(jd)` | Julian Day Number ↔ calendar date (Julian before 1582-10-15)          |
| `newMoon(k)`                         | Julian date (UT) of the k-th new moon since 1900-01-01 (Meeus ch. 49) |
| `sunLongitude(jd)`                   | apparent longitude of the Sun (radians)                               |
| `getNewMoonDay(k, tz)`               | local calendar day of new moon k                                      |
| `getSunLongitudeIndex(jd, tz)`       | which 30° sector the Sun is in at local midnight                      |
| `solarToLunar`, `lunarToSolar`       | the conversions, tz defaults to 7                                     |
| `leapMonthOf`, `lunarMonthLength`    | the leap month of a lunar year; 29 or 30 days                         |

## Accuracy and edge cases

- New moons are accurate to about ±10 s against JPL Horizons. Only a new moon within seconds of local midnight can land
  on the wrong day. For past dates this happens once in 1800–2025 (1967-07-07T17:00:04Z, 00:00:04 at UTC+7), which is
  pinned to the JPL day in a small override table.
- For new moons decades ahead, the day depends on future ΔT, which nobody knows to better than a minute; a handful of
  months after 2050 whose new moon falls within a minute of midnight may differ from other calendars.
- UTC+7 is used for every year. Before 1968 calendars in Vietnam were computed for UTC+8 (as in China), so a month whose
  new moon fell between 23:00 and 24:00 UTC+7 can start one day later in calendars printed at the time.

## Can chi

- Year: can = (year + 6) mod 10, chi = (year + 8) mod 12 (2024 → Giáp Thìn).
- Month: can = (year × 12 + month + 3) mod 10, chi = (month + 1) mod 12.
- Day: can = (JD + 9) mod 10, chi = (JD + 1) mod 12.
- Hour: Tý hour (23:00–01:00) can = (day can × 2) mod 10, then sequential.

## 24 solar terms (tiết khí)

Index = ⌊longitude / 15°⌋ starting at Xuân phân (0°): Xuân phân, Thanh minh, Cốc vũ, Lập hạ, Tiểu mãn, Mang chủng,
Hạ chí, Tiểu thử, Đại thử, Lập thu, Xử thử, Bạch lộ, Thu phân, Hàn lộ, Sương giáng, Lập đông, Tiểu tuyết, Đại tuyết,
Đông chí, Tiểu hàn, Đại hàn, Lập xuân, Vũ thủy, Kinh trập.

## Verified anchors (in the test-suite)

Tết 2018–2030, leap months 2014/9, 2017/6, 2020/4, 2023/2, 2025/6, 2028/5, Giỗ Tổ 2024 = 18/04, Trung thu 2024 = 17/09,
a valid lunar day and a solar → lunar → solar round-trip for every solar date 1800-02-01…2199-12-31 (January 1800
still belongs to lunar year 1799, which `lunarToSolar` rejects as out of range), the 1967-07 boundary, and leap month 11 of 2033.
