import type { Result } from '../shared/result.js';
import { LEGACY_PROVINCES, MAPPING, provinceByKey } from '../address/data.js';
import { parsePhoneWith, type PhoneInfo } from './parse.js';

export { AREA_CODES, MOBILE_CARRIERS, OLD_MOBILE_PREFIXES } from './prefixes.js';
export type { PhoneInfo } from './parse.js';

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
  return parsePhoneWith(input, province2025);
}
