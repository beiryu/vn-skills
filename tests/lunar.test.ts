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
  jdFromDate,
  jdToDate,
  lunarMonthLength,
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
