import { fail, type Result } from '../shared/result.js';

/** Weights applied to the first 9 digits of a Vietnamese tax ID (mã số thuế). */
export const TAX_ID_WEIGHTS = [31, 29, 23, 19, 17, 13, 7, 5, 3] as const;

export type TaxIdKind = 'enterprise' | 'branch' | 'personal-id';

export interface TaxIdInfo {
  /** Digits only, e.g. 0100233488001 */
  normalized: string;
  /** Display form, e.g. 0100233488-001 */
  formatted: string;
  kind: TaxIdKind;
  /** The 10-digit root tax ID (for enterprise/branch). */
  root?: string;
  /** 3-digit branch suffix when kind === 'branch'. */
  branch?: string;
  /** 2-digit province/authority prefix (N1N2) for enterprise/branch IDs. */
  prefix?: string;
  /** true when the check digit is valid, null when the format has no check digit (personal-id). */
  checksumValid: boolean | null;
  warnings: string[];
}

/**
 * Compute the 10th (check) digit of a tax ID from its first 9 digits.
 * Returns null when the algorithm yields 10 (such a sequence cannot be a valid tax ID).
 */
export function taxIdCheckDigit(first9: string): number | null {
  if (!/^\d{9}$/.test(first9)) throw new Error('taxIdCheckDigit expects exactly 9 digits');
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(first9[i]) * TAX_ID_WEIGHTS[i]!;
  const check = 10 - (sum % 11);
  return check === 10 ? null : check;
}

/** Check-digit computation with input validation, returned in the ok/error result shape. */
export function taxIdCheckDigitResult(
  first9: string,
): Result<{ first9: string; checkDigit: number | null; taxId: string | null }> {
  if (!/^\d{9}$/.test(first9)) return fail('INVALID_FORMAT', 'Expected exactly 9 digits');
  const checkDigit = taxIdCheckDigit(first9);
  return { ok: true, first9, checkDigit, taxId: checkDigit === null ? null : first9 + checkDigit };
}

/** Strip spaces, dots, dashes and underscores. Keeps digits only. Returns null when other characters are present. */
export function normalizeTaxId(input: string): string | null {
  const stripped = String(input ?? '')
    .trim()
    .replace(/[\s.\-–_]/g, '');
  return /^\d+$/.test(stripped) ? stripped : null;
}

export function formatTaxId(digits: string): string {
  return digits.length === 13 ? `${digits.slice(0, 10)}-${digits.slice(10)}` : digits;
}

/**
 * Validate a Vietnamese tax ID offline.
 * - 10 digits: enterprise / organisation / household (N1N2 prefix + 7-digit sequence + check digit)
 * - 13 digits: dependent unit / branch (10-digit root + 3-digit suffix, suffix != 000)
 * - 12 digits: personal identification number (CCCD) used as the individual's tax ID since 01/07/2025.
 *   Only the format is checked; CCCD has no public check digit.
 * No network calls are made; a valid result does not prove the ID is registered with the tax authority.
 */
export function validateTaxId(input: string): Result<TaxIdInfo> {
  if (input == null || String(input).trim() === '') {
    return fail(
      'EMPTY',
      'Tax ID is empty',
      'Provide a 10-digit tax ID, a 13-digit branch tax ID (10-3 with a dash, e.g. 0100233488-001), or a 12-digit personal ID.',
    );
  }
  const digits = normalizeTaxId(input);
  if (digits === null) {
    return fail(
      'INVALID_FORMAT',
      `Tax ID "${input}" contains non-digit characters`,
      'Only digits, spaces, dots, dashes and underscores are accepted.',
    );
  }
  const warnings: string[] = [];
  // A dash means "root-branch": enforce the 10-3 split so "0100233488-01" is not mistaken for a 12-digit personal ID.
  const dashed = /^\s*(\d[\d\s.]*)[-–_]\s*(\d+)\s*$/.exec(String(input ?? ''));
  if (dashed) {
    const root = dashed[1]!.replace(/[\s.]/g, '');
    const suffix = dashed[2]!;
    if (root.length !== 10 || suffix.length !== 3) {
      return fail(
        'INVALID_LENGTH',
        `Branch tax IDs must be 10 digits, a dash, then 3 digits (got ${root.length}-${suffix.length})`,
        'Example: 0100233488-001',
      );
    }
  }

  if (digits.length === 12) {
    return {
      ok: true,
      normalized: digits,
      formatted: digits,
      kind: 'personal-id',
      checksumValid: null,
      warnings: [
        'A 12-digit number is treated as a personal identification number (CCCD) used as an individual tax ID from 01/07/2025. Only the length was checked.',
      ],
    };
  }
  if (digits.length !== 10 && digits.length !== 13) {
    return fail(
      'INVALID_LENGTH',
      `Tax ID must have 10 or 13 digits, got ${digits.length}`,
      'Enterprise IDs have 10 digits; branches have 10 + 3 digits (e.g. 0100233488-001).',
    );
  }
  const root = digits.slice(0, 10);
  const prefix = root.slice(0, 2);
  const sequence = root.slice(2, 9);
  if (sequence === '0000000') {
    return fail('INVALID_SEQUENCE', 'Sequence digits 3-9 cannot all be zero');
  }
  const expected = taxIdCheckDigit(root.slice(0, 9));
  const actual = Number(root[9]);
  if (expected === null || expected !== actual) {
    return fail(
      'INVALID_CHECKSUM',
      `Check digit ${actual} does not match the expected value${expected === null ? ' (sequence cannot be valid)' : ` ${expected}`}`,
      'The 10th digit is a checksum of the first 9 digits (weights 31,29,23,19,17,13,7,5,3 mod 11). Re-check for typos.',
    );
  }
  if (digits.length === 13) {
    const branch = digits.slice(10);
    if (branch === '000')
      return fail('INVALID_BRANCH', 'Branch suffix cannot be 000', 'Branch suffixes start at 001.');
    return {
      ok: true,
      normalized: digits,
      formatted: formatTaxId(digits),
      kind: 'branch',
      root,
      branch,
      prefix,
      checksumValid: true,
      warnings,
    };
  }
  return {
    ok: true,
    normalized: digits,
    formatted: digits,
    kind: 'enterprise',
    root,
    prefix,
    checksumValid: true,
    warnings,
  };
}

/** Convenience boolean wrapper. */
export function isValidTaxId(input: string): boolean {
  const r = validateTaxId(input);
  return r.ok && r.checksumValid !== false;
}
