import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  solarToLunar,
  lunarToSolar,
  lunarInfo,
  tetDate,
  holidays,
  yearCanChi,
  dayCanChi,
  leapMonthOf,
  parseDateInput,
  parseVietnameseDate,
  jdFromDate,
  jdToDate,
  lunarMonthLength,
  lunarMonthCalendar,
  publicHolidays,
  tetInfo,
} from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

interface Case<I, E> {
  name?: string;
  input: I;
  expected: E;
}
type Subset = Record<string, unknown>;
type Dmy = [day: number, month: number, year: number];

const golden = loadGolden<{
  tetDate: Case<number, Subset>[];
  solarToLunar: Case<Dmy, Subset>[];
  lunarToSolar: Case<[...Dmy, leap?: boolean], Subset>[];
  lunarMonthLength: Case<[month: number, year: number], number>[];
  leapMonthOf: Case<number, number | null>[];
  yearCanChi: Case<number, string>[];
  dayCanChi: Case<Dmy, string>[];
  lunarInfo: Case<Dmy, Subset>[];
  holidays: Case<[year: number, options?: { publicOnly?: boolean }], Record<string, string>>[];
  parseDateInput: Case<string, Subset>[];
  parseVietnameseDate: Case<[text: string, ref: string], Subset>[];
}>('vn-lunar');

const cases = <I, E>(list: Case<I, E>[]) => list.map((c) => [title(c), c] as const);

describe('golden fixtures', () => {
  it.each(cases(golden.tetDate))('Tết %s', (_, c) =>
    expect(tetDate(c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.solarToLunar))('solarToLunar: %s', (_, c) =>
    expect(solarToLunar(...c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.lunarToSolar))('lunarToSolar: %s', (_, c) =>
    expect(lunarToSolar(...c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.lunarMonthLength))('lunarMonthLength: %s', (_, c) =>
    expect(lunarMonthLength(...c.input)).toBe(c.expected),
  );
  it.each(cases(golden.leapMonthOf))('leapMonthOf %s', (_, c) =>
    expect(leapMonthOf(c.input)).toBe(c.expected),
  );
  it.each(cases(golden.yearCanChi))('yearCanChi %s', (_, c) =>
    expect(yearCanChi(c.input)).toBe(c.expected),
  );
  it.each(cases(golden.dayCanChi))('dayCanChi %s', (_, c) =>
    expect(dayCanChi(...c.input)).toBe(c.expected),
  );
  it.each(cases(golden.lunarInfo))('lunarInfo: %s', (_, c) =>
    expect(lunarInfo(...c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.holidays))('holidays: %s', (_, c) => {
    const byName = Object.fromEntries(holidays(...c.input).map((x) => [x.name, x.date]));
    expect(byName).toMatchObject(c.expected);
  });
  it.each(cases(golden.parseVietnameseDate))('parseVietnameseDate: %s', (_, c) =>
    expect(parseVietnameseDate(c.input[0], { ref: c.input[1] })).toMatchObject(c.expected),
  );
  it.each(cases(golden.parseDateInput))('parseDateInput: %s', (_, c) =>
    expect(parseDateInput(c.input)).toMatchObject(c.expected),
  );
});

describe('lunarToSolar round-trips', () => {
  it('round-trips every day of 2024-2026', () => {
    for (let jd = jdFromDate(1, 1, 2024); jd <= jdFromDate(31, 12, 2026); jd++) {
      const d = jdToDate(jd);
      const l = solarToLunar(d.day, d.month, d.year);
      if (!l.ok) throw new Error('solarToLunar failed');
      const s = lunarToSolar(l.day, l.month, l.year, l.leap);
      if (!s.ok) throw new Error(`lunarToSolar failed for ${JSON.stringify(l)}`);
      expect([s.day, s.month, s.year]).toEqual([d.day, d.month, d.year]);
    }
  });
  it('round-trips sampled days 1900-2100', () => {
    for (let jd = jdFromDate(1, 1, 1900); jd <= jdFromDate(31, 12, 2100); jd += 97) {
      const d = jdToDate(jd);
      const l = solarToLunar(d.day, d.month, d.year);
      const s = l.ok ? lunarToSolar(l.day, l.month, l.year, l.leap) : undefined;
      expect(s && s.ok && [s.day, s.month, s.year]).toEqual([d.day, d.month, d.year]);
    }
  });
});

describe('holidays', () => {
  it('is sorted by date', () => {
    const h = holidays(2026);
    const dates = h.map((x) => x.date);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe('parseDateInput range validation', () => {
  it.each([
    ['0/1/2024', 'Day 0 is out of range for 01/2024'],
    ['32/1/2024', 'Day 32'],
    ['1/0/2024', 'Month 0'],
    ['1/13/2024', 'Month 13'],
    ['2024-00-10', 'Month 0'],
    ['31/4/2024', 'Day 31 is out of range for 04/2024'],
    ['29/2/2023', 'Day 29 is out of range for 02/2023'],
  ])('rejects %s', (input, message) => {
    const r = parseDateInput(input);
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_DATE' } });
    expect(JSON.stringify(r)).toContain(message);
    expect(JSON.stringify(r)).toContain('Use dd/mm/yyyy or yyyy-mm-dd.');
  });

  it.each([
    [
      '31/2/2024',
      'Day 31 is out of range for lunar month 02/2024 (lunar months have 29 or 30 days)',
    ],
    ['0/2/2024', 'Day 0 is out of range for lunar month 02/2024'],
    ['1/13/2024', 'Month 13 is out of range (1-12)'],
    ['abc', 'Cannot parse date'],
  ])('rejects lunar %s with a lunar hint', (input, message) => {
    const r = parseDateInput(input, { lunar: true });
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_DATE' } });
    expect(JSON.stringify(r)).toContain(message);
    expect(JSON.stringify(r)).toContain('Lunar dates use dd/mm/yyyy with day 1-30.');
    expect(JSON.stringify(r)).not.toContain('Use dd/mm/yyyy or yyyy-mm-dd.');
  });

  it('keeps the Gregorian message and hint for day 31 of February', () => {
    const r = parseDateInput('31/2/2024');
    expect(JSON.stringify(r)).toContain('Day 31 is out of range for 02/2024');
    expect(JSON.stringify(r)).toContain('Use dd/mm/yyyy or yyyy-mm-dd.');
    expect(JSON.stringify(r)).not.toContain('lunar');
  });

  it.each([
    ['29/2/2024', { day: 29, month: 2, year: 2024 }],
    ['2024-2-3', { day: 3, month: 2, year: 2024 }],
    ['1-2-2024', { day: 1, month: 2, year: 2024 }],
    ['3/2/2024', { day: 3, month: 2, year: 2024 }],
  ])('accepts %s', (input, expected) => {
    expect(parseDateInput(input)).toMatchObject({ ok: true, ...expected });
  });
});

describe('timeZone validation', () => {
  const bad: [string, unknown][] = [
    ['string', 'Asia/Ho_Chi_Minh'],
    ['NaN', Number.NaN],
    ['-13', -13],
    ['15', 15],
  ];

  it.each(bad)('solarToLunar rejects %s', (_n, tz) => {
    const r = solarToLunar(10, 2, 2024, tz as number);
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_TIMEZONE' } });
    if (!r.ok) expect(r.error.hint).toMatch(/UTC offset/i);
  });

  it.each(bad)('lunarInfo rejects %s', (_n, tz) => {
    expect(lunarInfo(10, 2, 2024, tz as number)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TIMEZONE' },
    });
  });

  it.each(bad)('lunarToSolar rejects %s', (_n, tz) => {
    expect(lunarToSolar(1, 1, 2024, false, tz as number)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TIMEZONE' },
    });
  });

  it.each(bad)('leapMonthOf and lunarMonthLength return null for %s', (_n, tz) => {
    expect(leapMonthOf(2023, tz as number)).toBeNull();
    expect(lunarMonthLength(1, 2024, false, tz as number)).toBeNull();
  });

  it('accepts a valid non-VN offset and the VN default', () => {
    expect(solarToLunar(10, 2, 2024, 8)).toMatchObject({ ok: true });
    expect(solarToLunar(10, 2, 2024, 7)).toEqual(solarToLunar(10, 2, 2024));
  });

  // Infinity loops forever on unvalidated input, so probe it in a child process with a timeout.
  it.each([
    'solarToLunar(10, 2, 2024, tz)',
    'lunarInfo(10, 2, 2024, tz)',
    'lunarToSolar(1, 1, 2024, false, tz)',
  ])('%s rejects Infinity', (call) => {
    const entry = pathToFileURL(
      new URL('../packages/core/dist/index.js', import.meta.url).pathname,
    );
    const script = `import * as c from ${JSON.stringify(entry.href)};
const { solarToLunar, lunarInfo, lunarToSolar } = c; const tz = Infinity;
const r = ${call}; console.log(r.ok === false ? r.error.code : 'ok');`;
    const out = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      timeout: 5000,
      encoding: 'utf8',
    });
    expect(out.stdout.trim()).toBe('INVALID_TIMEZONE');
  });
});

describe('lunarMonthCalendar', () => {
  const cal = (m: number, y: number) => {
    const r = lunarMonthCalendar(m, y);
    if (!r.ok) throw new Error(r.error.message);
    return r.days;
  };
  it.each([
    [2, 2023, 28],
    [2, 2024, 29],
    [4, 2026, 30],
    [1, 2026, 31],
  ])('has the right day count for %i/%i', (m, y, n) => {
    expect(cal(m, y)).toHaveLength(n);
  });
  it('matches lunarInfo for each day', () => {
    for (const d of cal(8, 2025)) {
      const [y, m, dd] = d.date.split('-').map(Number);
      const i = lunarInfo(dd!, m!, y!);
      if (!i.ok) throw new Error('x');
      expect(d.lunar).toEqual({ day: i.day, month: i.month, year: i.year, leap: i.leap });
      expect(d.dayCanChi).toBe(i.dayCanChi);
      expect(d.text).toBe(i.text);
      expect(d.weekday).toBe(i.solar.weekday);
    }
  });
  it('flags Tết 2027', () => {
    const d = cal(2, 2027).find((x) => x.date === '2027-02-06')!;
    expect(d.lunar).toMatchObject({ day: 1, month: 1, leap: false });
    expect(d.firstOfLunarMonth).toBe(true);
    expect(d.holidays.some((h) => h.includes('Tết'))).toBe(true);
  });
  it('flags rằm and mùng 1 exactly where the lunar day is 15 and 1', () => {
    const days = cal(3, 2026);
    expect(days.filter((d) => d.fullMoon)).toHaveLength(1);
    expect(days.filter((d) => d.firstOfLunarMonth)).toHaveLength(1);
    expect(days.every((d) => d.fullMoon === (d.lunar.day === 15))).toBe(true);
    expect(days.every((d) => d.firstOfLunarMonth === (d.lunar.day === 1))).toBe(true);
  });
  it('marks leap-month days', () => {
    const ly = 2025;
    const lm = leapMonthOf(ly)!;
    const s = lunarToSolar(1, lm, ly, true);
    if (!s.ok) throw new Error('x');
    const days = cal(s.month, s.year);
    const d = days.find(
      (x) =>
        x.date ===
        `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`,
    )!;
    expect(d.lunar.leap).toBe(true);
    expect(days.some((x) => !x.lunar.leap)).toBe(true);
  });
  it('carries solarTerm exactly where the term changes', () => {
    const days = cal(5, 2026);
    const withTerm = days.filter((d) => d.solarTerm).map((d) => d.date);
    expect(withTerm).toHaveLength(2);
    const info = (s: string) => {
      const [y, m, dd] = s.split('-').map(Number);
      const r = lunarInfo(dd!, m!, y!);
      if (!r.ok) throw new Error('x');
      return r.solarTerm;
    };
    days.forEach((d, i) => {
      if (i > 0) expect(!!d.solarTerm).toBe(info(d.date) !== info(days[i - 1]!.date));
      if (d.solarTerm) expect(d.solarTerm).toBe(info(d.date));
    });
  });
  it('lists public days off', () => {
    expect(cal(9, 2025).find((d) => d.date === '2025-09-02')!.holidays.length).toBeGreaterThan(0);
  });
  it('skips only public days off for years outside the holiday data', () => {
    expect(publicHolidays(1900).ok).toBe(false);
    const t = tetInfo(1900);
    if (!t.ok) throw new Error('x');
    const month = Number(t.date.slice(5, 7));
    const days = cal(month, 1900);
    const tet = days.find((d) => d.date === t.date);
    expect(tet?.holidays.some((h) => h.includes('Tết'))).toBe(true);
  });
  it.each([
    [13, 2026],
    [0, 2026],
    [1.5, 2026],
  ])('rejects month %s', (m, y) => {
    const r = lunarMonthCalendar(m, y);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_DATE');
  });
  it('rejects unsupported lunar years', () => {
    const r = lunarMonthCalendar(6, 1500);
    const info = lunarInfo(1, 6, 1500);
    expect(r.ok).toBe(false);
    expect(info.ok).toBe(false);
    if (!r.ok && !info.ok) expect(r.error.code).toBe(info.error.code);
  });
});
