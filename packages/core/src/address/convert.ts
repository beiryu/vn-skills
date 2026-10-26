import { fail, type Result } from '../shared/result.js';
import {
  MAPPING,
  wardByCode,
  provinceByKey,
  type Province,
  type Ward,
  type LegacyProvince,
  type LegacyDistrict,
  type LegacyWard,
} from './data.js';
import { parseAddressLegacy, parseAddress2025, type ParsedAddressLegacy } from './parse.js';

export interface ConvertCandidate {
  ward: Ward;
  province: Province;
  isDefault: boolean;
}

export interface ConvertedAddress {
  input: string;
  old: {
    province?: LegacyProvince;
    district?: LegacyDistrict;
    ward?: LegacyWard;
    street?: string;
    formatted: string;
  };
  new: {
    province: Province;
    ward?: Ward;
    street?: string;
    formatted: string;
  };
  /** 'unchanged' | 'merged' | 'divided' | 'province-only' | 'already-new' */
  mappingType: 'unchanged' | 'merged' | 'divided' | 'province-only' | 'already-new';
  /** All candidate new wards (more than one when the old ward was split). */
  candidates: ConvertCandidate[];
  confidence: number;
  warnings: string[];
}

export interface ConvertInput {
  province: string;
  district?: string;
  ward?: string;
  street?: string;
}

function legacyTextFrom(input: ConvertInput): string {
  return [input.street, input.ward, input.district, input.province].filter(Boolean).join(', ');
}

/**
 * Convert a pre-2025 address (63 provinces, districts) into the post-01/07/2025 structure (34 provinces, no districts).
 * Accepts free text or a structured object. If the text already matches a current ward, it is returned as-is.
 */
export function convertAddress(input: string | ConvertInput): Result<ConvertedAddress> {
  const text = typeof input === 'string' ? input : legacyTextFrom(input);
  const legacy = parseAddressLegacy(text);
  const warnings: string[] = [];

  if (!legacy.ok) {
    // maybe it's already a new-style address
    const cur = parseAddress2025(text);
    if (cur.ok && cur.ward)
      return alreadyNew(text, cur.province!, cur.ward, cur.street, cur.confidence);
    return legacy;
  }

  const l: ParsedAddressLegacy = legacy;
  const oldProvince = l.province!;
  const newProvinceKey = MAPPING.provinces[oldProvince.key];
  const newProvince = newProvinceKey ? provinceByKey.get(newProvinceKey) : undefined;
  if (!newProvince)
    return fail('MAPPING_MISSING', `No province mapping for ${oldProvince.fullName}`);

  const oldFormatted = [l.street, l.ward?.fullName, l.district?.fullName, oldProvince.fullName]
    .filter(Boolean)
    .join(', ');

  let targets: Array<[string, boolean]> | undefined;
  if (l.ward) targets = MAPPING.wards[l.ward.code];
  else if (l.district) {
    const d = MAPPING.districts[l.district.code];
    if (d) targets = [[d, true]];
  }

  if (!targets || targets.length === 0) {
    // Could be a new-style address that the legacy parser partially matched (same ward names exist in both eras).
    const cur = parseAddress2025(text);
    if (cur.ok && cur.ward && cur.matches.ward?.via !== 'fuzzy' && !l.district) {
      return alreadyNew(text, cur.province!, cur.ward, cur.street, cur.confidence);
    }
    warnings.push(
      l.ward
        ? `No ward mapping found for ${l.ward.fullName}; only the province was converted.`
        : 'Ward not recognised; only the province was converted.',
    );
    if (!l.ward && cur.ok && cur.ward && cur.province?.code === newProvince.code) {
      // ward name already valid in the new province (e.g. unchanged ward written with a district)
      return {
        ok: true,
        input: text,
        old: {
          province: oldProvince,
          district: l.district,
          ward: l.ward,
          street: l.street,
          formatted: oldFormatted,
        },
        new: {
          province: newProvince,
          ward: cur.ward,
          street: cur.street,
          formatted: [cur.street, cur.ward.fullName, newProvince.fullName]
            .filter(Boolean)
            .join(', '),
        },
        mappingType: 'unchanged',
        candidates: [{ ward: cur.ward, province: newProvince, isDefault: true }],
        confidence: Math.min(l.confidence, cur.confidence),
        warnings: ['Matched the ward directly in the new catalogue; the district was dropped.'],
      };
    }
    return {
      ok: true,
      input: text,
      old: {
        province: oldProvince,
        district: l.district,
        ward: l.ward,
        street: l.street,
        formatted: oldFormatted,
      },
      new: {
        province: newProvince,
        street: l.street,
        formatted: [l.street, newProvince.fullName].filter(Boolean).join(', '),
      },
      mappingType: 'province-only',
      candidates: [],
      confidence: Math.min(l.confidence, 0.5),
      warnings,
    };
  }

  const candidates: ConvertCandidate[] = targets
    .map(([code, isDefault]) => {
      const hit = wardByCode.get(code);
      return hit ? { ward: hit.ward, province: hit.province, isDefault } : undefined;
    })
    .filter((c): c is ConvertCandidate => Boolean(c));
  const chosen = candidates.find((c) => c.isDefault) ?? candidates[0]!;
  const divided = candidates.length > 1;
  if (divided) {
    warnings.push(
      `${l.ward?.fullName ?? 'This unit'} was split into ${candidates.length} new wards (${candidates.map((c) => c.ward.fullName).join(' / ')}). The default was chosen; verify using the street/house number.`,
    );
  }
  const unchanged =
    !divided &&
    l.ward !== undefined &&
    chosen.ward.key === l.ward.key &&
    chosen.province.code === newProvince.code;
  const street = l.street;
  return {
    ok: true,
    input: text,
    old: {
      province: oldProvince,
      district: l.district,
      ward: l.ward,
      street,
      formatted: oldFormatted,
    },
    new: {
      province: chosen.province,
      ward: chosen.ward,
      street,
      formatted: [street, chosen.ward.fullName, chosen.province.fullName]
        .filter(Boolean)
        .join(', '),
    },
    mappingType: divided ? 'divided' : unchanged ? 'unchanged' : 'merged',
    candidates,
    confidence: divided ? Math.min(l.confidence, 0.7) : l.confidence,
    warnings: [
      ...l.warnings.filter((w) => !w.includes('Ward not') && !w.includes('District not')),
      ...warnings,
    ],
  };
}

function alreadyNew(
  text: string,
  province: Province,
  ward: Ward,
  street: string | undefined,
  confidence: number,
): Result<ConvertedAddress> {
  const formatted = [street, ward.fullName, province.fullName].filter(Boolean).join(', ');
  return {
    ok: true,
    input: text,
    old: { street, formatted: text },
    new: { province, ward, street, formatted },
    mappingType: 'already-new',
    candidates: [{ ward, province, isDefault: true }],
    confidence,
    warnings: ['Input already uses the post-2025 structure; nothing to convert.'],
  };
}

/** Per-row result fields emitted by `convertAddresses` (and so by `address convert-file`). */
export function conversionFields(r: ConvertedAddress) {
  return {
    mappingType: r.mappingType,
    old: {
      province: r.old.province?.fullName,
      district: r.old.district?.fullName,
      ward: r.old.ward?.fullName,
      street: r.old.street,
      formatted: r.old.formatted,
    },
    new: {
      province: { code: r.new.province.code, fullName: r.new.province.fullName },
      ward: r.new.ward && {
        code: r.new.ward.code,
        fullName: r.new.ward.fullName,
        postalCode: r.new.ward.postalCode,
      },
      street: r.new.street,
      formatted: r.new.formatted,
    },
    candidates: r.candidates.map((x) => ({
      code: x.ward.code,
      fullName: x.ward.fullName,
      province: x.province.fullName,
      isDefault: x.isDefault,
    })),
    confidence: r.confidence,
    warnings: r.warnings,
  };
}

export const MAX_BATCH_ADDRESSES = 1000;

export type ConvertBatchRow =
  | ({ index: number; input: unknown; ok: true } & ReturnType<typeof conversionFields>)
  | { index: number; input: unknown; ok: false; error: { code: string; message: string } };

export type ConvertBatchResult =
  | {
      ok: true;
      results: ConvertBatchRow[];
      summary: { total: number; converted: number; failed: number };
    }
  | { ok: false; error: { code: string; message: string; hint?: string } };

/** Convert many free-text old addresses in one call; bad items become per-row errors, never throws. */
export function convertAddresses(inputs: unknown): ConvertBatchResult {
  if (!Array.isArray(inputs))
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'inputs must be an array of address strings',
        hint: 'Pass an array such as ["P. Bến Nghé, Q.1, TP.HCM"].',
      },
    };
  if (inputs.length > MAX_BATCH_ADDRESSES)
    return {
      ok: false,
      error: {
        code: 'TOO_MANY',
        message: `at most ${MAX_BATCH_ADDRESSES} addresses per call, got ${inputs.length}`,
        hint: 'Split the list, or use `vn-skills address convert-file <file>` for larger inputs.',
      },
    };
  let converted = 0;
  const results = inputs.map((input: unknown, index): ConvertBatchRow => {
    if (typeof input !== 'string' || input.trim() === '')
      return {
        index,
        input,
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'address must be a non-empty string' },
      };
    try {
      const r = convertAddress(input);
      if (!r.ok) return { index, input, ok: false, error: r.error };
      converted++;
      return { index, input: r.input, ok: true, ...conversionFields(r) };
    } catch (e) {
      return {
        index,
        input,
        ok: false,
        error: { code: 'INTERNAL', message: (e as Error).message },
      };
    }
  });
  return {
    ok: true,
    results,
    summary: { total: results.length, converted, failed: results.length - converted },
  };
}
