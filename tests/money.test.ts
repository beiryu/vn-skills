import { describe, expect, it } from 'vitest';
import { moneyToWords, numberToWords, type MoneyToWordsOptions } from '@vn-skills/core';
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
  moneyToWordsInvalid: Array<{ name?: string; input: number | string }>;
  numberToWords: WordsCase[];
}>('vn-money-words');

const value = (c: WordsCase) => (c.inputType === 'bigint' ? BigInt(c.input) : c.input);

describe('moneyToWords (golden)', () => {
  it.each(golden.moneyToWords.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const r = moneyToWords(value(c), c.options);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.words).toBe(c.expected);
  });
  it.each(golden.moneyToWordsInvalid.map((c) => [title(c), c] as const))('%s', (_, c) =>
    expect(moneyToWords(c.input).ok).toBe(false),
  );
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
