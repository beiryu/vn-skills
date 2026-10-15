import provincesJson from '../../data/provinces-2025.json' with { type: 'json' };
import legacyJson from '../../data/legacy-63.json' with { type: 'json' };
import mappingJson from '../../data/mapping-old-new.json' with { type: 'json' };

export interface Ward {
  code: string;
  name: string;
  fullName: string;
  nameEn?: string;
  type: string;
  key: string;
  keys: string[];
  postalCode?: string;
}
export interface Province {
  code: string;
  name: string;
  fullName: string;
  nameEn?: string;
  type: string;
  key: string;
  keys: string[];
  postalPrefix?: string;
  wards: Ward[];
}
export interface LegacyWard {
  code: string;
  name: string;
  fullName: string;
  type: string;
  key: string;
  keys: string[];
}
export interface LegacyDistrict {
  code: string;
  name: string;
  fullName: string;
  type: string;
  key: string;
  keys: string[];
  wards: LegacyWard[];
}
export interface LegacyProvince {
  code: string;
  name: string;
  fullName: string;
  type: string;
  key: string;
  keys: string[];
  districts: LegacyDistrict[];
}
export interface Mapping {
  provinces: Record<string, string>;
  wards: Record<string, Array<[string, boolean]>>;
  districts: Record<string, string>;
  stats: Record<string, number>;
}

export const DATASET = provincesJson as unknown as {
  version: string;
  decree: string;
  generatedAt: string;
  provinces: Province[];
};
export const PROVINCES: readonly Province[] = DATASET.provinces;
export const LEGACY_PROVINCES: readonly LegacyProvince[] = (
  legacyJson as unknown as { provinces: LegacyProvince[] }
).provinces;
export const MAPPING: Mapping = mappingJson as unknown as Mapping;

export const provinceByCode = new Map(PROVINCES.map((p) => [p.code, p]));
export const provinceByKey = new Map(PROVINCES.map((p) => [p.key, p]));
export const wardByCode = new Map<string, { ward: Ward; province: Province }>();
for (const p of PROVINCES)
  for (const w of p.wards) wardByCode.set(w.code, { ward: w, province: p });

export const legacyProvinceByCode = new Map(LEGACY_PROVINCES.map((p) => [p.code, p]));
export const legacyProvinceByKey = new Map(LEGACY_PROVINCES.map((p) => [p.key, p]));
export const legacyWardByCode = new Map<
  string,
  { ward: LegacyWard; district: LegacyDistrict; province: LegacyProvince }
>();
export const legacyDistrictByCode = new Map<
  string,
  { district: LegacyDistrict; province: LegacyProvince }
>();
for (const p of LEGACY_PROVINCES) {
  for (const d of p.districts) {
    legacyDistrictByCode.set(d.code, { district: d, province: p });
    for (const w of d.wards) legacyWardByCode.set(w.code, { ward: w, district: d, province: p });
  }
}
