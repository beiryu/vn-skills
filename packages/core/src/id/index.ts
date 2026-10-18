import { fail, type Result } from '../shared/result.js';
import { legacyProvinceByCode, MAPPING, provinceByKey } from '../address/data.js';

export interface CitizenIdProvince {
  code: string;
  name: string;
  fullName: string;
}

export type CitizenIdParsed =
  | { kind: 'cmnd'; normalized: string; warnings: string[] }
  | {
      kind: 'cccd';
      normalized: string;
      /** 3-digit code: "0" + 2-digit GSO province code (legacy 63 provinces). */
      provinceCode: string;
      /** Legacy province, or null when the code is not in the legacy list. */
      province: CitizenIdProvince | null;
      /** The 2025 province the legacy province was merged into. */
      newProvince: CitizenIdProvince | null;
      sex: 'male' | 'female';
      century: number;
      birthYear: number;
      warnings: string[];
    };

const NOT_PROOF = 'Format validity does not prove the identity exists.';

/**
 * Validate and decode a CCCD (12 digits) or check the format of a legacy CMND (9 digits).
 * Rules: Decree 137/2015/NĐ-CP art. 7, Circular 59/2021/TT-BCA appendices I and III. Offline.
 */
export function parseCitizenId(input: string): Result<CitizenIdParsed> {
  const s = String(input ?? '').trim();
  if (!/^\d+$/.test(s))
    return fail(
      'INVALID_FORMAT',
      'ID must contain digits only',
      'Use 12 digits (CCCD) or 9 (CMND).',
    );
  if (s.length === 9) return { ok: true, kind: 'cmnd', normalized: s, warnings: [NOT_PROOF] };
  if (s.length !== 12)
    return fail(
      'INVALID_LENGTH',
      `ID has ${s.length} digits; expected 12 (CCCD) or 9 (CMND)`,
      'Keep leading zeros; store IDs as strings.',
    );

  const provinceCode = s.slice(0, 3);
  const digit = Number(s[3]);
  const century = 1900 + Math.floor(digit / 2) * 100;
  const birthYear = century + Number(s.slice(4, 6));

  const legacy = provinceCode.startsWith('0')
    ? legacyProvinceByCode.get(provinceCode.slice(1))
    : undefined;
  const brief = (p: { code: string; name: string; fullName: string }): CitizenIdProvince => ({
    code: p.code,
    name: p.name,
    fullName: p.fullName,
  });
  const np = legacy ? provinceByKey.get(MAPPING.provinces[legacy.key] ?? '') : undefined;
  const warnings = [NOT_PROOF];
  if (!legacy)
    warnings.push(`Province code ${provinceCode} is not in the legacy 63-province list.`);

  return {
    ok: true,
    kind: 'cccd',
    normalized: s,
    provinceCode,
    province: legacy ? brief(legacy) : null,
    newProvince: np ? brief(np) : null,
    sex: digit % 2 === 0 ? 'male' : 'female',
    century,
    birthYear,
    warnings,
  };
}
