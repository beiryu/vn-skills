import { getNewMoonDay, getSunLongitudeIndex, jdFromDate, jdToDate } from './astro.js';
import { fail, type Result } from '../shared/result.js';

export const VN_TIMEZONE = 7;

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  /** true when this month is the leap (nhuận) month. */
  leap: boolean;
  /** Julian Day Number of the solar date. */
  jd: number;
}

export interface SolarDate {
  day: number;
  month: number;
  year: number;
  jd: number;
}

/** Day of the new moon that starts lunar month 11 of year yy (the month containing the winter solstice). */
export function getLunarMonth11(yy: number, timeZone = VN_TIMEZONE): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitudeIndex(nm, timeZone);
  if (sunLong >= 9) nm = getNewMoonDay(k - 1, timeZone);
  return nm;
}

/** Offset (in months after month 11) of the leap month between two month-11 new moons; 0 when none. */
export function getLeapMonthOffset(a11: number, timeZone = VN_TIMEZONE): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last: number;
  let i = 1;
  let arc = getSunLongitudeIndex(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitudeIndex(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function isValidSolarDate(dd: number, mm: number, yy: number): boolean {
  if (!Number.isInteger(dd) || !Number.isInteger(mm) || !Number.isInteger(yy)) return false;
  if (mm < 1 || mm > 12 || dd < 1) return false;
  const back = jdToDate(jdFromDate(dd, mm, yy));
  return back.day === dd && back.month === mm && back.year === yy;
}

/** Convert a solar (Gregorian) date to the Vietnamese lunar date. */
export function solarToLunar(
  dd: number,
  mm: number,
  yy: number,
  timeZone = VN_TIMEZONE,
): Result<LunarDate> {
  if (!isValidSolarDate(dd, mm, yy))
    return fail('INVALID_DATE', `Invalid solar date ${dd}/${mm}/${yy}`);
  if (yy < 1800 || yy > 2199) return fail('OUT_OF_RANGE', 'Supported years: 1800-2199');
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) lunarLeap = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return {
    ok: true,
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: lunarLeap,
    jd: dayNumber,
  };
}

/** Convert a Vietnamese lunar date to the solar (Gregorian) date. */
export function lunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap = false,
  timeZone = VN_TIMEZONE,
): Result<SolarDate> {
  if (![lunarDay, lunarMonth, lunarYear].every(Number.isInteger))
    return fail('INVALID_DATE', 'Lunar day/month/year must be integers');
  if (lunarMonth < 1 || lunarMonth > 12 || lunarDay < 1 || lunarDay > 30) {
    return fail('INVALID_DATE', `Invalid lunar date ${lunarDay}/${lunarMonth}/${lunarYear}`);
  }
  if (lunarYear < 1800 || lunarYear > 2199)
    return fail('OUT_OF_RANGE', 'Supported years: 1800-2199');
  let a11: number;
  let b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (lunarLeap && lunarMonth !== leapMonth) {
      return fail(
        'NOT_LEAP_MONTH',
        `Lunar year ${lunarYear} has no leap month ${lunarMonth}`,
        `The leap month that year is ${leapMonth}.`,
      );
    }
    if (lunarLeap || off >= leapOff) off += 1;
  } else if (lunarLeap) {
    return fail('NOT_LEAP_MONTH', `Lunar year ${lunarYear} has no leap month`);
  }
  const monthStart = getNewMoonDay(k + off, timeZone);
  const nextMonthStart = getNewMoonDay(k + off + 1, timeZone);
  if (lunarDay > nextMonthStart - monthStart) {
    return fail(
      'INVALID_DATE',
      `Lunar month ${lunarMonth}/${lunarYear} has only ${nextMonthStart - monthStart} days`,
    );
  }
  const jd = monthStart + lunarDay - 1;
  const d = jdToDate(jd);
  return { ok: true, day: d.day, month: d.month, year: d.year, jd };
}

/** Which month is the leap month of a lunar year, or null when the year has none. */
export function leapMonthOf(lunarYear: number, timeZone = VN_TIMEZONE): number | null {
  const a11 = getLunarMonth11(lunarYear - 1, timeZone);
  const b11 = getLunarMonth11(lunarYear, timeZone);
  if (b11 - a11 <= 365) return null;
  let leapMonth = getLeapMonthOffset(a11, timeZone) - 2;
  if (leapMonth < 0) leapMonth += 12;
  return leapMonth;
}

/** Number of days in a lunar month (29 or 30). */
export function lunarMonthLength(
  lunarMonth: number,
  lunarYear: number,
  leap = false,
  timeZone = VN_TIMEZONE,
): number | null {
  const first = lunarToSolar(1, lunarMonth, lunarYear, leap, timeZone);
  if (!first.ok) return null;
  const d30 = lunarToSolar(30, lunarMonth, lunarYear, leap, timeZone);
  return d30.ok ? 30 : 29;
}
