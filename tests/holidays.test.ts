import { describe, expect, it } from 'vitest';
import { addWorkingDays, isWorkingDay, publicHolidays } from '@vn-skills/core';

describe('vn-holidays: invalid input (non-JSON inputs; the rest is in tests/golden/vn-holidays.json)', () => {
  it('publicHolidays rejects NaN', () => {
    const r = publicHolidays(Number.NaN);
    expect(r.ok === false && r.error.code).toBe('INVALID_YEAR');
  });
  it('addWorkingDays rejects n = NaN', () => {
    const r = addWorkingDays(5, 5, 2025, Number.NaN);
    expect(r.ok === false && r.error.code).toBe('INVALID_COUNT');
  });
});

describe('vn-holidays: year without an announcement', () => {
  const r = publicHolidays(2030);
  it('is flagged announced: false with no sources', () => {
    expect(r).toMatchObject({ ok: true, announced: false, sources: [], workingSaturdays: [] });
  });
  it('lists only statutory days and no swapped days', () => {
    if (!r.ok) throw new Error('unexpected');
    expect(r.daysOff.length).toBeGreaterThan(0);
    expect(r.daysOff.every((d) => d.kind !== 'swapped')).toBe(true);
    expect(r.daysOff.some((d) => d.holiday === 'tet')).toBe(false);
  });
  it('keeps Tết and the second National Day as pending', () => {
    if (!r.ok) throw new Error('unexpected');
    expect(r.pending.map((p) => p.holiday).sort()).toEqual(['nationalDay', 'tet']);
  });
  it('treats 2/9 as a certain day off', () => {
    expect(isWorkingDay(2, 9, 2030)).toMatchObject({ ok: true, working: false, certain: true });
  });
  it('an announced year has no pending days', () => {
    const a = publicHolidays(2025);
    expect(a).toMatchObject({ ok: true, announced: true, pending: [] });
  });
});

describe('vn-holidays: weekend collision', () => {
  it('1/1/2023 (Sunday) is off as Sunday; 2/1 is compensatory', () => {
    expect(isWorkingDay(1, 1, 2023)).toMatchObject({ working: false, reason: 'Sunday' });
    expect(isWorkingDay(2, 1, 2023)).toMatchObject({
      working: false,
      reason: 'Tết Dương lịch (compensatory)',
    });
  });
  it('compensatory days are marked kind compensatory', () => {
    const r = publicHolidays(2023);
    if (!r.ok) throw new Error('unexpected');
    expect(r.daysOff.find((d) => d.date === '2023-01-02')).toMatchObject({
      holiday: 'newYear',
      kind: 'compensatory',
    });
  });
  it('a swapped Saturday is a certain working day', () => {
    expect(isWorkingDay(26, 4, 2025)).toMatchObject({ working: true, certain: true });
  });
  it('a plain Saturday is off with reason Saturday', () => {
    expect(isWorkingDay(5, 4, 2025)).toMatchObject({ working: false, reason: 'Saturday' });
  });
});

describe('vn-holidays: addWorkingDays', () => {
  it('n = 0 returns the same date', () => {
    expect(addWorkingDays(5, 5, 2025, 0)).toEqual({ ok: true, date: '2025-05-05', certain: true });
  });
  it('n = 0 does not roll a holiday forward', () => {
    expect(addWorkingDays(1, 5, 2025, 0)).toMatchObject({ ok: true, date: '2025-05-01' });
  });
  it('negative n moves backwards', () => {
    expect(addWorkingDays(5, 5, 2025, -1)).toMatchObject({ ok: true, date: '2025-04-29' });
  });
  it('positive n skips holidays', () => {
    expect(addWorkingDays(29, 4, 2025, 1)).toMatchObject({ ok: true, date: '2025-05-05' });
  });
  it('adding then subtracting a working day round-trips', () => {
    expect(addWorkingDays(7, 5, 2025, 1)).toMatchObject({ date: '2025-05-08' });
    expect(addWorkingDays(8, 5, 2025, -1)).toMatchObject({ date: '2025-05-07' });
  });
});

describe('vn-holidays: year boundary', () => {
  it('adds across 31/12 -> 1/1 holiday', () => {
    expect(addWorkingDays(31, 12, 2024, 1)).toMatchObject({ ok: true, date: '2025-01-02' });
  });
  it('adds across a weekend plus New Year', () => {
    expect(addWorkingDays(29, 12, 2023, 1)).toMatchObject({ ok: true, date: '2024-01-02' });
  });
  it('subtracts across the boundary', () => {
    expect(addWorkingDays(2, 1, 2025, -1)).toMatchObject({ ok: true, date: '2024-12-31' });
  });
});
