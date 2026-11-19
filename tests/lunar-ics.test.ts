import { describe, expect, it } from 'vitest';
import {
  holidaysToICS,
  leapMonthOf,
  lunarInfo,
  lunarObservanceDates,
  lunarObservancesToICS,
  solarToLunar,
} from '@vn-skills/core';

type Row = {
  solar: string;
  lunar: { day: number; month: number; year: number; leap: boolean };
  text: string;
};

const dates = (o: Record<string, unknown>) => {
  const r = lunarObservanceDates(o as never) as unknown as {
    ok: boolean;
    rows: Row[];
    warnings: string[];
  };
  if (!r.ok) throw new Error('unexpected');
  return r;
};
const ics = (o: Record<string, unknown>) => {
  const r = lunarObservancesToICS({ dtstamp: new Date('2026-01-01T00:00:00Z'), ...o } as never);
  if (!(r as { ok: boolean }).ok) throw new Error('unexpected');
  return r as unknown as { ics: string; events: number };
};
const ymd = (s: string) => s.split('-').map(Number) as [number, number, number];
const unfold = (t: string) => t.replace(/\r\n[ \t]/g, '');

describe('vn-lunar: lunarObservanceDates', () => {
  const from = '2026-03-10';

  it('defaults to days 1 and 15 for 12 months', () => {
    const { rows } = dates({ from });
    expect(rows.length).toBeGreaterThanOrEqual(22);
    expect(rows.length).toBeLessThanOrEqual(25);
    expect(new Set(rows.map((r) => r.lunar.day))).toEqual(new Set([1, 15]));
  });
  it('every row converts back with solarToLunar', () => {
    for (const r of dates({ from, months: 24, days: [1, 15, 29] }).rows) {
      const [y, m, d] = ymd(r.solar);
      const l = solarToLunar(d, m, y);
      if (!l.ok) throw new Error('unexpected');
      expect([l.day, l.month, l.year, l.leap]).toEqual([
        r.lunar.day,
        r.lunar.month,
        r.lunar.year,
        r.lunar.leap,
      ]);
    }
  });
  it('rows are sorted and never before from', () => {
    const { rows } = dates({ from, months: 6 });
    expect(rows.every((r) => r.solar >= from)).toBe(true);
    expect([...rows].sort((a, b) => a.solar.localeCompare(b.solar))).toEqual(rows);
  });
  it('skips dates before from within the starting lunar month', () => {
    const { rows } = dates({ from: '2026-03-10', months: 1, days: [1, 15] });
    expect(rows.every((r) => r.solar >= '2026-03-10')).toBe(true);
  });
  it('a from that is itself a requested day is included', () => {
    const first = dates({ from, months: 2 }).rows[0]!;
    expect(dates({ from: first.solar, months: 1 }).rows[0]!.solar).toBe(first.solar);
  });
  it('text reuses lunarInfo text', () => {
    const r = dates({ from, months: 1 }).rows[0]!;
    const [y, m, d] = ymd(r.solar);
    const info = lunarInfo(d, m, y);
    if (!info.ok) throw new Error('unexpected');
    expect(r.text).toBe(info.text);
  });
  it('includes the leap month with leap: true', () => {
    const leap = leapMonthOf(2025);
    expect(leap).not.toBeNull();
    const { rows } = dates({ from: '2025-01-01', months: 24 });
    const inLeap = rows.filter((r) => r.lunar.leap);
    expect(inLeap.length).toBe(2);
    expect(inLeap.every((r) => r.lunar.month === leap && r.lunar.year === 2025)).toBe(true);
    expect(
      rows.filter((r) => !r.lunar.leap && r.lunar.month === leap && r.lunar.year === 2025).length,
    ).toBe(2);
  });
  it('days [30] skips 29-day months with a warning', () => {
    const r = dates({ from, months: 12, days: [30] });
    expect(r.rows.length).toBeLessThan(12);
    expect(r.rows.length + r.warnings.length).toBe(12);
    expect(r.rows.every((x) => x.lunar.day === 30)).toBe(true);
  });
  it('no warnings when every day exists', () => {
    expect(dates({ from, months: 12 }).warnings).toEqual([]);
  });
  it('months bound is respected', () => {
    expect(dates({ from, months: 1, days: [15] }).rows.length).toBeLessThanOrEqual(1);
    expect(dates({ from, months: 36 }).rows.length).toBeGreaterThan(60);
  });
  it.each([
    [{ days: [0] }],
    [{ days: [31] }],
    [{ days: [1.5] }],
    [{ days: [] }],
    [{ months: 0 }],
    [{ months: 37 }],
    [{ from: 'not-a-date' }],
  ])('returns an error Result for invalid input %j', (o) => {
    const r = lunarObservanceDates({ from, ...o } as never);
    expect(r.ok).toBe(false);
  });
});

describe('vn-lunar: lunarObservancesToICS', () => {
  it('has one VEVENT per row with all-day DTSTART', () => {
    const r = ics({ from: '2026-03-10' });
    const t = unfold(r.ics);
    expect(r.events).toBe(dates({ from: '2026-03-10' }).rows.length);
    expect(t.match(/BEGIN:VEVENT/g)?.length).toBe(r.events);
    expect(t.match(/DTSTART;VALUE=DATE:\d{8}/g)?.length).toBe(r.events);
    expect(t.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });
  it('uses CRLF only and folds lines to 75 octets', () => {
    const r = ics({ from: '2026-03-10', months: 24 });
    expect(r.ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const l of r.ics.split('\r\n')) expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
  });
  it('has unique, stable UIDs in the documented shape', () => {
    const o = { from: '2025-01-01', months: 24 };
    const uids = [...unfold(ics(o).ics).matchAll(/^UID:(.*)$/gm)].map((m) => m[1]!);
    expect(new Set(uids).size).toBe(uids.length);
    expect(uids.every((u) => /^lunar-\d{4}-\d{2}(-leap)?-\d{2}@vn-skills$/.test(u))).toBe(true);
    expect(uids.some((u) => u.includes('-leap-'))).toBe(true);
    expect(ics(o).ics).toBe(ics(o).ics);
  });
  it('returns an error Result for invalid options', () => {
    expect(lunarObservancesToICS({ from: '2026-03-10', days: [31] } as never).ok).toBe(false);
    expect(lunarObservancesToICS({ from: '2026-03-10', months: 0 } as never).ok).toBe(false);
  });
  it('leaves holidaysToICS output well-formed', () => {
    const r = holidaysToICS(2026, { dtstamp: new Date('2026-01-01T00:00:00Z') });
    if (!r.ok) throw new Error('unexpected');
    expect(r.ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });
});
