import { describe, expect, it } from 'vitest';
import {
  addWorkingDays,
  countWorkingDays,
  holidaysToICS,
  isWorkingDay,
  publicHolidays,
} from '@vn-skills/core';

describe('vn-holidays: holidaysToICS (RFC 5545 export)', () => {
  const dtstamp = new Date('2026-01-01T00:00:00Z');
  const ics = (year: number, o: { includeWorkingSaturdays?: boolean } = {}) => {
    const r = holidaysToICS(year, { dtstamp, ...o });
    if (!r.ok) throw new Error('unexpected');
    return r;
  };
  const days = (year: number) => {
    const p = publicHolidays(year);
    if (!p.ok) throw new Error('unexpected');
    return p;
  };
  const unfold = (t: string) => t.replace(/\r\n[ \t]/g, '');
  const next = (d: string) => {
    const t = new Date(`${d}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 1);
    return t.toISOString().slice(0, 10).replace(/-/g, '');
  };

  it('has the calendar header', () => {
    const t = unfold(ics(2026).ics);
    expect(t.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(t).toContain('VERSION:2.0\r\n');
    expect(t).toContain('PRODID:-//vn-skills//vn-holidays//EN\r\n');
    expect(t).toContain('CALSCALE:GREGORIAN\r\n');
    expect(t).toContain('X-WR-CALNAME:Ngày nghỉ lễ 2026\r\n');
    expect(t.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
  it('event count equals daysOff + working Saturdays', () => {
    const p = days(2026);
    const r = ics(2026);
    expect(r.year).toBe(2026);
    expect(r.announced).toBe(true);
    expect(r.events).toBe(p.daysOff.length + p.workingSaturdays.length);
    expect(r.ics.match(/BEGIN:VEVENT/g)?.length).toBe(r.events);
  });
  it('can omit working Saturdays', () => {
    const r = ics(2026, { includeWorkingSaturdays: false });
    expect(r.events).toBe(days(2026).daysOff.length);
    expect(r.ics).not.toContain('Đi làm bù (thứ Bảy)');
  });
  it('DTSTART/DTEND are date values with exclusive next-day end', () => {
    const t = unfold(ics(2026).ics);
    for (const d of days(2026).daysOff) {
      const c = d.date.replace(/-/g, '');
      expect(t).toContain(`DTSTART;VALUE=DATE:${c}\r\nDTEND;VALUE=DATE:${next(d.date)}\r\n`);
    }
  });
  it('DTEND crosses a month end', () => {
    const t = unfold(ics(2026).ics);
    const edge = days(2026).daysOff.filter((d) => next(d.date).slice(6) === '01');
    expect(edge.length).toBeGreaterThan(0);
    for (const d of edge) expect(t).toContain(`DTEND;VALUE=DATE:${next(d.date)}`);
  });
  it('DTEND of 31/12 is 1/1 of the next year', () => {
    expect(next('2026-12-31')).toBe('20270101');
    const r = ics(2026);
    const t = unfold(r.ics);
    if (days(2026).daysOff.some((d) => d.date === '2026-12-31')) {
      expect(t).toContain('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101');
    }
    expect(t).not.toContain('DTEND;VALUE=DATE:20261232');
  });
  it('writes DTSTAMP in UTC and TRANSPARENT events', () => {
    const t = ics(2026).ics;
    expect(t).toContain('DTSTAMP:20260101T000000Z');
    expect(t).toContain('TRANSP:TRANSPARENT');
  });
  it('UIDs are stable across calls, unique, and end with @vn-skills', () => {
    const a = ics(2026).ics;
    const b = holidaysToICS(2026, { dtstamp: new Date('2027-05-05T10:00:00Z') });
    if (!b.ok) throw new Error('unexpected');
    const uids = (t: string) => unfold(t).match(/^UID:.*$/gm) ?? [];
    expect(uids(a).length).toBeGreaterThan(0);
    expect(uids(a)).toEqual(uids(b.ics));
    expect(new Set(uids(a)).size).toBe(uids(a).length);
    expect(uids(a).every((u) => u.endsWith('@vn-skills'))).toBe(true);
  });
  it('uses CRLF only and no bare LF', () => {
    const t = ics(2026).ics;
    expect(t.endsWith('\r\n')).toBe(true);
    expect(t.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });
  it('no line exceeds 75 octets and folds keep UTF-8 intact', () => {
    for (const y of [2026, 2027, 2030]) {
      const r = holidaysToICS(y, { dtstamp });
      if (!r.ok) continue;
      for (const line of r.ics.split('\r\n')) {
        expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
        expect(line).not.toContain('\uFFFD');
      }
    }
  });
  it('folds long Vietnamese lines with a leading space', () => {
    const r = ics(2026);
    expect(r.ics.split('\r\n').some((l) => l.startsWith(' '))).toBe(true);
    expect(unfold(r.ics)).toContain('Đi làm bù (thứ Bảy)');
  });
  it('suffixes compensatory and swapped days', () => {
    const t = unfold(ics(2026).ics);
    const p = days(2026);
    if (p.daysOff.some((d) => d.kind === 'compensatory')) expect(t).toContain(' (nghỉ bù)');
    if (p.daysOff.some((d) => d.kind === 'swapped')) expect(t).toContain(' (hoán đổi)');
  });
  it('includes source URLs when announced', () => {
    const p = days(2026);
    const t = unfold(ics(2026).ics);
    expect(p.sources.length).toBeGreaterThan(0);
    for (const s of p.sources) {
      expect(t).toContain(typeof s === 'string' ? s : (s as { url: string }).url);
    }
  });
  it('unannounced year: warnings, announced false, no pending events', () => {
    const p = days(2030);
    const r = ics(2030);
    expect(r.announced).toBe(false);
    expect(r.warnings.length).toBe(p.pending.length);
    expect(r.events).toBe(p.daysOff.length);
  });
  it('announced year has no warnings', () => {
    expect(ics(2026).warnings).toEqual([]);
  });
  it('out-of-range year reuses the publicHolidays error', () => {
    const r = holidaysToICS(1999);
    expect(r.ok).toBe(false);
    expect(r).toEqual(publicHolidays(1999));
  });
  it('defaults dtstamp to now', () => {
    const r = holidaysToICS(2026);
    if (!r.ok) throw new Error('unexpected');
    expect(r.ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });
});

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

describe('vn-holidays: OUT_OF_RANGE messages', () => {
  it('a year below the data set keeps the "starts with" hint', () => {
    const r = publicHolidays(2022);
    expect(r.ok === false && r.error).toMatchObject({
      code: 'OUT_OF_RANGE',
      hint: 'The data set starts with the 2023 notices.',
    });
  });
  it('a year above the data set states the upper limit, not the start', () => {
    const r = publicHolidays(2200);
    if (r.ok) throw new Error('unexpected');
    expect(r.error.code).toBe('OUT_OF_RANGE');
    expect(r.error.hint).toContain('31/12/2199');
    expect(r.error.hint).not.toContain('starts');
  });
  it('addWorkingDays names the start date when the walk leaves the range', () => {
    const r = addWorkingDays(30, 12, 2199, 5);
    if (r.ok) throw new Error('unexpected');
    expect(r.error.code).toBe('OUT_OF_RANGE');
    expect(r.error.message).toContain('30/12/2199');
    expect(r.error.message).toMatch(/outside/);
  });
});

describe('vn-holidays: countWorkingDays', () => {
  const starts: Array<[number, number, number]> = [
    [10, 2, 2025],
    [25, 1, 2026],
    [10, 2, 2026],
    [28, 8, 2026],
    [20, 1, 2027],
    [1, 9, 2025],
  ];
  const ymd = (d: string) => d.split('-').map(Number) as [number, number, number];
  const count = (a: string, b: string) => {
    const [ay, am, ad] = ymd(a);
    const [by, bm, bd] = ymd(b);
    return countWorkingDays(ad, am, ay, bd, bm, by);
  };

  it.each(starts.flatMap((s) => [1, 5, 20, 60, -5, -20].map((n) => [s, n] as const)))(
    'round trip %j n=%i',
    ([d, m, y], n) => {
      const added = addWorkingDays(d, m, y, n);
      if (!added.ok) throw new Error('add failed');
      const [ty, tm, td] = ymd(added.date);
      const r = countWorkingDays(d, m, y, td, tm, ty);
      expect(r.ok && r.workingDays).toBe(n);
    },
  );

  it('matches isWorkingDay over a range containing Tết', () => {
    const r = count('2026-02-10', '2026-03-02');
    let expected = 0;
    for (let t = Date.UTC(2026, 1, 11); t <= Date.UTC(2026, 2, 2); t += 86400000) {
      const x = new Date(t);
      const w = isWorkingDay(x.getUTCDate(), x.getUTCMonth() + 1, x.getUTCFullYear());
      if (w.ok && w.working) expected++;
    }
    expect(r.ok && r.workingDays).toBe(expected);
    expect(r.ok && r.certain).toBe(true);
  });

  it('is 0 for equal dates and negates when swapped', () => {
    const z = count('2026-02-10', '2026-02-10');
    expect(z.ok && z.workingDays).toBe(0);
    const f = count('2026-02-10', '2026-03-02');
    const b = count('2026-03-02', '2026-02-10');
    expect(f.ok && b.ok && b.workingDays).toBe(f.ok ? -f.workingDays : NaN);
  });

  it('certain is false across an unannounced Tết window, true in an announced year', () => {
    const u = count('2030-01-15', '2030-03-15');
    expect(u.ok && u.certain).toBe(false);
    const k = count('2026-03-10', '2026-03-20');
    expect(k.ok && k.certain).toBe(true);
  });

  it('returns structured errors', () => {
    const bad = countWorkingDays(31, 2, 2026, 1, 3, 2026);
    expect(bad.ok === false && bad.error.code).toBe('INVALID_DATE');
    const oor = count('2020-01-01', '2026-01-01');
    expect(oor.ok === false && oor.error.code).toBe('OUT_OF_RANGE');
    const big = count('2025-01-01', '2036-01-01');
    expect(big.ok === false && big.error.code).toBe('RANGE_TOO_LARGE');
  });

  it('does not throw on null or non-number arguments', () => {
    const f = countWorkingDays as unknown as (...a: unknown[]) => { ok: boolean };
    expect(f(null, 1, 2026, 1, 2, 2026).ok).toBe(false);
    expect(f('a', 1, 2026, 1, 2, 2026).ok).toBe(false);
    expect(f(1, 1, 2026, undefined, 2, 2026).ok).toBe(false);
  });
});
