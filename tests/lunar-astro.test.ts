import { describe, expect, it } from 'vitest';
import { jdFromDate, jdToDate, lunarToSolar, newMoon, solarToLunar } from '@vn-skills/core';

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
