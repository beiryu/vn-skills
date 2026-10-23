import { describe, expect, it } from 'vitest';
import {
  validateTaxId,
  taxIdCheckDigit,
  isValidTaxId,
  formatTaxId,
  normalizeTaxId,
} from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

interface Case<E> {
  name?: string;
  input: string;
  expected: E;
}

const golden = loadGolden<{
  taxIdCheckDigit: Case<number | null>[];
  validateTaxId: Case<Record<string, unknown>>[];
  isValidTaxId: Case<boolean>[];
  formatTaxId: Case<string>[];
  normalizeTaxId: Case<string | null>[];
}>('vn-tax-id');

const cases = <E>(list: Case<E>[]) => list.map((c) => [title(c), c] as const);

describe('golden fixtures', () => {
  it.each(cases(golden.taxIdCheckDigit))('taxIdCheckDigit %s', (_, c) =>
    expect(taxIdCheckDigit(c.input)).toBe(c.expected),
  );
  it.each(cases(golden.validateTaxId))('validateTaxId: %s', (_, c) =>
    expect(validateTaxId(c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.isValidTaxId))('isValidTaxId: %s', (_, c) =>
    expect(isValidTaxId(c.input)).toBe(c.expected),
  );
  it.each(cases(golden.formatTaxId))('formatTaxId: %s', (_, c) =>
    expect(formatTaxId(c.input)).toBe(c.expected),
  );
  it.each(cases(golden.normalizeTaxId))('normalizeTaxId: %s', (_, c) =>
    expect(normalizeTaxId(c.input)).toBe(c.expected),
  );
});

describe('taxIdCheckDigit', () => {
  it('returns null when the algorithm yields 10', () => {
    // find a 9-digit sequence with sum % 11 === 0
    let found: string | undefined;
    for (let n = 100000000; n < 100001000; n++) {
      if (taxIdCheckDigit(String(n)) === null) {
        found = String(n);
        break;
      }
    }
    expect(found).toBeDefined();
    expect(validateTaxId(found + '0').ok).toBe(false);
  });
  it('throws on wrong length', () => expect(() => taxIdCheckDigit('123')).toThrow());
});

describe('validateTaxId', () => {
  it.each(['', '   ', null, undefined])('returns EMPTY with a hint for %j', (v) => {
    const r = validateTaxId(v as unknown as string);
    expect(r).toMatchObject({ ok: false, error: { code: 'EMPTY' } });
    if (!r.ok) {
      expect(r.error.message).not.toMatch(/non-digit/);
      expect(r.error.hint).toMatch(/10 digits|10-digit/);
    }
  });
  it('keeps INVALID_FORMAT for letters', () => {
    expect(validateTaxId('abc')).toMatchObject({ ok: false, error: { code: 'INVALID_FORMAT' } });
  });
  it('each single-digit typo in a valid ID is caught', () => {
    const valid = '0100233488';
    let caught = 0;
    for (let i = 0; i < 10; i++) {
      const d = (Number(valid[i]) + 1) % 10;
      const typo = valid.slice(0, i) + d + valid.slice(i + 1);
      if (!isValidTaxId(typo)) caught++;
    }
    expect(caught).toBe(10);
  });
  it('warns that a 12-digit personal ID is format-checked only', () => {
    const r = validateTaxId('079123456789');
    expect(r.ok && r.warnings.length).toBeGreaterThan(0);
  });
});
