import { describe, expect, it } from 'vitest';
import { MAX_MONEY_DIGITS, moneyToWords, wordsToNumber } from '@vn-skills/core';

describe('wordsToNumber digit limit', () => {
  it('rejects MAX_MONEY_DIGITS + 1 digits', () => {
    const w = moneyToWords('9'.repeat(MAX_MONEY_DIGITS));
    expect(w.ok).toBe(true);
    const r = wordsToNumber(`một ${'tỷ '.repeat(Math.ceil(MAX_MONEY_DIGITS / 9) + 1)}`);
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_AMOUNT' } });
  });
  it('rejects many repeated tỷ quickly without throwing', () => {
    const t0 = Date.now();
    const r = wordsToNumber(`một ${'tỷ '.repeat(100000)}`);
    expect(r.ok).toBe(false);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});
