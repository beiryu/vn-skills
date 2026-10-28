import { fail, type Result } from '../shared/result.js';
import { removeDiacritics } from '../shared/diacritics.js';
import { isValidSolarDate, lunarToSolar, solarToLunar } from './convert.js';
import { LUNAR_HOLIDAYS } from './holidays.js';
import { parseDateInput } from './index.js';

export interface PhraseResult {
  /** Solar date, yyyy-mm-dd. */
  solar: string;
  lunar?: { day: number; month: number; year: number; leap: boolean };
  calendar: 'solar' | 'lunar';
  matchedText: string;
  rule: string;
}

const HINT =
  'Supported: "rằm tháng 7", "mùng 1 tháng Giêng", "ngày 23 tháng Chạp", "15/7 âm", "mùng 1 Tết năm sau", ' +
  '"tháng 6 nhuận năm 2025", "hôm nay", "ngày mai", "3 ngày nữa", "2 tuần trước", "thứ Sáu tuần sau", ' +
  '"ngày 5 tháng 3 năm 2027", dd/mm/yyyy, yyyy-mm-dd.';

const MONTH_WORDS: Record<string, number> = {
  gieng: 1,
  hai: 2,
  ba: 3,
  tu: 4,
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
  mot: 11,
  chap: 12,
};
const WEEKDAYS: Record<string, number> = {
  'thu hai': 0,
  'thu ba': 1,
  'thu tu': 2,
  'thu nam': 3,
  'thu sau': 4,
  'thu bay': 5,
  'chu nhat': 6,
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => {
  const d = utc(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const fmt = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

let festivalCache: Map<string, { day: number; month: number }> | undefined;
function festivals(): Map<string, { day: number; month: number }> {
  if (festivalCache) return festivalCache;
  const map = new Map<string, { day: number; month: number }>();
  const add = (k: string, v: { day: number; month: number }) => {
    const key = k.trim().replace(/^le /, '');
    if (key && !map.has(key)) map.set(key, v);
  };
  for (const h of LUNAR_HOLIDAYS) {
    const v = { day: h.day, month: h.month };
    const name = removeDiacritics(h.name).toLowerCase();
    const m = /^(.*?)\s*\((.*)\)$/.exec(name);
    if (m && m[2]!.startsWith('mung')) {
      add(m[1]!, v);
      if (h.day === 1 && h.month === 1) add('tet', v);
      add(`mung ${h.day} tet`, v);
      continue;
    }
    add(name, v);
    if (m) {
      add(m[1]!, v);
      add(m[2]!, v);
    }
    add(name.replace(/^tet /, ''), v);
  }
  festivalCache = map;
  return map;
}

function lunarYearOf(solar: string): number | null {
  const [y, m, d] = solar.split('-').map(Number) as [number, number, number];
  const l = solarToLunar(d, m, y);
  return l.ok ? l.year : null;
}

function lunarResult(
  day: number,
  month: number,
  leap: boolean,
  year: number | 'next',
  ref: string,
  matchedText: string,
  rule: string,
): Result<PhraseResult> {
  const build = (y: number): Result<PhraseResult> => {
    const s = lunarToSolar(day, month, y, leap);
    if (!s.ok) {
      if (s.error.code === 'NOT_LEAP_MONTH' || s.error.code === 'INVALID_DATE')
        return fail(
          'INVALID_DATE',
          s.error.message,
          leap
            ? `Lunar year ${y} has no leap month ${month}; drop "nhuận" or pick another year.`
            : `Lunar month ${month}/${y} has fewer than ${day} days; use day 29 or earlier.`,
        );
      return s;
    }
    return {
      ok: true,
      solar: fmt(s.year, s.month, s.day),
      lunar: { day, month, year: y, leap },
      calendar: 'lunar',
      matchedText,
      rule,
    };
  };
  if (year !== 'next') return build(year);
  const ly = lunarYearOf(ref);
  if (ly === null) return fail('OUT_OF_RANGE', 'Reference date is outside 1800-2199', HINT);
  let last: Result<PhraseResult> | undefined;
  for (let y = ly; y <= ly + 3; y++) {
    const r = build(y);
    if (r.ok && r.solar >= ref) return r;
    if (!r.ok) last = r;
  }
  return last ?? fail('INVALID_DATE', 'No matching lunar date found', HINT);
}

/** Turn a Vietnamese date phrase (solar, lunar or relative) into a solar date. Never throws. */
export function parseVietnameseDate(
  text: string,
  opts: { ref?: string } = {},
): Result<PhraseResult> {
  const matchedText = typeof text === 'string' ? text.trim() : '';
  if (!matchedText) return fail('EMPTY', 'Date phrase is empty', HINT);
  const ref = opts.ref ?? new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const rm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ref);
  if (!rm || !isValidSolarDate(Number(rm[3]), Number(rm[2]), Number(rm[1])))
    return fail('INVALID_DATE', `Invalid ref "${ref}"`, 'Use ref as yyyy-mm-dd.');

  let s = removeDiacritics(matchedText).toLowerCase().replace(/\s+/g, ' ').trim();
  const solar = (date: string, rule: string): Result<PhraseResult> => ({
    ok: true,
    solar: date,
    calendar: 'solar',
    matchedText,
    rule,
  });

  const numeric = parseDateInput(s);
  if (numeric.ok) return solar(fmt(numeric.year, numeric.month, numeric.day), 'numeric');

  let m = /^(?:ngay )?(\d{1,2}) thang (\d{1,2}) nam (\d{4})$/.exec(s);
  if (m) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (!isValidSolarDate(d, mo, y))
      return fail('INVALID_DATE', `Invalid solar date ${d}/${mo}/${y}`, HINT);
    return solar(fmt(y, mo, d), 'gregorian');
  }

  const fixed: Record<string, number> = {
    'hom nay': 0,
    'ngay mai': 1,
    'ngay kia': 2,
    'hom qua': -1,
  };
  if (s in fixed) return solar(addDays(ref, fixed[s]!), 'relative-day');

  m = /^(\d+) (ngay|tuan) (nua|truoc|sau)$/.exec(s);
  if (m) {
    const n = Number(m[1]) * (m[2] === 'tuan' ? 7 : 1) * (m[3] === 'truoc' ? -1 : 1);
    return solar(addDays(ref, n), 'relative-offset');
  }

  m = /^(thu (?:hai|ba|tu|nam|sau|bay)|chu nhat)(?: (nay|tuan nay|tuan sau|tuan truoc))?$/.exec(s);
  if (m) {
    const dow = WEEKDAYS[m[1]!]!;
    const refDow = (utc(ref).getUTCDay() + 6) % 7;
    const monday = addDays(ref, -refDow);
    const q = m[2];
    if (q === 'tuan nay') return solar(addDays(monday, dow), 'weekday');
    if (q === 'tuan sau') return solar(addDays(monday, 7 + dow), 'weekday');
    if (q === 'tuan truoc') return solar(addDays(monday, -7 + dow), 'weekday');
    return solar(addDays(ref, (dow - refDow + 7) % 7), 'weekday');
  }

  let year: number | 'next' = 'next';
  const ym = /\s*\bnam (nay|sau|ngoai|\d{4})$/.exec(s);
  if (ym) {
    s = s.slice(0, ym.index).trim();
    const ly = lunarYearOf(ref);
    if (ly === null) return fail('OUT_OF_RANGE', 'Reference date is outside 1800-2199', HINT);
    year =
      ym[1] === 'nay' ? ly : ym[1] === 'sau' ? ly + 1 : ym[1] === 'ngoai' ? ly - 1 : Number(ym[1]);
  }
  const hasAm = /\s*\bam(?: lich)?$/.test(s);
  s = s.replace(/\s*\bam(?: lich)?$/, '').trim();

  const fest = festivals().get(s);
  if (fest) return lunarResult(fest.day, fest.month, false, year, ref, matchedText, 'festival');

  const monthOf = (w: string): { month: number; word: boolean } | null => {
    if (/^\d{1,2}$/.test(w)) return { month: Number(w), word: false };
    return w in MONTH_WORDS ? { month: MONTH_WORDS[w]!, word: true } : null;
  };
  let day: number | undefined,
    mw: ReturnType<typeof monthOf> = null,
    leap = false,
    rule = '';
  let pm = /^ram thang (\w+?)( nhuan)?$/.exec(s);
  if (pm) {
    [day, mw, leap, rule] = [15, monthOf(pm[1]!), Boolean(pm[2]), 'ram'];
  } else if ((pm = /^(ngay|mung) (\d{1,2}) thang (\w+?)( nhuan)?$/.exec(s))) {
    mw = monthOf(pm[3]!);
    [day, leap, rule] = [Number(pm[2]), Boolean(pm[4]), 'lunar-day-month'];
    if (pm[1] === 'ngay' && !hasAm && !mw?.word) mw = null;
  } else if (hasAm && (pm = /^(\d{1,2})\/(\d{1,2})( nhuan)?$/.exec(s))) {
    [day, mw, leap, rule] = [Number(pm[1]), monthOf(pm[2]!), Boolean(pm[3]), 'lunar-slash'];
  }
  if (day === undefined || !mw)
    return fail('UNRECOGNISED', `Cannot understand "${matchedText}"`, HINT);
  if (mw.month < 1 || mw.month > 12 || day < 1 || day > 30)
    return fail('INVALID_DATE', `Invalid lunar date ${day}/${mw.month}`, HINT);
  return lunarResult(day, mw.month, leap, year, ref, matchedText, rule);
}
