import { describe, expect, it } from 'vitest';
import {
  MAX_MONEY_DIGITS,
  moneyToWords,
  numberToWords,
  type MoneyToWordsOptions,
} from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

interface WordsCase {
  name?: string;
  input: number | string;
  inputType?: 'bigint';
  options?: MoneyToWordsOptions;
  expected: string;
}

const golden = loadGolden<{
  moneyToWords: WordsCase[];
  moneyToWordsInvalid: Array<{
    name?: string;
    input: number | string;
    prefix?: string;
    repeat?: number;
  }>;
  numberToWords: WordsCase[];
}>('vn-money-words');

const value = (c: WordsCase) => (c.inputType === 'bigint' ? BigInt(c.input) : c.input);

describe('moneyToWords (golden)', () => {
  it.each(golden.moneyToWords.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const r = moneyToWords(value(c), c.options);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.words).toBe(c.expected);
  });
  it.each(golden.moneyToWordsInvalid.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const input = c.repeat ? `${c.prefix ?? ''}${String(c.input).repeat(c.repeat)}` : c.input;
    const r = moneyToWords(input);
    expect(r.ok).toBe(false);
    if (!r.ok && c.repeat) expect(r.error.code).toBe('INVALID_AMOUNT');
  });
});

describe('numberToWords (golden)', () => {
  it.each(golden.numberToWords.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const r = numberToWords(value(c), c.options);
    expect(r.ok && r.words).toBe(c.expected);
  });
});

describe('moneyToWords — non-JSON inputs', () => {
  it('rejects NaN/Infinity', () => {
    expect(moneyToWords(NaN).ok).toBe(false);
    expect(moneyToWords(Infinity).ok).toBe(false);
  });
  it('rejects unsafe number', () => expect(moneyToWords(2 ** 60).ok).toBe(false));
});

describe('moneyToWords — digit limit', () => {
  const expectTooLong = (r: ReturnType<typeof moneyToWords>) => {
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_AMOUNT');
    expect(r.error.hint).toContain(String(MAX_MONEY_DIGITS));
  };
  it('accepts exactly the limit', () =>
    expect(moneyToWords('9'.repeat(MAX_MONEY_DIGITS)).ok).toBe(true));
  it('rejects limit + 1 quickly', () => {
    const t = Date.now();
    expectTooLong(moneyToWords('9'.repeat(MAX_MONEY_DIGITS + 1)));
    expect(Date.now() - t).toBeLessThan(1000);
  });
  it('rejects 200000 digits without crashing', () =>
    expectTooLong(moneyToWords('9'.repeat(200000))));
  it('rejects bigint over the limit', () =>
    expectTooLong(moneyToWords(10n ** BigInt(MAX_MONEY_DIGITS))));
  it('rejects negative bigint over the limit', () =>
    expectTooLong(moneyToWords(-(10n ** BigInt(MAX_MONEY_DIGITS)))));
  it('does not count the minus sign', () => {
    expect(moneyToWords('-' + '9'.repeat(MAX_MONEY_DIGITS)).ok).toBe(true);
    expectTooLong(moneyToWords('-' + '9'.repeat(MAX_MONEY_DIGITS + 1)));
  });
  it('numberToWords has the same limit', () =>
    expectTooLong(numberToWords('9'.repeat(MAX_MONEY_DIGITS + 1))));
});
