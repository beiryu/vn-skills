# Lunar calendar algorithm

Implementation follows Hồ Ngọc Đức, _Âm lịch Việt Nam_ (2004), which applies the astronomical formulas from
Jean Meeus, _Astronomical Algorithms_ (1998). The code in `packages/core/src/lunar` is a clean-room TypeScript rewrite
of the published formulas.

## Rules of the Vietnamese lunar calendar

1. A lunar month begins on the day (local time, UTC+7) of the new moon.
2. Lunar month 11 is the month containing the winter solstice (Sun longitude 270°).
3. A lunar year between two month-11s with 13 months has a leap month: the first month that contains **no**
   major solar term (Sun longitude multiple of 30°).
4. The lunar new year (Tết) is the first day of month 1, two months after month 11.

## Functions

| Function                             | Purpose                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `jdFromDate(d,m,y)` / `jdToDate(jd)` | Julian Day Number ↔ Gregorian date                                                 |
| `newMoon(k)`                         | Julian date of the k-th new moon since 1900-01-01 (Meeus ch. 49, truncated series) |
| `sunLongitude(jd)`                   | apparent longitude of the Sun (radians)                                            |
| `getNewMoonDay(k, tz)`               | local calendar day of new moon k                                                   |
| `getSunLongitudeIndex(jd, tz)`       | which 30° sector the Sun is in at local midnight                                   |
| `getLunarMonth11(y, tz)`             | day of the new moon starting month 11 of year y                                    |
| `getLeapMonthOffset(a11, tz)`        | position of the leap month after month 11                                          |
| `solarToLunar`, `lunarToSolar`       | the conversions, tz defaults to 7                                                  |

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
full round-trip for every day 2024–2026 and sampled days 1900–2100.
