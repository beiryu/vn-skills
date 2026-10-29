import { describe, expect, it } from 'vitest';
import { lunarToSolar, parseVietnameseDate } from '@vn-skills/core';

const ref = '2026-10-28';
const iso = (s: { year: number; month: number; day: number }) =>
  `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
const lunar = (d: number, m: number, y: number, leap = false) => {
  const s = lunarToSolar(d, m, y, leap);
  if (!s.ok) throw new Error('fixture');
  return iso(s);
};
const addDays = (n: number) => {
  const d = new Date(`${ref}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const parse = (t: string) => parseVietnameseDate(t, { ref });
// ref is a Wednesday; weeks run Monday-Sunday
const monday = addDays(-2);
const week = (offset: number, dow: number) => {
  const d = new Date(`${monday}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset * 7 + dow);
  return d.toISOString().slice(0, 10);
};

describe('parseVietnameseDate', () => {
  it.each([
    ['ngày 15 tháng 7 âm', lunar(15, 7, 2027)],
    ['15/7 âm', lunar(15, 7, 2027)],
    ['15/7 âm lịch', lunar(15, 7, 2027)],
    ['mùng 1 tháng Giêng', lunar(1, 1, 2027)],
    ['rằm tháng 7', lunar(15, 7, 2027)],
    ['rằm tháng Giêng', lunar(15, 1, 2027)],
    ['ngày 23 tháng Chạp', lunar(23, 12, 2026)],
    ['mùng 5 tháng Một', lunar(5, 11, 2026)],
    ['RẰM THÁNG GIÊNG', lunar(15, 1, 2027)],
    ['ram thang gieng', lunar(15, 1, 2027)],
    ['mung 1 thang chap', lunar(1, 12, 2026)],
    ['rằm tháng Giêng năm sau', lunar(15, 1, 2027)],
    ['rằm tháng 7 năm nay', lunar(15, 7, 2026)],
    ['rằm tháng 7 năm ngoái', lunar(15, 7, 2025)],
    ['rằm tháng 7 năm 2030', lunar(15, 7, 2030)],
    ['mùng 1 Tết năm sau', lunar(1, 1, 2027)],
    ['Tết', lunar(1, 1, 2027)],
    ['Tết Trung thu', lunar(15, 8, 2027)],
    ['hôm nay', ref],
    ['ngày mai', addDays(1)],
    ['ngày kia', addDays(2)],
    ['hôm qua', addDays(-1)],
    ['3 ngày nữa', addDays(3)],
    ['3 ngày trước', addDays(-3)],
    ['2 tuần nữa', addDays(14)],
    ['thứ Sáu tuần sau', week(1, 4)],
    ['thứ Hai tuần này', week(0, 0)],
    ['Chủ nhật tuần trước', week(-1, 6)],
    ['ngày 5 tháng 3 năm 2027', '2027-03-05'],
    ['2027-03-05', '2027-03-05'],
    ['05/03/2027', '2027-03-05'],
  ])('%s', (text, solar) => {
    expect(parse(text)).toMatchObject({ ok: true, solar });
  });

  it('reports calendar and lunar fields', () => {
    expect(parse('rằm tháng 7')).toMatchObject({
      ok: true,
      calendar: 'lunar',
      lunar: { day: 15, month: 7, year: 2027, leap: false },
    });
    expect(parse('ngày mai')).toMatchObject({ ok: true, calendar: 'solar' });
  });

  it('handles leap months', () => {
    expect(parse('mùng 1 tháng 6 nhuận năm 2025')).toMatchObject({
      ok: true,
      solar: lunar(1, 6, 2025, true),
      lunar: { leap: true },
    });
    expect(parse('mùng 1 tháng 6 nhuận năm 2026')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DATE' },
    });
  });

  it('rejects day 30 in a 29-day month', () => {
    expect(parse('ngày 30 tháng 12 âm năm 2026')).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DATE' },
    });
  });

  it.each(['', '   ', null, undefined])('EMPTY for %s', (t) => {
    expect(parseVietnameseDate(t as never, { ref })).toMatchObject({
      ok: false,
      error: { code: 'EMPTY' },
    });
  });

  it('UNRECOGNISED with hint', () => {
    expect(parse('xin chào')).toMatchObject({
      ok: false,
      error: { code: 'UNRECOGNISED', hint: expect.any(String) },
    });
  });
});
