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

const TET: Array<[number, string, string]> = [
  [2018, '2018-02-16', 'Mậu Tuất'],
  [2019, '2019-02-05', 'Kỷ Hợi'],
  [2020, '2020-01-25', 'Canh Tý'],
  [2021, '2021-02-12', 'Tân Sửu'],
  [2022, '2022-02-01', 'Nhâm Dần'],
  [2023, '2023-01-22', 'Quý Mão'],
  [2024, '2024-02-10', 'Giáp Thìn'],
  [2025, '2025-01-29', 'Ất Tỵ'],
  [2026, '2026-02-17', 'Bính Ngọ'],
  [2027, '2027-02-06', 'Đinh Mùi'],
  [2028, '2028-01-26', 'Mậu Thân'],
  [2029, '2029-02-13', 'Kỷ Dậu'],
  // 2030: new moon at 16:07 UT on 2 Feb -> 23:07 in UTC+7 (Vietnam: 2 Feb) but 00:07 on 3 Feb in UTC+8 (China: 3 Feb).
  [2030, '2030-02-02', 'Canh Tuất'],
];

describe('Tết dates', () => {
  for (const [year, date, canChi] of TET) {
    it(`Tết ${year} = ${date} (${canChi})`, () => {
      const t = tetDate(year);
      expect(t.ok && t.date).toBe(date);
      expect(t.ok && t.canChi).toBe(canChi);
    });
  }
});

describe('solarToLunar', () => {
  it('2025-01-29 is 1/1 Ất Tỵ', () => {
    const l = solarToLunar(29, 1, 2025);
    expect(l.ok && [l.day, l.month, l.year, l.leap]).toEqual([1, 1, 2025, false]);
  });
  it('2025-01-28 is 29/12 Giáp Thìn', () => {
    const l = solarToLunar(28, 1, 2025);
    expect(l.ok && [l.day, l.month, l.year]).toEqual([29, 12, 2024]);
  });
  it('2024-01-01 is 20/11 Quý Mão', () => {
    const l = solarToLunar(1, 1, 2024);
    expect(l.ok && [l.day, l.month, l.year]).toEqual([20, 11, 2023]);
  });
  it('2023-03-22 is 1/2 leap (nhuận) Quý Mão', () => {
    const l = solarToLunar(22, 3, 2023);
    expect(l.ok && [l.day, l.month, l.year, l.leap]).toEqual([1, 2, 2023, true]);
  });
  it('2023-02-20 is 1/2 (not leap) Quý Mão', () => {
    const l = solarToLunar(20, 2, 2023);
    expect(l.ok && [l.day, l.month, l.leap]).toEqual([1, 2, false]);
  });
  it('2020-05-23 is 1/4 leap Canh Tý', () => {
    const l = solarToLunar(23, 5, 2020);
    expect(l.ok && [l.day, l.month, l.leap]).toEqual([1, 4, true]);
  });
  it('2025-07-25 is 1/6 leap Ất Tỵ', () => {
    const l = solarToLunar(25, 7, 2025);
    expect(l.ok && [l.day, l.month, l.leap]).toEqual([1, 6, true]);
  });
  it('Giỗ Tổ 2024 (10/3 âm) = 2024-04-18', () => {
    const l = solarToLunar(18, 4, 2024);
    expect(l.ok && [l.day, l.month]).toEqual([10, 3]);
  });
  it('Trung thu 2024 (15/8 âm) = 2024-09-17', () => {
    const l = solarToLunar(17, 9, 2024);
    expect(l.ok && [l.day, l.month]).toEqual([15, 8]);
  });
  it('rejects invalid date', () => expect(solarToLunar(31, 2, 2024).ok).toBe(false));
  it('rejects out-of-range year', () => expect(solarToLunar(1, 1, 1500).ok).toBe(false));
});

describe('lunarToSolar', () => {
  it('1/1/2026 → 2026-02-17', () => {
    const s = lunarToSolar(1, 1, 2026);
    expect(s.ok && [s.day, s.month, s.year]).toEqual([17, 2, 2026]);
  });
  it('leap 2/2023 day 1 → 2023-03-22', () => {
    const s = lunarToSolar(1, 2, 2023, true);
    expect(s.ok && [s.day, s.month, s.year]).toEqual([22, 3, 2023]);
  });
  it('rejects leap flag on non-leap month', () => {
    const s = lunarToSolar(1, 3, 2023, true);
    expect(!s.ok && s.error.code).toBe('NOT_LEAP_MONTH');
  });
  it('rejects leap flag in a year without leap month', () => {
    expect(lunarToSolar(1, 2, 2024, true).ok).toBe(false);
  });
  it('rejects day 30 in a 29-day month', () => {
    const len = lunarMonthLength(12, 2024);
    expect(len).toBe(29); // 29/12 Giáp Thìn was the last day before Tết 2025
    expect(lunarToSolar(30, 12, 2024).ok).toBe(false);
  });
  it('rejects nonsense', () => expect(lunarToSolar(0, 13, 2024).ok).toBe(false));
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

describe('leap months', () => {
  it.each([
    [2020, 4],
    [2023, 2],
    [2025, 6],
    [2028, 5],
    [2017, 6],
    [2014, 9],
  ])('lunar year %i has leap month %i', (y, m) => expect(leapMonthOf(y)).toBe(m));
  it.each([2021, 2022, 2024, 2026, 2027])('lunar year %i has no leap month', (y) =>
    expect(leapMonthOf(y)).toBeNull(),
  );
});

describe('can chi & info', () => {
  it('yearCanChi', () => {
    expect(yearCanChi(2024)).toBe('Giáp Thìn');
    expect(yearCanChi(2025)).toBe('Ất Tỵ');
    expect(yearCanChi(2026)).toBe('Bính Ngọ');
    expect(yearCanChi(1984)).toBe('Giáp Tý');
  });
  it('dayCanChi 2025-01-29 is Mậu Tuất', () => expect(dayCanChi(29, 1, 2025)).toBe('Mậu Tuất'));
  it('dayCanChi 2025-01-28 (giao thừa) is Đinh Dậu', () =>
    expect(dayCanChi(28, 1, 2025)).toBe('Đinh Dậu'));
  it('dayCanChi 2000-01-01 is Mậu Ngọ', () => expect(dayCanChi(1, 1, 2000)).toBe('Mậu Ngọ'));
  it('lunarInfo text', () => {
    const i = lunarInfo(29, 1, 2025);
    expect(i.ok && i.text).toBe('Mùng 1 tháng Giêng năm Ất Tỵ');
    expect(i.ok && i.zodiacEn).toBe('Snake');
    expect(i.ok && i.solar.weekday).toBe('Thứ tư');
  });
  it('lunarInfo solar term around Đông chí', () => {
    const i = lunarInfo(22, 12, 2024);
    expect(i.ok && i.solarTerm).toBe('Đông chí');
  });
});

describe('holidays', () => {
  it('2025 public holidays include Tết and Giỗ Tổ on the right dates', () => {
    const h = holidays(2025, { publicOnly: true });
    const byName = Object.fromEntries(h.map((x) => [x.name, x.date]));
    expect(byName['Tết Nguyên Đán (mùng 1)']).toBe('2025-01-29');
    expect(byName['Giỗ Tổ Hùng Vương']).toBe('2025-04-07');
    expect(byName['Quốc khánh']).toBe('2025-09-02');
    expect(byName['Giao thừa (Tất niên)']).toBe('2025-01-28');
  });
  it('2024 Trung thu is 2024-09-17', () => {
    expect(holidays(2024).find((x) => x.name === 'Tết Trung Thu')?.date).toBe('2024-09-17');
  });
  it('is sorted by date', () => {
    const h = holidays(2026);
    const dates = h.map((x) => x.date);
    expect([...dates].sort()).toEqual(dates);
  });
});

describe('parseDateInput', () => {
  it('dd/mm/yyyy', () =>
    expect(parseDateInput('29/01/2025')).toMatchObject({ day: 29, month: 1, year: 2025 }));
  it('yyyy-mm-dd', () =>
    expect(parseDateInput('2025-01-29')).toMatchObject({ day: 29, month: 1, year: 2025 }));
  it('dd-mm-yyyy', () =>
    expect(parseDateInput('1-2-2025')).toMatchObject({ day: 1, month: 2, year: 2025 }));
  it('rejects junk', () => expect(parseDateInput('tomorrow').ok).toBe(false));
});
