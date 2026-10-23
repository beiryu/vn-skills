import { fail, type Result } from '../shared/result.js';
import { LEGACY_PROVINCES, MAPPING, provinceByKey } from '../address/data.js';
import { AREA_CODES, MOBILE_CARRIERS, OLD_MOBILE_PREFIXES } from './prefixes.js';

export { AREA_CODES, MOBILE_CARRIERS, OLD_MOBILE_PREFIXES } from './prefixes.js';

export interface PhoneInfo {
  type: 'mobile' | 'landline';
  /** National form, e.g. 0912345678 */
  national: string;
  /** Display form, e.g. 0912 345 678 */
  formatted: string;
  e164: string;
  /** Original carrier of the prefix (number portability may have moved the subscriber). */
  carrier?: string;
  areaCode?: string;
  /** Legacy (pre-2025) province of the area code. */
  province?: string;
  /** 2025 province the legacy province was merged into. */
  province2025?: string;
  /** Set when a pre-2018 11-digit mobile number was converted. */
  convertedFrom?: string;
  /** Notes about input that was silently corrected. */
  warnings?: string[];
}

const CARRIER_BY_PREFIX = new Map<string, string>();
for (const [carrier, prefixes] of Object.entries(MOBILE_CARRIERS))
  for (const p of prefixes) CARRIER_BY_PREFIX.set(p, carrier);

// The legacy dataset names the province "Huế"; the numbering plan says "Thừa Thiên Huế".
const LEGACY_NAME_ALIASES: Record<string, string> = { 'Thừa Thiên Huế': 'Huế' };

function province2025(legacyName: string): string | undefined {
  const name = LEGACY_NAME_ALIASES[legacyName] ?? legacyName;
  const legacy = LEGACY_PROVINCES.find((p) => p.name === name);
  const key = legacy && MAPPING.provinces[legacy.key];
  return key ? provinceByKey.get(key)?.name : undefined;
}

/** Normalise and classify a Vietnamese phone number offline. */
export function parsePhone(input: string): Result<PhoneInfo> {
  const raw = String(input ?? '').trim();
  if (!raw) {
    return fail(
      'EMPTY',
      'Phone number is empty',
      'Pass a phone number, e.g. 0912345678 or +84912345678.',
    );
  }
  if (!/^\+?[\d\s.\-()+]+$/.test(raw) || /.\+/.test(raw.replace(/^\(\+/, '').replace(/^\+/, ''))) {
    return fail(
      'INVALID_FORMAT',
      'Phone number may only contain digits, spaces, . - ( ) and a leading +',
      'Remove letters and symbols; use 10 digits starting with 0, or +84 followed by 9 digits.',
    );
  }
  let digits = raw.replace(/\D/g, '');
  const warnings: string[] = [];
  if (digits.startsWith('84')) {
    digits = digits.slice(2);
    if (digits.startsWith('0')) warnings.push('Removed the extra 0 after the country code 84.');
    else digits = '0' + digits;
  }
  if (!digits.startsWith('0')) {
    return fail(
      'INVALID_FORMAT',
      'Expected a number starting with 0, 84 or +84',
      'Use 10 digits starting with 0, or +84 followed by 9 digits.',
    );
  }

  let convertedFrom: string | undefined;
  if (digits.length === 11) {
    const next = OLD_MOBILE_PREFIXES[digits.slice(0, 4)];
    if (next) {
      convertedFrom = digits;
      digits = next + digits.slice(4);
    }
  }
  const e164 = '+84' + digits.slice(1);

  if (digits.length === 10) {
    const carrier = CARRIER_BY_PREFIX.get(digits.slice(0, 3));
    if (!carrier && digits.startsWith('02'))
      return fail(
        'INVALID_LENGTH',
        'Landline numbers have 11 digits including the leading 0',
        'Landline numbers have 11 digits including the leading 0, e.g. 02812345678.',
      );
    if (!carrier)
      return fail(
        'UNKNOWN_PREFIX',
        `Unknown mobile prefix ${digits.slice(0, 3)}`,
        'Check the first three digits against a valid mobile prefix.',
      );
    return {
      ok: true,
      type: 'mobile',
      national: digits,
      formatted: `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`,
      e164,
      carrier,
      ...(convertedFrom ? { convertedFrom } : {}),
      ...(warnings.length ? { warnings } : {}),
    };
  }
  if (digits.length === 11) {
    const areaCode = [digits.slice(0, 3), digits.slice(0, 4)].find((c) => c in AREA_CODES);
    if (!areaCode)
      return fail(
        'UNKNOWN_PREFIX',
        `Unknown area code or prefix ${digits.slice(0, 4)}`,
        'Check the area code or prefix at the start of the number.',
      );
    const rest = digits.slice(areaCode.length);
    const split = rest.length === 8 ? 4 : 3;
    const province = AREA_CODES[areaCode]!;
    return {
      ok: true,
      type: 'landline',
      national: digits,
      formatted: `${areaCode} ${rest.slice(0, split)} ${rest.slice(split)}`,
      e164,
      areaCode,
      province,
      province2025: province2025(province),
      ...(warnings.length ? { warnings } : {}),
    };
  }
  return fail(
    'INVALID_LENGTH',
    `Expected 10 digits (mobile) or 11 digits (landline), got ${digits.length}`,
    'Use 10 digits (mobile) or 11 digits (landline) starting with 0, or the same without the 0 after +84.',
  );
}
