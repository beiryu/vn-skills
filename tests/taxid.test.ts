import { describe, expect, it } from 'vitest';
import {
  validateTaxId,
  taxIdCheckDigit,
  isValidTaxId,
  formatTaxId,
  normalizeTaxId,
} from '@vn-skills/core';

describe('taxIdCheckDigit', () => {
  it('computes 8 for 010023348', () => expect(taxIdCheckDigit('010023348')).toBe(8));
  it('computes 8 for 031440905', () => expect(taxIdCheckDigit('031440905')).toBe(8));
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

describe('validateTaxId — 10 digits', () => {
  it('accepts 0100233488 (known valid)', () => {
    const r = validateTaxId('0100233488');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe('enterprise');
    expect(r.prefix).toBe('01');
    expect(r.checksumValid).toBe(true);
  });
  it('accepts 0314409058 (known valid)', () => expect(isValidTaxId('0314409058')).toBe(true));
  it('rejects wrong check digit 0100233480', () => {
    const r = validateTaxId('0100233480');
    expect(!r.ok && r.error.code).toBe('INVALID_CHECKSUM');
  });
  it('rejects all-zero sequence', () => {
    const r = validateTaxId('0100000000');
    expect(!r.ok && r.error.code).toBe('INVALID_SEQUENCE');
  });
  it('rejects 9 digits', () => expect(!validateTaxId('010023348').ok).toBe(true));
  it('rejects 11 digits', () => expect(!validateTaxId('01002334880').ok).toBe(true));
  it('rejects letters', () => {
    const r = validateTaxId('01002334A8');
    expect(!r.ok && r.error.code).toBe('INVALID_FORMAT');
  });
  it('rejects empty', () => expect(validateTaxId('').ok).toBe(false));
  it('accepts spaces and dots', () => expect(isValidTaxId(' 0100 233 488 ')).toBe(true));
  it('accepts dotted form 0100.233.488', () => expect(isValidTaxId('0100.233.488')).toBe(true));
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
});

describe('validateTaxId — 13 digits (branch)', () => {
  it('accepts 0100233488-001', () => {
    const r = validateTaxId('0100233488-001');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe('branch');
    expect(r.root).toBe('0100233488');
    expect(r.branch).toBe('001');
    expect(r.formatted).toBe('0100233488-001');
    expect(r.normalized).toBe('0100233488001');
  });
  it('accepts 13 digits without dash', () => expect(validateTaxId('0100233488002').ok).toBe(true));
  it('accepts en-dash separator', () => expect(validateTaxId('0100233488–003').ok).toBe(true));
  it('rejects branch 000', () => {
    const r = validateTaxId('0100233488-000');
    expect(!r.ok && r.error.code).toBe('INVALID_BRANCH');
  });
  it('rejects branch with bad root checksum', () => {
    expect(validateTaxId('0100233480-001').ok).toBe(false);
  });
  it('rejects a dashed form that is not 10-3', () => {
    expect(validateTaxId('0100233488-01').ok).toBe(false);
    expect(validateTaxId('01002334880-01').ok).toBe(false);
    expect(validateTaxId('010023348-8001').ok).toBe(false);
  });
});

describe('validateTaxId — personal ID', () => {
  it('accepts 12-digit CCCD as personal tax id with format-only check', () => {
    const r = validateTaxId('079123456789');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kind).toBe('personal-id');
    expect(r.checksumValid).toBeNull();
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('helpers', () => {
  it('formatTaxId adds dash for 13 digits', () =>
    expect(formatTaxId('0100233488001')).toBe('0100233488-001'));
  it('formatTaxId leaves 10 digits alone', () =>
    expect(formatTaxId('0100233488')).toBe('0100233488'));
  it('normalizeTaxId strips separators', () =>
    expect(normalizeTaxId('0100-233.488')).toBe('0100233488'));
  it('normalizeTaxId returns null on letters', () =>
    expect(normalizeTaxId('MST 0100233488')).toBeNull());
});
