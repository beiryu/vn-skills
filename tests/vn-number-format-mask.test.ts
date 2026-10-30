import { describe, expect, it } from 'vitest';
import { formatNumber, maskVndInput } from '@vn-skills/core';

const mask = (raw: string, caret?: number) => {
  const r = maskVndInput(raw, caret);
  if (!r.ok) throw new Error(r.error.message);
  return r;
};

describe('maskVndInput', () => {
  it('groups a plain number and puts the caret at the end', () => {
    expect(mask('1250000')).toEqual({
      ok: true,
      text: '1.250.000',
      caret: 9,
      value: 1250000,
      digits: '1250000',
    });
  });

  it('typing a 4th digit adds a separator and moves the caret', () => {
    const r = mask('1234', 4);
    expect(r.text).toBe('1.234');
    expect(r.caret).toBe(5);
  });

  it('typing a digit that does not add a separator', () => {
    const r = mask('12', 2);
    expect(r.text).toBe('12');
    expect(r.caret).toBe(2);
  });

  it('deleting next to a separator keeps the caret after the same digits', () => {
    const r = mask('1.20.000', 4);
    expect(r.text).toBe('120.000');
    expect(r.value).toBe(120000);
    expect(r.caret).toBe(3);
  });

  it.each([
    [0, 0],
    [1, 1],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 7],
    [7, 9],
  ])('caret in the middle: digits left %i -> caret %i', (digitsLeft, expected) => {
    expect(mask('1250000', digitsLeft).caret).toBe(expected);
  });

  it('caret counts digits only, ignoring separators in raw', () => {
    expect(mask('1.250.000', 5).caret).toBe(5);
  });

  it('defaults the caret to raw.length', () => {
    expect(mask('1.250.000 ₫').caret).toBe(9);
  });

  it.each([
    ['1.250.000 ₫', 1250000, '1.250.000'],
    ['1,250,000', 1250000, '1.250.000'],
    [' 500 000 ', 500000, '500.000'],
    ['-1.000', 1000, '1.000'],
    ['abc12d3', 123, '123'],
  ])('pasted %j', (raw, value, text) => {
    const r = mask(raw);
    expect(r.value).toBe(value);
    expect(r.text).toBe(text);
    expect(r.digits).toBe(String(value));
  });

  it('strips leading zeros', () => {
    const r = mask('000123');
    expect(r.text).toBe('123');
    expect(r.value).toBe(123);
    expect(r.digits).toBe('123');
    expect(r.caret).toBe(3);
  });

  it('caret inside stripped leading zeros goes to 0', () => {
    expect(mask('000123', 2).caret).toBe(0);
    expect(mask('000123', 4).caret).toBe(1);
  });

  it('keeps a single 0 for all zeros', () => {
    const r = mask('000');
    expect(r.text).toBe('0');
    expect(r.value).toBe(0);
    expect(r.digits).toBe('0');
  });

  it.each(['', 'abc', ' ', '₫', '.,-'])('digit-free input %j gives null', (raw) => {
    expect(maskVndInput(raw)).toEqual({ ok: true, text: '', caret: 0, value: null, digits: '' });
  });

  it('accepts 15 digits', () => {
    const r = mask('999999999999999');
    expect(r.value).toBe(999999999999999);
    expect(r.text).toBe('999.999.999.999.999');
  });

  it.each(['1000000000000000', '12345678901234567890'])('%s is out of range', (raw) => {
    const r = maskVndInput(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('OUT_OF_RANGE');
      expect(r.error.message).toBeTruthy();
      expect(r.error.hint).toBeTruthy();
    }
  });

  it('leading zeros do not count toward the 15 digit limit', () => {
    expect(mask('0001234').value).toBe(1234);
  });

  it.each([0, 5, 999, 1000, 123456, 1250000, 999999999999999])(
    'text equals formatNumber(%i).text',
    (n) => {
      const f = formatNumber(n);
      if (!f.ok) throw new Error(f.error.message);
      expect(mask(String(n)).text).toBe(f.text);
    },
  );
});
