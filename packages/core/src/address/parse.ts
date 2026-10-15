import { fail, type Result } from '../shared/result.js';
import {
  PROVINCES,
  LEGACY_PROVINCES,
  type Province,
  type Ward,
  type LegacyProvince,
  type LegacyDistrict,
  type LegacyWard,
  provinceByKey,
  legacyProvinceByKey,
} from './data.js';
import {
  expandAbbreviation,
  matchUnit,
  splitAddress,
  tokenize,
  type Candidate,
  type Token,
} from './fuzzy.js';

export type AddressMode = 'from2025' | 'legacy' | 'auto';

export interface MatchInfo {
  score: number;
  via: 'exact' | 'alias' | 'fuzzy' | 'abbreviation';
  /** Other plausible candidates when the match was ambiguous. */
  alternatives?: string[];
}

export interface ParsedAddress2025 {
  mode: 'from2025';
  province?: Province;
  ward?: Ward;
  street?: string;
  /** Normalised "street, ward, province" text. */
  formatted: string;
  matches: { province?: MatchInfo; ward?: MatchInfo };
  /** 0..1 overall confidence. */
  confidence: number;
  warnings: string[];
}

export interface ParsedAddressLegacy {
  mode: 'legacy';
  province?: LegacyProvince;
  district?: LegacyDistrict;
  ward?: LegacyWard;
  street?: string;
  formatted: string;
  matches: { province?: MatchInfo; district?: MatchInfo; ward?: MatchInfo };
  confidence: number;
  warnings: string[];
}

export type ParsedAddress = ParsedAddress2025 | ParsedAddressLegacy;

function info<T extends { fullName: string }>(
  c: Candidate<T>[],
  viaOverride?: MatchInfo['via'],
): MatchInfo {
  const best = c[0]!;
  return {
    score: best.score,
    via: viaOverride ?? best.via,
    alternatives: c.length > 1 ? c.slice(1).map((x) => x.item.fullName) : undefined,
  };
}

/** Try to find a province in the given tokens scanning from the end. Returns index used. */
function findProvince<T extends Province | LegacyProvince>(
  tokens: Token[],
  provinces: readonly T[],
  byKey: Map<string, T>,
): { province: T; index: number; match: MatchInfo } | undefined {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!;
    const abbr = expandAbbreviation(t);
    if (abbr) {
      const p = byKey.get(abbr);
      if (p) return { province: p, index: i, match: { score: 0.97, via: 'abbreviation' } };
    }
    const c = matchUnit(t, provinces, 0.85);
    if (c.length) return { province: c[0]!.item, index: i, match: info(c) };
  }
  return undefined;
}

/**
 * Scan a free-text address (no commas) for a province keyword at the end, returning the remaining text.
 * Used as a fallback when the address has no separators.
 */
function stripTrailingUnit<T extends { key: string; keys: string[]; fullName: string }>(
  norm: string,
  units: readonly T[],
  minLen = 3,
): { unit: T; rest: string; via: 'exact' | 'alias' } | undefined {
  const compact = norm.replace(/\s+/g, '');
  let best: { unit: T; len: number; via: 'exact' | 'alias' } | undefined;
  for (const u of units) {
    const candidates: Array<[string, 'exact' | 'alias']> = [
      [u.key, 'exact'],
      ...u.keys.map((k) => [k, 'alias'] as [string, 'alias']),
    ];
    for (const [k, via] of candidates) {
      if (k.length < minLen) continue;
      if (compact.endsWith(k) && (!best || k.length > best.len))
        best = { unit: u, len: k.length, via };
    }
  }
  if (!best) return undefined;
  // remove the matched tail from the spaced string
  let remaining = best.len;
  let i = norm.length;
  while (i > 0 && remaining > 0) {
    i--;
    if (norm[i] !== ' ') remaining--;
  }
  let rest = norm.slice(0, i).trim();
  rest = rest
    .replace(/\b(thanh pho|tinh|tp|t|quan|q|huyen|h|thi xa|tx|thi tran|tt|phuong|p|xa|x)$/i, '')
    .trim();
  return { unit: best.unit, rest, via: best.via };
}

export interface ParseOptions {
  mode?: AddressMode;
}

export function parseAddress2025(text: string): Result<ParsedAddress2025> {
  const input = String(text ?? '').trim();
  if (!input) return fail('EMPTY', 'Address is empty');
  const warnings: string[] = [];
  const parts = splitAddress(input);
  const tokens = parts.map(tokenize);

  let province: Province | undefined;
  let ward: Ward | undefined;
  const matches: ParsedAddress2025['matches'] = {};
  let consumed = new Set<number>();

  const pf = findProvince(tokens, PROVINCES, provinceByKey);
  if (pf) {
    province = pf.province;
    matches.province = pf.match;
    consumed.add(pf.index);
  }

  if (province) {
    // ward: scan tokens before the province from the end
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (consumed.has(i)) continue;
      const t = tokens[i]!;
      if (t.prefix && !['phuong', 'xa', 'thitran', 'dackhu'].includes(t.prefix)) {
        // old-style district token: skip but remember
        if (['quan', 'huyen', 'thixa'].includes(t.prefix)) {
          warnings.push(
            `"${t.raw}" looks like a pre-2025 district; districts no longer exist. Use convertAddress() for legacy addresses.`,
          );
          consumed.add(i);
        }
        continue;
      }
      const c = matchUnit(t, province.wards, 0.82);
      if (c.length) {
        ward = c[0]!.item;
        matches.ward = info(c);
        consumed.add(i);
        break;
      }
    }
  }

  // fallback for addresses without separators: "12 Nguyen Hue Ben Nghe Ho Chi Minh"
  if (!province && tokens.length === 1) {
    const t = tokens[0]!;
    const hit = stripTrailingUnit(t.norm, PROVINCES, 4);
    if (hit) {
      province = hit.unit;
      matches.province = { score: 0.9, via: hit.via };
      let rest = hit.rest;
      const wh = stripTrailingUnit(rest, province.wards, 4);
      if (wh) {
        ward = wh.unit;
        matches.ward = { score: 0.85, via: wh.via };
        rest = wh.rest;
      }
      const street = rest.trim() || undefined;
      return finish2025(province, ward, street, matches, warnings, input);
    }
  }

  if (!province) {
    return fail(
      'PROVINCE_NOT_FOUND',
      `Could not find a province in "${input}"`,
      'Write the province/city last, e.g. "..., Phường Sài Gòn, TP. Hồ Chí Minh".',
    );
  }
  const street = parts.filter((_, i) => !consumed.has(i)).join(', ') || undefined;
  return finish2025(province, ward, street, matches, warnings, input);
}

function finish2025(
  province: Province,
  ward: Ward | undefined,
  street: string | undefined,
  matches: ParsedAddress2025['matches'],
  warnings: string[],
  input: string,
): Result<ParsedAddress2025> {
  if (!ward) warnings.push('Ward not recognised; only the province was matched.');
  const confidence = Math.min(
    matches.province?.score ?? 0,
    ward ? (matches.ward?.score ?? 0) : 0.6,
  );
  const formatted = [street, ward?.fullName, province.fullName].filter(Boolean).join(', ');
  return {
    ok: true,
    mode: 'from2025',
    province,
    ward,
    street,
    formatted,
    matches,
    confidence,
    warnings,
  };
}

export function parseAddressLegacy(text: string): Result<ParsedAddressLegacy> {
  const input = String(text ?? '').trim();
  if (!input) return fail('EMPTY', 'Address is empty');
  const warnings: string[] = [];
  const parts = splitAddress(input);
  const tokens = parts.map(tokenize);
  const matches: ParsedAddressLegacy['matches'] = {};
  const consumed = new Set<number>();

  let province: LegacyProvince | undefined;
  let district: LegacyDistrict | undefined;
  let ward: LegacyWard | undefined;

  const pf = findProvince(tokens, LEGACY_PROVINCES, legacyProvinceByKey);
  if (pf) {
    province = pf.province;
    matches.province = pf.match;
    consumed.add(pf.index);
  }
  if (!province && tokens.length === 1) {
    const t = tokens[0]!;
    const hit = stripTrailingUnit(t.norm, LEGACY_PROVINCES, 4);
    if (hit) {
      province = hit.unit;
      matches.province = { score: 0.9, via: hit.via };
      let rest = hit.rest;
      const dh = stripTrailingUnit(rest, province.districts, 4);
      if (dh) {
        district = dh.unit;
        matches.district = { score: 0.85, via: dh.via };
        rest = dh.rest;
        const wh = stripTrailingUnit(rest, district.wards, 4);
        if (wh) {
          ward = wh.unit;
          matches.ward = { score: 0.85, via: wh.via };
          rest = wh.rest;
        }
      }
      return finishLegacy(province, district, ward, rest.trim() || undefined, matches, warnings);
    }
  }
  if (!province) {
    return fail(
      'PROVINCE_NOT_FOUND',
      `Could not find a (pre-2025) province in "${input}"`,
      'Write the province/city last.',
    );
  }

  // district: prefer tokens with quan/huyen/thixa/thanhpho prefix, scanning from the end
  const remaining = () => tokens.map((t, i) => [t, i] as const).filter(([, i]) => !consumed.has(i));
  for (const [t, i] of [...remaining()].reverse()) {
    if (t.prefix && ['phuong', 'xa', 'thitran'].includes(t.prefix)) continue;
    const c = matchUnit(t, province.districts, 0.85);
    if (c.length) {
      district = c[0]!.item;
      matches.district = info(c);
      consumed.add(i);
      break;
    }
  }
  const wardPool: LegacyWard[] = district
    ? district.wards
    : province.districts.flatMap((d) => d.wards);
  for (const [t, i] of [...remaining()].reverse()) {
    if (t.prefix && ['quan', 'huyen', 'thixa', 'thanhpho', 'tinh'].includes(t.prefix)) continue;
    const c = matchUnit(t, wardPool, 0.85);
    if (c.length) {
      ward = c[0]!.item;
      matches.ward = info(c);
      consumed.add(i);
      if (!district) {
        const d = province.districts.find((dd) => dd.wards.includes(ward!));
        if (d) {
          district = d;
          matches.district = { score: 0.8, via: 'alias' };
        }
      }
      break;
    }
  }
  const street = parts.filter((_, i) => !consumed.has(i)).join(', ') || undefined;
  return finishLegacy(province, district, ward, street, matches, warnings);
}

function finishLegacy(
  province: LegacyProvince,
  district: LegacyDistrict | undefined,
  ward: LegacyWard | undefined,
  street: string | undefined,
  matches: ParsedAddressLegacy['matches'],
  warnings: string[],
): Result<ParsedAddressLegacy> {
  if (!district) warnings.push('District not recognised.');
  if (!ward) warnings.push('Ward not recognised.');
  const scores = [
    matches.province?.score ?? 0,
    district ? (matches.district?.score ?? 0) : 0.5,
    ward ? (matches.ward?.score ?? 0) : 0.5,
  ];
  const confidence = Math.min(...scores);
  const formatted = [street, ward?.fullName, district?.fullName, province.fullName]
    .filter(Boolean)
    .join(', ');
  return {
    ok: true,
    mode: 'legacy',
    province,
    district,
    ward,
    street,
    formatted,
    matches,
    confidence,
    warnings,
  };
}

/**
 * Parse an address. mode 'auto' (default) tries the current 34-province catalogue first and falls back to the
 * pre-2025 catalogue when a district is present or the ward is unknown.
 */
export function parseAddress(text: string, options: ParseOptions = {}): Result<ParsedAddress> {
  const mode = options.mode ?? 'auto';
  if (mode === 'from2025') return parseAddress2025(text);
  if (mode === 'legacy') return parseAddressLegacy(text);
  const current = parseAddress2025(text);
  const legacy = parseAddressLegacy(text);
  if (current.ok && current.ward && !current.warnings.some((w) => w.includes('district')))
    return current;
  if (legacy.ok && legacy.ward && legacy.district) return legacy;
  if (current.ok && current.ward) return current;
  if (legacy.ok && (legacy.district || legacy.ward)) return legacy;
  return current.ok ? current : legacy;
}
