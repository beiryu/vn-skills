import {
  MAPPING,
  legacyWardByCode,
  wardByCode,
  type LegacyDistrict,
  type LegacyProvince,
  type LegacyWard,
  type Province,
  type Ward,
} from './data.js';
import { findProvince, searchWards } from './index.js';
import { fail, type Result } from '../shared/result.js';

interface Unit {
  code: string;
  name: string;
  fullName: string;
}
export interface FormerUnit {
  ward: Unit;
  district: Unit;
  province: Unit;
  /** The flag from the mapping tuple, as read by `convertAddress`. */
  isDefault: boolean;
  /** Other new wards of an old ward that was split. */
  otherNewWards?: Unit[];
}
export interface FormerUnitsResult {
  ward: Unit;
  province: Unit;
  former: FormerUnit[];
}

let reverseIndex:
  Map<string, Array<{ old: string; isDefault: boolean; all: string[] }>> | undefined;

function reverse() {
  if (reverseIndex) return reverseIndex;
  reverseIndex = new Map();
  for (const [old, targets] of Object.entries(MAPPING.wards))
    for (const [code, isDefault] of targets) {
      const list = reverseIndex.get(code) ?? [];
      list.push({ old, isDefault, all: targets.map((t) => t[0]) });
      reverseIndex.set(code, list);
    }
  return reverseIndex;
}

const unit = (u: Ward | Province | LegacyWard | LegacyDistrict | LegacyProvince): Unit => ({
  code: u.code,
  name: u.name,
  fullName: u.fullName,
});

/** List the pre-2025 wards that became (part of) a current ward, found by code or name. */
export function formerUnits(
  query: string,
  options?: { province?: string },
): Result<FormerUnitsResult> {
  const q = typeof query === 'string' ? query.trim() : '';
  if (!q) return fail('EMPTY', 'Ward code or name is required');
  const provinceQ =
    typeof options?.province === 'string' && options.province.trim()
      ? options.province.trim()
      : undefined;

  let hit: { ward: Ward; province: Province } | undefined;
  const byCode = wardByCode.get(q);
  if (byCode) {
    const filter = provinceQ ? findProvince(provinceQ) : undefined;
    if (!provinceQ || filter?.code === byCode.province.code) hit = byCode;
  } else {
    const found = searchWards(q, provinceQ, 50);
    const best = found[0]?.score;
    const top = found.filter((x) => x.score === best);
    const provinces = [...new Set(top.map((x) => x.province.code))];
    if (provinces.length > 1) {
      const names = [...new Set(top.map((x) => x.province.fullName))].join(', ');
      return fail(
        'AMBIGUOUS',
        `"${q}" matches wards in more than one province`,
        `Add --province (province) to pick one of: ${names}`,
      );
    }
    hit = top[0];
  }
  if (!hit)
    return fail('NOT_FOUND', `No current ward matches "${q}"`, 'Try adding --province <province>');

  const former: FormerUnit[] = [];
  for (const e of reverse().get(hit.ward.code) ?? []) {
    const old = legacyWardByCode.get(e.old);
    if (!old) continue;
    const others = e.all.filter((c) => c !== hit.ward.code && wardByCode.has(c));
    former.push({
      ward: unit(old.ward),
      district: unit(old.district),
      province: unit(old.province),
      isDefault: e.isDefault,
      ...(others.length ? { otherNewWards: others.map((c) => unit(wardByCode.get(c)!.ward)) } : {}),
    });
  }
  return { ok: true, ward: unit(hit.ward), province: unit(hit.province), former };
}
