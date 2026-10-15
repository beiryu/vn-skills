export {
  PROVINCES,
  LEGACY_PROVINCES,
  MAPPING,
  DATASET,
  provinceByCode,
  wardByCode,
  type Province,
  type Ward,
  type LegacyProvince,
  type LegacyDistrict,
  type LegacyWard,
} from './data.js';
export {
  parseAddress,
  parseAddress2025,
  parseAddressLegacy,
  type ParsedAddress,
  type ParsedAddress2025,
  type ParsedAddressLegacy,
  type AddressMode,
  type MatchInfo,
} from './parse.js';
export {
  convertAddress,
  type ConvertedAddress,
  type ConvertCandidate,
  type ConvertInput,
} from './convert.js';
export { splitAddress, tokenize, dice, ABBREVIATIONS } from './fuzzy.js';
import { PROVINCES, type Province, type Ward } from './data.js';
import { matchUnit, tokenize, expandAbbreviation } from './fuzzy.js';
import { provinceByKey } from './data.js';

/** Find a current province by name/alias/code. */
export function findProvince(query: string): Province | undefined {
  const q = String(query ?? '').trim();
  if (!q) return undefined;
  if (/^\d{2}$/.test(q)) return PROVINCES.find((p) => p.code === q);
  const t = tokenize(q);
  const abbr = expandAbbreviation(t);
  if (abbr) return provinceByKey.get(abbr);
  return matchUnit(t, PROVINCES, 0.85)[0]?.item;
}

/** Search wards (optionally within a province). Returns up to `limit` matches. */
export function searchWards(
  query: string,
  provinceQuery?: string,
  limit = 10,
): Array<{ ward: Ward; province: Province; score: number }> {
  const t = tokenize(query);
  const provinces = provinceQuery
    ? [findProvince(provinceQuery)].filter((p): p is Province => Boolean(p))
    : PROVINCES;
  const out: Array<{ ward: Ward; province: Province; score: number }> = [];
  for (const p of provinces) {
    for (const c of matchUnit(t, p.wards, 0.75))
      out.push({ ward: c.item, province: p, score: c.score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Format a current address as "street, ward, province". */
export function formatAddress(parts: {
  street?: string;
  ward?: Ward | string;
  province: Province | string;
}): string {
  const w = typeof parts.ward === 'string' ? parts.ward : parts.ward?.fullName;
  const p = typeof parts.province === 'string' ? parts.province : parts.province.fullName;
  return [parts.street, w, p].filter(Boolean).join(', ');
}
