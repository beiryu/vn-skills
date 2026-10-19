import { describe, expect, it } from 'vitest';
import {
  jdFromDate,
  jdToDate,
  leapMonthOf,
  lunarToSolar,
  newMoon,
  solarToLunar,
} from '@vn-skills/core';

const lunar = (dd: number, mm: number, yy: number) => {
  const r = solarToLunar(dd, mm, yy);
  if (!r.ok) throw new Error(`solarToLunar failed for ${dd}/${mm}/${yy}`);
  return { day: r.day, month: r.month, year: r.year, leap: r.leap };
};

describe('newMoon (Meeus, Astronomical Algorithms ch. 49)', () => {
  it('matches Example 49.a: new moon of 1977 February', () => {
    // Meeus gives JDE 2443192.65118 (TT) for his k = -283, i.e. k = 954 counted from 1900.
    // ΔT in early 1977 is about 47.6 s, so UT is that much earlier.
    const expectedUt = 2443192.65118 - 47.6 / 86400;
    expect(Math.abs(newMoon(954) - expectedUt) * 86400).toBeLessThan(1);
  });

  it('k = 0 is the new moon of 1900-01-01', () => {
    expect(jdToDate(Math.floor(newMoon(0) + 0.5))).toEqual({ day: 1, month: 1, year: 1900 });
  });
});

describe('new moons close to local midnight', () => {
  it('1967-07 new moon (JPL 17:00:04Z) starts month 6 on 8 July', () => {
    expect(lunar(7, 7, 1967)).toEqual({ day: 30, month: 5, year: 1967, leap: false });
    expect(lunar(8, 7, 1967)).toEqual({ day: 1, month: 6, year: 1967, leap: false });
  });

  it.each([
    [
      [13, 4, 1877],
      [30, 2, 1877],
    ],
    [
      [16, 3, 1885],
      [30, 1, 1885],
    ],
    [
      [7, 5, 2054],
      [30, 3, 2054],
    ],
    [
      [9, 4, 2062],
      [30, 2, 2062],
    ],
  ] as const)('%j is lunar %j', ([dd, mm, yy], [ld, lm, ly]) => {
    expect(lunar(dd, mm, yy)).toMatchObject({ day: ld, month: lm, year: ly });
  });
});

describe('leap month 11 of 2033', () => {
  it('2033 repeats month 11 and 2034 has no leap month', () => {
    expect(leapMonthOf(2033)).toBe(11);
    expect(leapMonthOf(2034)).toBeNull();
  });

  it('2033-12-22 is the first day of leap month 11', () => {
    expect(lunar(22, 12, 2033)).toEqual({ day: 1, month: 11, year: 2033, leap: true });
  });
});

describe('full-range invariants', () => {
  it('every day 1800-02-01..2199-12-31 has lunar day 1..30 and round-trips', () => {
    const failures: string[] = [];
    for (let jd = jdFromDate(1, 2, 1800); jd <= jdFromDate(31, 12, 2199); jd++) {
      const d = jdToDate(jd);
      const l = solarToLunar(d.day, d.month, d.year);
      if (!l.ok || l.day < 1 || l.day > 30) {
        failures.push(`${d.day}/${d.month}/${d.year}`);
        continue;
      }
      const s = lunarToSolar(l.day, l.month, l.year, l.leap);
      if (!s.ok || s.jd !== jd) failures.push(`${d.day}/${d.month}/${d.year}`);
    }
    expect(failures).toEqual([]);
  }, 120_000);
});
