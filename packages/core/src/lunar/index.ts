import { jdFromDate, getSolarTermIndex } from './astro.js';
import {
  solarToLunar,
  lunarToSolar,
  leapMonthOf,
  lunarMonthLength,
  VN_TIMEZONE,
  type LunarDate,
} from './convert.js';
import {
  yearCanChi,
  monthCanChi,
  dayCanChi,
  hourCanChi,
  lunarMonthName,
  SOLAR_TERMS,
  CHI_ANIMALS_EN,
  CHI,
} from './canchi.js';
import { fail, type Result } from '../shared/result.js';
import { holidays } from './holidays.js';
import { publicHolidays } from '../holidays/index.js';

export { jdFromDate, jdToDate, newMoon, sunLongitude } from './astro.js';
export {
  solarToLunar,
  lunarToSolar,
  leapMonthOf,
  lunarMonthLength,
  isValidSolarDate,
  VN_TIMEZONE,
  type LunarDate,
  type SolarDate,
} from './convert.js';
export {
  yearCanChi,
  monthCanChi,
  dayCanChi,
  hourCanChi,
  lunarMonthName,
  CAN,
  CHI,
  CHI_ANIMALS_EN,
  SOLAR_TERMS,
} from './canchi.js';
export { type Holiday } from './holidays.js';
export { holidays };
export { parseVietnameseDate, type PhraseResult } from './phrase.js';

export interface LunarInfo extends LunarDate {
  solar: { day: number; month: number; year: number; date: string; weekday: string };
  yearCanChi: string;
  monthCanChi: string;
  dayCanChi: string;
  zodiacEn: string;
  monthName: string;
  solarTerm: string;
  /** Human-readable summary, e.g. "Mùng 1 tháng Giêng năm Ất Tỵ". */
  text: string;
}

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export interface HourInfo {
  canChi: string;
  branch: string;
  range: string;
}

/** Can chi, earthly branch and 2-hour range of a birth hour (0-23). At 23:00 the can of the given date is used. */
export function hourInfo(dd: number, mm: number, yy: number, hour: number): Result<HourInfo> {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23)
    return fail('INVALID_HOUR', `Invalid hour "${hour}"`, 'Use an integer from 0 to 23.');
  const index = Math.floor(((hour + 1) % 24) / 2);
  const pad = (h: number) => `${String((h + 24) % 24).padStart(2, '0')}:00`;
  const start = index * 2 - 1;
  return {
    ok: true,
    canChi: hourCanChi(dd, mm, yy, hour),
    branch: CHI[index]!,
    range: `${pad(start)}-${pad(start + 2)}`,
  };
}

/** Full lunar information for a solar date (conversion + can chi + solar term). */
export function lunarInfo(
  dd: number,
  mm: number,
  yy: number,
  timeZone = VN_TIMEZONE,
): Result<LunarInfo> {
  const l = solarToLunar(dd, mm, yy, timeZone);
  if (!l.ok) return l;
  const jd = jdFromDate(dd, mm, yy);
  const weekday = WEEKDAYS[(jd + 1) % 7]!;
  const dayLabel = l.day <= 10 ? `Mùng ${l.day}` : `Ngày ${l.day}`;
  const monthLabel = `tháng ${lunarMonthName(l.month)}${l.leap ? ' (nhuận)' : ''}`;
  const yc = yearCanChi(l.year);
  return {
    ...l,
    ok: true,
    solar: {
      day: dd,
      month: mm,
      year: yy,
      date: `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
      weekday,
    },
    yearCanChi: yc,
    monthCanChi: monthCanChi(l.month, l.year, l.leap),
    dayCanChi: dayCanChi(dd, mm, yy),
    zodiacEn: CHI_ANIMALS_EN[(((l.year + 8) % 12) + 12) % 12]!,
    monthName: lunarMonthName(l.month),
    solarTerm: SOLAR_TERMS[getSolarTermIndex(jd, timeZone)]!,
    text: `${dayLabel} ${monthLabel} năm ${yc}`,
  };
}

export interface LunarMonthDay {
  date: string;
  weekday: string;
  lunar: { day: number; month: number; year: number; leap: boolean };
  text: string;
  dayCanChi: string;
  /** Mùng 1 of a lunar month. */
  firstOfLunarMonth: boolean;
  /** Rằm: lunar day 15. */
  fullMoon: boolean;
  /** Only on the day a new solar term starts. */
  solarTerm?: string;
  holidays: string[];
}

/** Every day of a solar month with lunar date, can chi, solar term starts and holidays/days off. */
export function lunarMonthCalendar(
  month: number,
  year: number,
): Result<{ month: number; year: number; days: LunarMonthDay[] }> {
  if (!Number.isInteger(month) || month < 1 || month > 12)
    return fail('INVALID_DATE', `Month ${month} is out of range (1-12)`, 'Use mm/yyyy or yyyy-mm.');
  if (!Number.isInteger(year))
    return fail('INVALID_DATE', `Invalid year "${year}"`, 'Use mm/yyyy or yyyy-mm.');
  const dim = month === 2 ? (isLeap(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
  const names = new Map<string, string[]>();
  const add = (date: string, name: string) => {
    const list = names.get(date) ?? [];
    if (!list.includes(name)) list.push(name);
    names.set(date, list);
  };
  for (const h of holidays(year)) add(h.date, h.name);
  const pub = publicHolidays(year);
  if (pub.ok) for (const d of pub.daysOff) add(d.date, d.name);
  const days: LunarMonthDay[] = [];
  let prevTerm = -1;
  for (let d = 1; d <= dim; d++) {
    const r = lunarInfo(d, month, year);
    if (!r.ok) return r;
    // A term starts on the day the Sun crosses its boundary, so compare the term at the end of
    // this day (next midnight) with the one at its start: Kinh trập 2026 begins 05/03 at ~21:59.
    const jd = jdFromDate(d, month, year);
    const idx = getSolarTermIndex(jd + 1, VN_TIMEZONE);
    if (d === 1) prevTerm = getSolarTermIndex(jd, VN_TIMEZONE);
    days.push({
      date: r.solar.date,
      weekday: r.solar.weekday,
      lunar: { day: r.day, month: r.month, year: r.year, leap: r.leap },
      text: r.text,
      dayCanChi: r.dayCanChi,
      firstOfLunarMonth: r.day === 1,
      fullMoon: r.day === 15,
      ...(idx !== prevTerm ? { solarTerm: SOLAR_TERMS[idx]! } : {}),
      holidays: names.get(r.solar.date) ?? [],
    });
    prevTerm = idx;
  }
  return { ok: true, month, year, days };
}

/**
 * Parse "dd/mm/yyyy", "dd-mm-yyyy" or ISO "yyyy-mm-dd" into numbers.
 * Days are checked against the Gregorian calendar; pass `{ lunar: true }` to allow 1-30 for any month.
 */
export function parseDateInput(
  input: string,
  opts: { lunar?: boolean } = {},
): Result<{ day: number; month: number; year: number }> {
  const s = String(input ?? '').trim();
  const hint = opts.lunar
    ? 'Lunar dates use dd/mm/yyyy with day 1-30.'
    : 'Use dd/mm/yyyy or yyyy-mm-dd.';
  let m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
  let day: number, month: number, year: number;
  if (m) {
    [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return fail('INVALID_DATE', `Cannot parse date "${input}"`, hint);
    [day, month, year] = [Number(m[3]), Number(m[2]), Number(m[1])];
  }
  if (month < 1 || month > 12) {
    return fail('INVALID_DATE', `Month ${month} is out of range (1-12)`, hint);
  }
  const dim = opts.lunar
    ? 30
    : month === 2
      ? isLeap(year)
        ? 29
        : 28
      : [4, 6, 9, 11].includes(month)
        ? 30
        : 31;
  if (day < 1 || day > dim) {
    const mm = `${String(month).padStart(2, '0')}/${year}`;
    const msg = opts.lunar
      ? `Day ${day} is out of range for lunar month ${mm} (lunar months have 29 or 30 days)`
      : `Day ${day} is out of range for ${mm}`;
    return fail('INVALID_DATE', msg, hint);
  }
  return { ok: true, day, month, year };
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Solar date of Tết (lunar 1/1) for a given lunar year. */
export function tetDate(lunarYear: number): Result<{
  day: number;
  month: number;
  year: number;
  date: string;
  canChi: string;
  zodiacEn: string;
}> {
  const s = lunarToSolar(1, 1, lunarYear);
  if (!s.ok) return s;
  return {
    ok: true,
    day: s.day,
    month: s.month,
    year: s.year,
    date: `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`,
    canChi: yearCanChi(lunarYear),
    zodiacEn: CHI_ANIMALS_EN[(((lunarYear + 8) % 12) + 12) % 12]!,
  };
}

/** Tết date plus the leap month of that lunar year. */
export function tetInfo(lunarYear: number) {
  const r = tetDate(lunarYear);
  return r.ok ? { ...r, leapMonth: leapMonthOf(lunarYear) } : r;
}

/** Can chi of a lunar year with its leap month; errors outside the supported 1800-2199 range. */
export function canChiOfYear(
  year: number,
): Result<{ year: number; canChi: string; leapMonth: number | null }> {
  if (!Number.isInteger(year)) return fail('INVALID_YEAR', `Invalid year "${year}"`);
  if (year < 1800 || year > 2199) return fail('OUT_OF_RANGE', 'Supported years: 1800-2199');
  return { ok: true, year, canChi: yearCanChi(year), leapMonth: leapMonthOf(year) };
}

export { CHI as LUNAR_CHI };

export interface LunarObservanceOptions {
  /** Start solar date (dd/mm/yyyy or yyyy-mm-dd); defaults to today in UTC+7. */
  from?: string;
  /** Number of lunar months from the one containing `from`, 1-36 (default 12). */
  months?: number;
  /** Lunar days to export, each 1-30 (default [1, 15]). */
  days?: number[];
  /** Clock used for the default `from`; for tests. */
  now?: Date;
}

export interface LunarObservanceRow {
  solar: string;
  lunar: { day: number; month: number; year: number; leap: boolean };
  text: string;
}

/** Solar dates of chosen lunar days (default mùng 1 and rằm) over the coming lunar months. */
export function lunarObservanceDates(
  options: LunarObservanceOptions = {},
): Result<{ rows: LunarObservanceRow[]; warnings: string[] }> {
  const months = options.months ?? 12;
  if (!Number.isInteger(months) || months < 1 || months > 36)
    return fail('INVALID_INPUT', `months ${months} is out of range (1-36)`);
  const days = options.days ?? [1, 15];
  if (
    !Array.isArray(days) ||
    days.length === 0 ||
    !days.every((d) => Number.isInteger(d) && d >= 1 && d <= 30)
  )
    return fail('INVALID_INPUT', 'days must be a non-empty list of integers 1-30');
  let fromIso: string;
  if (options.from === undefined) {
    fromIso = new Date((options.now ?? new Date()).getTime() + 7 * 3600_000)
      .toISOString()
      .slice(0, 10);
  } else {
    const p = parseDateInput(options.from);
    if (!p.ok) return p;
    fromIso = `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const DAY = 86400_000;
  const ymd = (s: string) => s.split('-').map(Number) as [number, number, number];
  const at = (s: string) => {
    const [y, m, d] = ymd(s);
    return solarToLunar(d, m, y);
  };
  const first = at(fromIso);
  if (!first.ok) return first;
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  let start = Date.parse(`${fromIso}T00:00:00Z`) - (first.day - 1) * DAY;
  let cur = { month: first.month, year: first.year, leap: first.leap };
  const rows: LunarObservanceRow[] = [];
  const warnings: string[] = [];
  // A starting month with nothing left on or after `from` does not count toward `months`.
  let started = false;
  for (let i = 0; i < months;) {
    const before = rows.length;
    const warned = warnings.length;
    const len = lunarMonthLength(cur.month, cur.year, cur.leap);
    if (len === null) return fail('OUT_OF_RANGE', 'Supported years: 1800-2199');
    const label = `${cur.month}${cur.leap ? ' (nhuận)' : ''}/${cur.year}`;
    for (const d of sorted) {
      if (d > len) {
        warnings.push(`Lunar month ${label} has only ${len} days: day ${d} skipped`);
        continue;
      }
      const solar = iso(start + (d - 1) * DAY);
      if (solar < fromIso) continue;
      const [y, m, dd] = ymd(solar);
      const info = lunarInfo(dd, m, y);
      if (!info.ok) return info;
      rows.push({ solar, lunar: { day: d, ...cur }, text: info.text });
    }
    start += len * DAY;
    if (rows.length > before || warnings.length > warned || started) i++;
    started = true;
    if (i < months) {
      const n = at(iso(start));
      if (!n.ok) return n;
      cur = { month: n.month, year: n.year, leap: n.leap };
    }
  }
  return { ok: true, rows, warnings };
}

export { lunarObservancesToICS, type LunarObservancesICSOptions } from './ics.js';
