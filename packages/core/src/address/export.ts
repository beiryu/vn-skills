import { fail, type Result } from '../shared/result.js';
import { DATASET, LEGACY_PROVINCES, MAPPING, PROVINCES } from './data.js';

export const ADDRESS_TABLES = [
  'provinces',
  'wards',
  'mapping',
  'legacy-provinces',
  'legacy-districts',
  'legacy-wards',
] as const;
export type AddressTable = (typeof ADDRESS_TABLES)[number];
export type CatalogueRow = Record<string, string | number | boolean | null>;
export interface AddressCatalogue {
  table: string;
  dataset: { version: string; decree: string };
  columns: string[];
  rows: CatalogueRow[];
}

const COLUMNS: Record<AddressTable, string[]> = {
  provinces: ['code', 'name', 'fullName', 'nameEn', 'type', 'postalPrefix'],
  wards: ['code', 'name', 'fullName', 'nameEn', 'type', 'provinceCode', 'postalCode'],
  mapping: ['oldWardCode', 'newWardCode', 'divided', 'isDefault'],
  'legacy-provinces': ['code', 'name', 'fullName', 'type'],
  'legacy-districts': ['code', 'name', 'fullName', 'type', 'provinceCode'],
  'legacy-wards': ['code', 'name', 'fullName', 'type', 'districtCode', 'provinceCode'],
};

/** Export one bundled address table as flat rows (missing values are null). */
export function exportAddressCatalogue(opts: { table: string }): Result<AddressCatalogue> {
  const table = opts.table as AddressTable;
  if (!ADDRESS_TABLES.includes(table))
    return fail(
      'INVALID_TABLE',
      `Unknown table "${opts.table}"`,
      `Valid tables: ${ADDRESS_TABLES.join(', ')}`,
    );
  const rows: CatalogueRow[] = [];
  if (table === 'provinces')
    for (const p of PROVINCES)
      rows.push({
        code: p.code,
        name: p.name,
        fullName: p.fullName,
        nameEn: p.nameEn ?? null,
        type: p.type,
        postalPrefix: p.postalPrefix ?? null,
      });
  else if (table === 'wards')
    for (const p of PROVINCES)
      for (const w of p.wards)
        rows.push({
          code: w.code,
          name: w.name,
          fullName: w.fullName,
          nameEn: w.nameEn ?? null,
          type: w.type,
          provinceCode: p.code,
          postalCode: w.postalCode ?? null,
        });
  else if (table === 'mapping')
    for (const [oldCode, targets] of Object.entries(MAPPING.wards))
      for (const [newCode, isDefault] of targets)
        rows.push({
          oldWardCode: oldCode,
          newWardCode: newCode,
          divided: targets.length > 1,
          isDefault,
        });
  else
    for (const p of LEGACY_PROVINCES) {
      if (table === 'legacy-provinces')
        rows.push({ code: p.code, name: p.name, fullName: p.fullName, type: p.type });
      else
        for (const d of p.districts) {
          if (table === 'legacy-districts')
            rows.push({
              code: d.code,
              name: d.name,
              fullName: d.fullName,
              type: d.type,
              provinceCode: p.code,
            });
          else
            for (const w of d.wards)
              rows.push({
                code: w.code,
                name: w.name,
                fullName: w.fullName,
                type: w.type,
                districtCode: d.code,
                provinceCode: p.code,
              });
        }
    }
  return {
    ok: true,
    table,
    dataset: { version: DATASET.version, decree: DATASET.decree },
    columns: COLUMNS[table],
    rows,
  };
}
