import { describe, expect, it } from 'vitest';
import { moneyToWords, numberToWords, toSpokenText } from '@vn-skills/core';

const nw = (n: number | string) => {
  const r = numberToWords(n);
  if (!r.ok) throw new Error(r.error.message);
  return r.words;
};
const mw = (n: number | string) => {
  const r = moneyToWords(n);
  if (!r.ok) throw new Error(r.error.message);
  return r.words;
};
const digits = (s: string) => [...s].map((d) => nw(d)).join(' ');

function speak(text: string, opts?: { phone?: 'digits' }) {
  const r = toSpokenText(text, opts);
  if (!r.ok) throw new Error(r.error.message);
  return r;
}

describe('toSpokenText', () => {
  it('reads a đ amount', () => {
    const r = speak('Giá 1.250.000đ nhé');
    expect(r.text).toBe(`Giá ${mw(1250000)} nhé`);
    expect(r.changes).toHaveLength(1);
    expect(r.changes[0]!.kind).toBe('money');
    expect(r.changes[0]!.original).toBe('1.250.000đ');
  });
  it.each(['đ', '₫', 'đồng', 'vnđ', 'VND', 'VNĐ', 'vnd'])('money unit %s', (u) => {
    expect(speak(`100.000${u}`).text).toBe(mw(100000));
    expect(speak(`100.000 ${u}`).text).toBe(mw(100000));
  });
  it('reads a VND amount', () => {
    const r = speak('Thanh toán 2.500.000 VND ngay');
    expect(r.text).toBe(`Thanh toán ${mw(2500000)} ngay`);
  });
  it('reads 500k shorthand', () => {
    expect(speak('500k đ').text).toBe(mw(500000));
  });
  it('reads 1tr2 shorthand with unit', () => {
    expect(speak('1tr2 đồng').text).toBe(mw(1200000));
  });
  it('reads 2 tỷ shorthand', () => {
    expect(speak('2 tỷ đồng').text).toBe(mw(2000000000));
  });
  it('reads grouped number with no unit', () => {
    const r = speak('Có 1.250.000 người');
    expect(r.text).toBe(`Có ${nw(1250000)} người`);
    expect(r.changes[0]!.kind).toBe('number');
  });
  it('reads a plain integer', () => {
    expect(speak('có 42 cái').text).toBe(`có ${nw(42)} cái`);
  });
  it('reads a percentage', () => {
    const r = speak('Giảm 15%');
    expect(r.text).toBe(`Giảm ${nw(15)} phần trăm`);
    expect(r.changes[0]!.kind).toBe('percent');
  });
  it('reads a phone with spaces digit by digit', () => {
    const r = speak('gọi 0912 345 678 ngay');
    expect(r.text).toBe(`gọi ${digits('0912345678')} ngay`);
    expect(r.changes[0]!.kind).toBe('phone');
  });
  it('reads a phone with +84', () => {
    const r = speak('gọi +84912345678');
    expect(r.text).toBe(`gọi ${digits('+84912345678'.slice(1))}`);
    expect(r.changes[0]!.kind).toBe('phone');
  });
  it('reads a phone with the digits option', () => {
    expect(speak('0912345678', { phone: 'digits' }).text).toBe(digits('0912345678'));
  });
  it('reads a full date', () => {
    const r = speak('giao ngày 08/02/2019.');
    expect(r.text).toBe(`giao ngày ngày ${nw(8)} tháng ${nw(2)} năm ${nw(2019)}.`);
    expect(r.changes[0]!.kind).toBe('date');
  });
  it('date output is "ngày d tháng m năm y"', () => {
    expect(speak('08/02/2019').text).toBe(`ngày ${nw(8)} tháng ${nw(2)} năm ${nw(2019)}`);
  });
  it('skips partial date 8/2019', () => {
    const r = speak('hạn 8/2019');
    expect(r.text).toBe('hạn 8/2019');
    expect(r.changes).toEqual([]);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]!.original).toBe('8/2019');
    expect(r.skipped[0]!.reason).toBeTruthy();
  });
  it('skips partial date 08/02', () => {
    const r = speak('08/02');
    expect(r.text).toBe('08/02');
    expect(r.skipped[0]!.original).toBe('08/02');
  });
  it('skips decimals with reason decimal', () => {
    for (const d of ['1,5', '3.14']) {
      const r = speak(`là ${d} nhé`);
      expect(r.text).toBe(`là ${d} nhé`);
      expect(r.changes).toEqual([]);
      expect(r.skipped[0]!.original).toBe(d);
      expect(r.skipped[0]!.reason).toBe('decimal');
    }
  });
  it('reads a negative integer', () => {
    const r = speak('nhiệt độ -5 độ');
    expect(r.text).toBe(`nhiệt độ ${nw(-5)} độ`);
    expect(r.changes[0]!.kind).toBe('number');
  });
  it('leaves text with nothing to change', () => {
    const r = speak('Xin chào, hôm nay trời đẹp.');
    expect(r.text).toBe('Xin chào, hôm nay trời đẹp.');
    expect(r.changes).toEqual([]);
    expect(r.skipped).toEqual([]);
  });
  it('does not rewrite an invalid date as a date', () => {
    const r = speak('ngày 31/02/2024');
    expect(r.changes.some((c) => c.kind === 'date')).toBe(false);
  });
  it('change offsets index the original string', () => {
    const text = 'Đơn 1.250.000đ giao ngày 08/02/2019, gọi 0912 345 678, giảm 15%';
    const r = speak(text);
    expect(r.changes.map((c) => c.kind)).toEqual(['money', 'date', 'phone', 'percent']);
    for (const c of r.changes) expect(text.slice(c.start, c.end)).toBe(c.original);
  });
  it('skipped offsets index the original string', () => {
    const text = 'x 1,5 y';
    const r = speak(text);
    const s = r.skipped[0]!;
    expect(text.slice(s.start, s.end)).toBe(s.original);
  });
  it('combines the issue example', () => {
    const r = speak('Đơn 1.250.000đ giao ngày 08/02/2019, gọi 0912 345 678');
    expect(r.text).toBe(
      `Đơn ${mw(1250000)} giao ngày ngày ${nw(8)} tháng ${nw(2)} năm ${nw(2019)}, gọi ${digits('0912345678')}`,
    );
  });
  it.each([[''], [undefined], [null], [42]])('empty/non-string %s → EMPTY', (v) => {
    const r = toSpokenText(v as unknown as string);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('EMPTY');
      expect(r.error.hint).toBeTruthy();
    }
  });
});
