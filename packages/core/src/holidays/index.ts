import { jdFromDate, jdToDate } from '../lunar/astro.js';
import { isValidSolarDate, lunarToSolar, solarToLunar } from '../lunar/convert.js';
import { fail, type Result } from '../shared/result.js';
import { ANNOUNCED, type HolidayKey, type ScheduleSource } from './schedules.js';

export {
  ANNOUNCED,
  type AnnouncedSchedule,
  type HolidayKey,
  type ScheduleSource,
} from './schedules.js';

export type DayOffKind = 'holiday' | 'compensatory' | 'swapped';

/** First year with an announced schedule in the data (Labour Code 2019, Law 45/2019/QH14, applies from 2021). */
export const FIRST_HOLIDAY_YEAR = 2023;
/** Ngày Văn hóa Việt Nam (24/11) is a paid day off from 2026 (National Assembly Resolution 28/2026/QH16, Art. 2). */
export const CULTURE_DAY_FROM = 2026;
export const LAST_HOLIDAY_YEAR = 2199;

const NAMES: Record<HolidayKey, { name: string; nameEn: string }> = {
  newYear: { name: 'Tết Dương lịch', nameEn: "New Year's Day" },
  tet: { name: 'Tết Âm lịch', nameEn: 'Lunar New Year (Tết)' },
  hungKings: { name: 'Giỗ Tổ Hùng Vương', nameEn: 'Hung Kings Commemoration Day' },
  reunification: { name: 'Ngày Chiến thắng (30/4)', nameEn: 'Reunification Day' },
  labourDay: { name: 'Ngày Quốc tế lao động (1/5)', nameEn: 'International Labour Day' },
  nationalDay: { name: 'Quốc khánh', nameEn: 'National Day' },
  cultureDay: { name: 'Ngày Văn hóa Việt Nam', nameEn: 'Vietnamese Culture Day' },
};

export interface PublicDayOff {
  /** yyyy-mm-dd */
  date: string;
  holiday: HolidayKey;
  name: string;
  nameEn: string;
  /** holiday = statutory day; compensatory = nghỉ bù; swapped = weekday freed by a hoán đổi. */
  kind: DayOffKind;
}

export interface PendingHoliday {
  holiday: HolidayKey;
  name: string;
  nameEn: string;
  /** What the Government still has to announce. */
  note: string;
}

export interface PublicHolidayYear {
  year: number;
  /** true when a Government notice for the year is in the data set (see `sources` and `pending`). */
  announced: boolean;
  sources: ScheduleSource[];
  /** Weekdays off for public-sector staff (Saturday/Sunday are always off and not listed). */
  daysOff: PublicDayOff[];
  /** Saturdays that are working days because of a swap. */
  workingSaturdays: string[];
  /** Days the law grants but whose dates are only fixed by the yearly notice (unannounced years). */
  pending: PendingHoliday[];
}

const iso = (jd: number): string => {
  const d = jdToDate(jd);
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
};
/** 0 = Monday … 5 = Saturday, 6 = Sunday. */
const weekday = (jd: number): number => ((jd % 7) + 7) % 7;
const isWeekend = (jd: number): boolean => weekday(jd) >= 5;

function day(key: HolidayKey, jd: number, kind: DayOffKind): PublicDayOff {
  return { date: iso(jd), holiday: key, ...NAMES[key], kind };
}

const jdOf = (isoDate: string): number => {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return jdFromDate(d, m, y);
};

/**
 * The year's days off: statutory holidays (Labour Code 2019, Art. 112; Resolution 28/2026/QH16 for 24/11), the
 * yearly notice's choices (Tết days, second National Day, swaps), and nghỉ bù for every holiday day that falls on a
 * Saturday or Sunday: the next working day that is not already off (Art. 111(3)).
 */
function schedule(year: number): PublicHolidayYear {
  const notice = ANNOUNCED[year];
  const holidays: Array<[HolidayKey, number]> = [
    ['newYear', jdFromDate(1, 1, year)],
    ['reunification', jdFromDate(30, 4, year)],
    ['labourDay', jdFromDate(1, 5, year)],
    ['nationalDay', jdFromDate(2, 9, year)],
  ];
  const hungKings = lunarToSolar(10, 3, year);
  if (hungKings.ok) holidays.push(['hungKings', hungKings.jd]);
  if (year >= CULTURE_DAY_FROM) holidays.push(['cultureDay', jdFromDate(24, 11, year)]);
  for (const d of notice?.tet ?? []) holidays.push(['tet', jdOf(d)]);
  if (notice?.nationalDay) holidays.push(['nationalDay', jdOf(notice.nationalDay)]);
  holidays.sort((a, b) => a[1] - b[1]);

  const swaps = (notice?.swaps ?? []).map((s) => [jdOf(s.off), jdOf(s.workOn)] as const);
  const taken = new Set([...holidays.map(([, jd]) => jd), ...swaps.map(([off]) => off)]);
  const daysOff: PublicDayOff[] = [];
  for (const [key, jd] of holidays) {
    if (!isWeekend(jd)) {
      daysOff.push(day(key, jd, 'holiday'));
      continue;
    }
    let next = jd + 1;
    while (isWeekend(next) || taken.has(next)) next++;
    taken.add(next);
    daysOff.push(day(key, next, 'compensatory'));
  }
  for (const [off] of swaps) {
    const near = holidays.reduce((best, h) =>
      Math.abs(h[1] - off) < Math.abs(best[1] - off) ? h : best,
    );
    daysOff.push(day(near[0], off, 'swapped'));
  }
  daysOff.sort((a, b) => a.date.localeCompare(b.date));

  const pending: PendingHoliday[] = [];
  if (!notice?.tet)
    pending.push({
      holiday: 'tet',
      ...NAMES.tet,
      note: '5 days around the Lunar New Year; their placement is announced by the Government each year.',
    });
  if (!notice?.nationalDay)
    pending.push({
      holiday: 'nationalDay',
      ...NAMES.nationalDay,
      note: 'A second day, adjacent to 2 September (before or after), is announced each year.',
    });

  return {
    year,
    announced: Boolean(notice),
    sources: notice?.sources ?? [],
    daysOff,
    workingSaturdays: swaps.map(([, workOn]) => iso(workOn)).sort(),
    pending,
  };
}

function checkYear(year: number): Result<{ year: number }> {
  if (!Number.isInteger(year)) return fail('INVALID_YEAR', 'Year must be an integer');
  if (year < FIRST_HOLIDAY_YEAR || year > LAST_HOLIDAY_YEAR)
    return fail(
      'OUT_OF_RANGE',
      `Supported years: ${FIRST_HOLIDAY_YEAR}-${LAST_HOLIDAY_YEAR}`,
      year < FIRST_HOLIDAY_YEAR
        ? 'The data set starts with the 2023 notices.'
        : `Dates after 31/12/${LAST_HOLIDAY_YEAR} are not supported.`,
    );
  return { ok: true, year };
}

/** Days off of a year for public-sector staff: the announced schedule, or the statutory days when not announced. */
export function publicHolidays(year: number): Result<PublicHolidayYear> {
  const y = checkYear(year);
  if (!y.ok) return y;
  return { ok: true, ...schedule(year) };
}

export interface WorkingDayInfo {
  date: string;
  working: boolean;
  /** false when the year is not announced and the day may still become a Tết or National Day day off. */
  certain: boolean;
  /** Why the day is off (holiday name, "Saturday", "Sunday"), or why it is uncertain. */
  reason?: string;
}

/**
 * Days that an unannounced year's notice may still turn into days off. The 5 Tết days have always fallen between
 * 26 of the 12th lunar month and the 5th day of Tết, and nghỉ bù for weekend Tết days can push the break up to the
 * 10th; the second National Day day is 1 or 3 September, and nghỉ bù for a weekend 2/9 or 3/9 can reach 5 September.
 */
function possiblyOff(jd: number, year: number, pending: HolidayKey[]): string | null {
  const d = jdToDate(jd);
  if (pending.includes('nationalDay') && d.month === 9 && d.day >= 1 && d.day <= 5)
    return NAMES.nationalDay.name;
  if (!pending.includes('tet')) return null;
  const l = solarToLunar(d.day, d.month, d.year);
  if (!l.ok || l.leap) return null;
  if ((l.month === 12 && l.day >= 26 && l.year === year - 1) || (l.month === 1 && l.day <= 10))
    return NAMES.tet.name;
  return null;
}

function infoFor(jd: number): Result<WorkingDayInfo> {
  const date = iso(jd);
  const year = jdToDate(jd).year;
  const yr = publicHolidays(year);
  if (!yr.ok) return yr;
  if (yr.workingSaturdays.includes(date)) return { ok: true, date, working: true, certain: true };
  const off = yr.daysOff.find((d) => d.date === date);
  if (off)
    return {
      ok: true,
      date,
      working: false,
      certain: true,
      reason: off.kind === 'holiday' ? off.name : `${off.name} (${off.kind})`,
    };
  if (isWeekend(jd))
    return {
      ok: true,
      date,
      working: false,
      certain: true,
      reason: weekday(jd) === 5 ? 'Saturday' : 'Sunday',
    };
  if (yr.pending.length) {
    const maybe = possiblyOff(
      jd,
      year,
      yr.pending.map((p) => p.holiday),
    );
    if (maybe)
      return {
        ok: true,
        date,
        working: true,
        certain: false,
        reason: `${maybe}: not announced yet for ${year}`,
      };
  }
  return { ok: true, date, working: true, certain: true };
}

/** Whether a date is a working day for public-sector staff (Monday-Friday, minus holidays, plus swapped Saturdays). */
export function isWorkingDay(dd: number, mm: number, yy: number): Result<WorkingDayInfo> {
  if (!isValidSolarDate(dd, mm, yy)) return fail('INVALID_DATE', `Invalid date ${dd}/${mm}/${yy}`);
  return infoFor(jdFromDate(dd, mm, yy));
}

export interface AddWorkingDaysResult {
  date: string;
  /** false when an unannounced Tết or National Day window was crossed, so the result may move. */
  certain: boolean;
}

/**
 * The date `n` working days after (n > 0) or before (n < 0) the given date; n = 0 returns the date itself.
 * Like a deadline "within n working days": the start date is not counted.
 */
export function addWorkingDays(
  dd: number,
  mm: number,
  yy: number,
  n: number,
): Result<AddWorkingDaysResult> {
  if (!isValidSolarDate(dd, mm, yy)) return fail('INVALID_DATE', `Invalid date ${dd}/${mm}/${yy}`);
  if (!Number.isInteger(n) || Math.abs(n) > 3650)
    return fail('INVALID_COUNT', 'n must be an integer between -3650 and 3650');
  let jd = jdFromDate(dd, mm, yy);
  let certain = true;
  const step = Math.sign(n);
  for (let left = Math.abs(n); left > 0;) {
    jd += step;
    const info = infoFor(jd);
    if (!info.ok) {
      if (info.error.code !== 'OUT_OF_RANGE') return info;
      return fail(
        'OUT_OF_RANGE',
        `Counting ${Math.abs(n)} working days from ${dd}/${mm}/${yy} would fall outside the supported range ${FIRST_HOLIDAY_YEAR}-${LAST_HOLIDAY_YEAR}`,
        info.error.hint,
      );
    }
    if (!info.certain) certain = false;
    if (info.working) left--;
  }
  return { ok: true, date: iso(jd), certain };
}
