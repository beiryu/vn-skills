/**
 * Solar ↔ Vietnamese lunar calendar conversion.
 *
 * Calendar rules (UTC+7):
 * - A lunar month starts on the local civil day containing the astronomical new moon.
 * - Month 11 is the month containing the December solstice (solar longitude 270°).
 * - When 13 months separate two consecutive months 11, the first month after the earlier
 *   month 11 in which the Sun enters no new 30° sector (no major solar term) is the leap
 *   month; it repeats the number of the month before it.
 * - Months 11 and 12 (and a leap month among them) belong to the lunar year that is ending;
 *   the next lunar year starts with month 1 (Tết).
 *
 * Internally, lunations are identified by their index `k` as used by {@link newMoon}.
 */
import { fail, type Result } from '../shared/result.js';
import {
  SYNODIC_MONTH,
  getNewMoonDay,
  getSunLongitudeIndex,
  jdFromDate,
  jdToDate,
} from './astro.js';

export const VN_TIMEZONE = 7;

const MIN_YEAR = 1800;
const MAX_YEAR = 2199;

/** Approximate JDN of new moon k = 0 (1900-01-01), used only to seed searches. */
const LUNATION_ZERO_JDN = 2415021;

/** 30° sector index whose start (longitude 270°) is the December solstice. */
const WINTER_SOLSTICE_SECTOR = 9;

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

/** True when the numbers form a real (Gregorian) calendar date. */
export function isValidSolarDate(dd: number, mm: number, yy: number): boolean {
  if (![dd, mm, yy].every(Number.isInteger)) return false;
  if (mm < 1 || mm > 12 || dd < 1) return false;
  const back = jdToDate(jdFromDate(dd, mm, yy));
  return back.day === dd && back.month === mm && back.year === yy;
}

/** Index of the lunation whose first local day is on or before `jdn`, with no later one that is. */
function lunationContaining(jdn: number, timeZone: number): number {
  let k = Math.floor((jdn - LUNATION_ZERO_JDN) / SYNODIC_MONTH);
  while (getNewMoonDay(k + 1, timeZone) <= jdn) k++;
  while (getNewMoonDay(k, timeZone) > jdn) k--;
  return k;
}

/** Index of the lunation that is month 11 of Gregorian year `yy` (holds its December solstice). */
function monthElevenLunation(yy: number, timeZone: number): number {
  let k = lunationContaining(jdFromDate(21, 12, yy), timeZone);
  // Around December the Sun is in sector 8, 9 or 10, so plain comparisons are safe.
  // Step back while the month already starts after the solstice...
  while (getSunLongitudeIndex(getNewMoonDay(k, timeZone), timeZone) >= WINTER_SOLSTICE_SECTOR) k--;
  // ...and forward while the following month still starts before it.
  while (getSunLongitudeIndex(getNewMoonDay(k + 1, timeZone), timeZone) < WINTER_SOLSTICE_SECTOR) {
    k++;
  }
  return k;
}

/** Local JDN of the first day of lunar month 11 that falls in Gregorian year `yy`. */
export function monthElevenStartDay(yy: number, timeZone = VN_TIMEZONE): number {
  return getNewMoonDay(monthElevenLunation(yy, timeZone), timeZone);
}

/**
 * The months from month 11 of Gregorian year `yy` up to (not including) month 11 of `yy + 1`.
 * `leapOffset` is the position (counted from that first month 11 = 0) of the leap month, if any.
 */
interface SolsticeSpan {
  year: number;
  firstLunation: number;
  leapOffset: number | null;
}

function solsticeSpan(yy: number, timeZone: number): SolsticeSpan {
  const firstLunation = monthElevenLunation(yy, timeZone);
  const monthCount = monthElevenLunation(yy + 1, timeZone) - firstLunation;
  let leapOffset: number | null = null;
  if (monthCount === 13) {
    const sectorAtStart = (offset: number) =>
      getSunLongitudeIndex(getNewMoonDay(firstLunation + offset, timeZone), timeZone);
    for (let offset = 1; offset <= 12; offset++) {
      if (sectorAtStart(offset) === sectorAtStart(offset + 1)) {
        leapOffset = offset;
        break;
      }
    }
  }
  return { year: yy, firstLunation, leapOffset };
}

/** Lunar month number, lunar year and leap flag of the month at `offset` within a span. */
function labelAt(
  span: SolsticeSpan,
  offset: number,
): { month: number; year: number; leap: boolean } {
  const leap = span.leapOffset === offset;
  const regular = span.leapOffset !== null && offset >= span.leapOffset ? offset - 1 : offset;
  // regular 0 → month 11, 1 → month 12, 2 → month 1, ..., 11 → month 10.
  const month = ((regular + 10) % 12) + 1;
  const year = regular < 2 ? span.year : span.year + 1;
  return { month, year, leap };
}

/** Convert a solar (Gregorian) date to the Vietnamese lunar calendar. */
export function solarToLunar(
  dd: number,
  mm: number,
  yy: number,
  timeZone = VN_TIMEZONE,
): Result<LunarDate> {
  if (!isValidSolarDate(dd, mm, yy))
    return fail('INVALID_DATE', `Invalid solar date ${dd}/${mm}/${yy}`);
  if (yy < MIN_YEAR || yy > MAX_YEAR) return fail('OUT_OF_RANGE', 'Supported years: 1800-2199');

  const jd = jdFromDate(dd, mm, yy);
  const lunation = lunationContaining(jd, timeZone);
  const thisYearSpan = solsticeSpan(yy, timeZone);
  const span =
    lunation >= thisYearSpan.firstLunation ? thisYearSpan : solsticeSpan(yy - 1, timeZone);
  const label = labelAt(span, lunation - span.firstLunation);
  return {
    ok: true,
    day: jd - getNewMoonDay(lunation, timeZone) + 1,
    month: label.month,
    year: label.year,
    leap: label.leap,
    jd,
  };
}

/** The month (1..12) repeated as leap month in `lunarYear`, or null when the year has none. */
export function leapMonthOf(lunarYear: number, timeZone = VN_TIMEZONE): number | null {
  // A leap month numbered 1..10 sits in the span that starts in the previous Gregorian year;
  // a leap 11 or 12 sits in the span starting in `lunarYear` itself.
  for (const span of [solsticeSpan(lunarYear - 1, timeZone), solsticeSpan(lunarYear, timeZone)]) {
    if (span.leapOffset === null) continue;
    const label = labelAt(span, span.leapOffset);
    if (label.year === lunarYear) return label.month;
  }
  return null;
}

/** First local day and length of an existing lunar month (inputs assumed validated). */
function locateMonth(
  lunarMonth: number,
  lunarYear: number,
  leap: boolean,
  timeZone: number,
): { startDay: number; length: number } {
  const span = solsticeSpan(lunarMonth >= 11 ? lunarYear : lunarYear - 1, timeZone);
  let offset: number;
  if (leap && span.leapOffset !== null) {
    offset = span.leapOffset;
  } else {
    offset = lunarMonth >= 11 ? lunarMonth - 11 : lunarMonth + 1;
    if (span.leapOffset !== null && offset >= span.leapOffset) offset++;
  }
  const startDay = getNewMoonDay(span.firstLunation + offset, timeZone);
  const nextStart = getNewMoonDay(span.firstLunation + offset + 1, timeZone);
  return { startDay, length: nextStart - startDay };
}

/** Convert a Vietnamese lunar date to the solar (Gregorian) calendar. */
export function lunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap = false,
  timeZone = VN_TIMEZONE,
): Result<SolarDate> {
  if (![lunarDay, lunarMonth, lunarYear].every(Number.isInteger)) {
    return fail('INVALID_DATE', 'Lunar day/month/year must be integers');
  }
  if (lunarDay < 1 || lunarDay > 30 || lunarMonth < 1 || lunarMonth > 12) {
    return fail('INVALID_DATE', `Invalid lunar date ${lunarDay}/${lunarMonth}/${lunarYear}`);
  }
  if (lunarYear < MIN_YEAR || lunarYear > MAX_YEAR) {
    return fail('OUT_OF_RANGE', 'Supported years: 1800-2199');
  }
  if (lunarLeap) {
    const leapMonth = leapMonthOf(lunarYear, timeZone);
    if (leapMonth === null) {
      return fail('NOT_LEAP_MONTH', `Lunar year ${lunarYear} has no leap month`);
    }
    if (leapMonth !== lunarMonth) {
      return fail(
        'NOT_LEAP_MONTH',
        `Lunar year ${lunarYear} has no leap month ${lunarMonth}`,
        `The leap month that year is ${leapMonth}.`,
      );
    }
  }
  const { startDay, length } = locateMonth(lunarMonth, lunarYear, lunarLeap, timeZone);
  if (lunarDay > length) {
    return fail('INVALID_DATE', `Lunar month ${lunarMonth}/${lunarYear} has only ${length} days`);
  }
  const jd = startDay + lunarDay - 1;
  return { ok: true, ...jdToDate(jd), jd };
}

/** Number of days (29 or 30) in a lunar month, or null when that month does not exist. */
export function lunarMonthLength(
  lunarMonth: number,
  lunarYear: number,
  leap = false,
  timeZone = VN_TIMEZONE,
): number | null {
  if (!Number.isInteger(lunarMonth) || !Number.isInteger(lunarYear)) return null;
  if (lunarMonth < 1 || lunarMonth > 12) return null;
  if (lunarYear < MIN_YEAR || lunarYear > MAX_YEAR) return null;
  if (leap && leapMonthOf(lunarYear, timeZone) !== lunarMonth) return null;
  return locateMonth(lunarMonth, lunarYear, leap, timeZone).length;
}
