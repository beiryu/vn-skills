import { describe, expect, it } from 'vitest';
import * as core from '@vn-skills/core';
import { MAX_MONEY_DIGITS, moneyToWords } from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

type Parsed = { value: string; negative: boolean; unit: string | null; chan: boolean };
type ParseResult =
  ({ ok: true } & Parsed) | { ok: false; error: { code: string; message: string } };
const wordsToNumber = (t: unknown): ParseResult =>
  (core as unknown as { wordsToNumber: (t: unknown) => ParseResult }).wordsToNumber(t);

interface Case {
  name?: string;
  input?: string;
  roundTrip?: string;
  expected: Record<string, unknown>;
}
const golden = loadGolden<{ wordsToNumber: Case[] }>('vn-money-words');

const words = (n: number | bigint | string, o: core.MoneyToWordsOptions = {}) => {
  const r = moneyToWords(n, o);
  if (!r.ok) throw new Error(r.error.message);
  return r.words;
};

describe('wordsToNumber (golden)', () => {
  it.each(golden.wordsToNumber.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const text = c.input ?? words(c.roundTrip!);
    expect(wordsToNumber(text)).toMatchObject(c.expected);
  });
});

describe('wordsToNumber — export', () => {
  it('is exported from core', () => expect(typeof core.wordsToNumber).toBe('function'));
});

const optionGrid: core.MoneyToWordsOptions[] = [];
for (const thousand of ['nghìn', 'ngàn'] as const)
  for (const odd of ['lẻ', 'linh'] as const)
    for (const useTu of [true, false])
      for (const chan of [true, false])
        for (const capitalize of [true, false])
          for (const unit of ['', 'đồng'])
            optionGrid.push({ thousand, odd, useTu, chan, capitalize, unit });

describe('wordsToNumber — round trip', () => {
  it('0..10000 with default options', () => {
    for (let n = 0; n <= 10000; n++) {
      const r = wordsToNumber(words(n));
      expect(r.ok && r.value).toBe(String(n));
    }
  });
  it('0..10000 with every option combination (sampled)', () => {
    for (const o of optionGrid)
      for (let n = 0; n <= 10000; n += 37) {
        const r = wordsToNumber(words(n, o));
        expect(r.ok && r.value, JSON.stringify([n, o])).toBe(String(n));
      }
  });
  it.each([
    '1000001',
    '1000000000001000',
    '1000000000000000000',
    '123456789012345678901234567890',
    '1000000000000000000000000000000000000',
  ])('large value %s under every option combination', (n) => {
    for (const o of optionGrid) {
      const r = wordsToNumber(words(n, o));
      expect(r.ok && r.value, JSON.stringify(o)).toBe(n);
    }
  });
  it('negative values', () => {
    for (const o of optionGrid)
      for (const n of [-1, -15, -1000000, -1000000000001000]) {
        const r = wordsToNumber(words(n === -1000000000001000 ? BigInt(n) : n, o));
        expect(r).toMatchObject({ ok: true, value: String(-n), negative: true });
      }
  });
});

describe('wordsToNumber — fields', () => {
  it('reads unit', () =>
    expect(wordsToNumber('một triệu hai trăm nghìn đồng')).toMatchObject({
      ok: true,
      value: '1200000',
      negative: false,
      unit: 'đồng',
      chan: false,
    }));
  it('bare number has null unit', () =>
    expect(wordsToNumber('hai mươi mốt')).toMatchObject({ ok: true, value: '21', unit: null }));
  it('reads chẵn', () =>
    expect(wordsToNumber('một triệu đồng chẵn')).toMatchObject({
      ok: true,
      value: '1000000',
      chan: true,
    }));
  it('accepts any trailing non-number word as unit', () =>
    expect(wordsToNumber('năm nghìn dollar')).toMatchObject({
      ok: true,
      value: '5000',
      unit: 'dollar',
    }));
  it('is case-insensitive and tolerant of spaces and commas', () =>
    expect(wordsToNumber('  Một   triệu,  hai trăm nghìn ,đồng ')).toMatchObject({
      ok: true,
      value: '1200000',
    }));
  it('NFC-normalises decomposed input', () =>
    expect(wordsToNumber('một triệu'.normalize('NFD'))).toMatchObject({
      ok: true,
      value: '1000000',
    }));
  it('accepts lăm/năm, mốt, tư/bốn, linh/lẻ, ngàn', () => {
    expect(wordsToNumber('hai mươi lăm')).toMatchObject({ value: '25' });
    expect(wordsToNumber('một trăm linh năm')).toMatchObject({ value: '105' });
    expect(wordsToNumber('ba ngàn bốn trăm')).toMatchObject({ value: '3400' });
  });
  it('accepts âm prefix', () =>
    expect(wordsToNumber('âm năm đồng')).toMatchObject({ ok: true, value: '5', negative: true }));
  it('accepts repeated tỷ scales', () =>
    expect(wordsToNumber(words('1000000000000000000'))).toMatchObject({
      value: '1000000000000000000',
    }));
});

describe('wordsToNumber — errors', () => {
  it.each(['', '   ', ',, ,'])('EMPTY for blank %j', (t) => {
    const r = wordsToNumber(t);
    expect(!r.ok && r.error.code).toBe('EMPTY');
  });
  it.each([null, undefined, 42, {}])('EMPTY for non-string %j', (t) => {
    const r = wordsToNumber(t);
    expect(!r.ok && r.error.code).toBe('EMPTY');
  });
  it('INVALID_WORDS names the first offending word', () => {
    const r = wordsToNumber('một foo hai bar');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('INVALID_WORDS');
      expect(r.error.message).toContain('foo');
    }
  });
  it.each([
    'trăm rưỡi',
    'một trăm năm',
    'hai nghìn một trăm nghìn',
    'nghìn',
    'hai hai',
    'mươi',
    'đồng',
    'một đồng hai',
    'âm âm một',
  ])('INVALID_WORDS for out-of-scope or impossible %j', (t) => {
    const r = wordsToNumber(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(['INVALID_WORDS', 'EMPTY']).toContain(r.error.code);
    if (!r.ok && t !== 'đồng') expect(r.error.code).toBe('INVALID_WORDS');
  });
  it('accepts the maximum MAX_MONEY_DIGITS length', () =>
    expect(wordsToNumber(words('9'.repeat(MAX_MONEY_DIGITS)))).toMatchObject({ ok: true }));
  it('never throws on junk', () => {
    expect(() => wordsToNumber('😀 ¿?')).not.toThrow();
  });
});
