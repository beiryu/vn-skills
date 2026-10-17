import { describe, expect, it } from 'vitest';
import {
  formatCompactVnd,
  formatDate,
  formatNumber,
  formatVnd,
  parseAmount,
} from '@vn-skills/core';

const parsed = (s: string) => {
  const r = parseAmount(s);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe('formatNumber', () => {
  it.each([
    [1234567.89, '1.234.567,89'],
    [1234567, '1.234.567'],
    [0, '0'],
    [999, '999'],
    [1000, '1.000'],
    [-1234.5, '-1.234,5'],
    [0.5, '0,5'],
  ])('%s -> %s', (n, expected) => {
    const r = formatNumber(n);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.text).toBe(expected);
  });

  it('rejects NaN and Infinity', () => {
    expect(formatNumber(Number.NaN).ok).toBe(false);
    expect(formatNumber(Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});

describe('formatVnd', () => {
  it.each([
    [1200000, '1.200.000 ₫'],
    [0, '0 ₫'],
    [500, '500 ₫'],
    [1234567, '1.234.567 ₫'],
  ])('%s -> %s', (n, expected) => {
    const r = formatVnd(n);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.text).toBe(expected);
  });

  it('rejects NaN', () => {
    expect(formatVnd(Number.NaN).ok).toBe(false);
  });
});

describe('formatCompactVnd', () => {
  it.each([
    [1200000, '1,2 triệu'],
    [1500000000, '1,5 tỷ'],
  ])('%s -> %s', (n, expected) => {
    const r = formatCompactVnd(n);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.text).toBe(expected);
  });
});

describe('formatDate', () => {
  it('formats dd/MM/yyyy', () => {
    const r = formatDate('2025-01-29');
    if (!r.ok) throw new Error(r.error.message);
    expect(r.text).toBe('29/01/2025');
  });
  it('zero-pads day and month', () => {
    const r = formatDate('2024-03-05');
    if (!r.ok) throw new Error(r.error.message);
    expect(r.text).toBe('05/03/2024');
  });
  it('rejects impossible dates', () => {
    expect(formatDate('2025-02-30').ok).toBe(false);
  });
});

describe('parseAmount', () => {
  it.each([
    ['1tr2', 1200000],
    ['500k', 500000],
    ['1,5 tỷ', 1500000000],
    ['1.234.567,89', 1234567.89],
    ['1.200.000 ₫', 1200000],
    ['1,2 triệu', 1200000],
    ['2tr', 2000000],
    ['2 triệu', 2000000],
    ['250.000đ', 250000],
    ['0', 0],
    ['1,5', 1.5],
    ['1.500.000', 1500000],
  ])('%s -> %s', (s, expected) => {
    expect(parsed(s)).toBe(expected);
  });

  it('documented behaviour: lone "1.500" is a thousands separator (1500)', () => {
    expect(parsed('1.500')).toBe(1500);
  });

  it('a comma decimal with a non-3-digit tail is decimal', () => {
    expect(parsed('1,50')).toBe(1.5);
  });

  it.each(['', 'abc', '1..2', 'tr'])('rejects %j', (s) => {
    expect(parseAmount(s).ok).toBe(false);
  });
});

describe('formatCompactVnd boundaries and extras', () => {
  it.each([
    [999999, '1 triệu'],
    [999999999, '1 tỷ'],
    [999994, '999,99 nghìn'],
    [-999999, '-1 triệu'],
    [500000, '500 nghìn'],
    [999, '999'],
  ])('%s -> %s', (n, expected) => {
    expect(formatCompactVnd(n)).toEqual({ ok: true, text: expected });
  });
  it('avoids -0 and rounds to 2 fraction digits', () => {
    expect(formatNumber(1.005)).toMatchObject({ text: '1' });
    expect(formatNumber(-0.001)).toEqual({ ok: true, text: '0' });
  });
  it('formats d/m/yyyy and leap days', () => {
    expect(formatDate('5/3/2024')).toEqual({ ok: true, text: '05/03/2024' });
    expect(formatDate('2024-02-29').ok).toBe(true);
    expect(formatDate('nope').ok).toBe(false);
  });
  it.each([
    ['1,5k', 1500],
    ['2 tỷ', 2e9],
    ['1tr25', 1250000],
    ['3 nghìn', 3000],
  ])('parses %s', (s, v) => {
    expect(parseAmount(s)).toEqual({ ok: true, value: v });
  });
  it.each(['1.5.00', '1,2,3', '12x', '1k2k'])('rejects %s', (s) => {
    expect(parseAmount(s).ok).toBe(false);
  });
});
