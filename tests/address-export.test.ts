import { describe, expect, it } from 'vitest';
import * as core from '@vn-skills/core';
import { parseCsv } from '../packages/cli/src/csv.js';

type Cat = {
  ok: true;
  table: string;
  dataset: { version: string; decree: string };
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
};
type Exporter = (o: {
  table: string;
}) => Cat | { ok: false; error: { code: string; hint?: string } };

const exp = (table: string) =>
  (core as unknown as { exportAddressCatalogue: Exporter }).exportAddressCatalogue({ table });
const cat = (table: string) => {
  const r = exp(table);
  if (!r.ok) throw new Error(`export ${table} failed: ${r.error.code}`);
  return r;
};

// Synthetic catalogue: names with an apostrophe, comma, quote and newline.
const synthetic: Cat = {
  ok: true,
  table: 'legacy-wards',
  dataset: { version: 'v-test', decree: 'decree-test' },
  columns: ['code', 'name', 'note', 'flag', 'n'],
  rows: [
    { code: '1', name: "Cu M'gar", note: 'a, b', flag: true, n: 3 },
    { code: '2', name: 'He said "hi"', note: null, flag: false, n: 0 },
    { code: '3', name: 'line\nbreak', note: 'x', flag: true, n: 1 },
  ],
};

describe('exportAddressCatalogue', () => {
  it('is exported from core', () => {
    expect(typeof (core as Record<string, unknown>).exportAddressCatalogue).toBe('function');
  });
  it('provinces: one row per province with the documented columns', () => {
    const r = cat('provinces');
    expect(r.table).toBe('provinces');
    expect(r.columns).toEqual(['code', 'name', 'fullName', 'nameEn', 'type', 'postalPrefix']);
    expect(r.rows).toHaveLength(34);
  });
  it('carries dataset version and decree', () => {
    const r = cat('provinces');
    expect(r.dataset.version).toBeTruthy();
    expect(r.dataset.decree).toBeTruthy();
  });
  it('provinces rows use null for missing values and only declared columns', () => {
    for (const row of cat('provinces').rows) {
      expect(Object.keys(row).sort()).toEqual(
        ['code', 'name', 'fullName', 'nameEn', 'type', 'postalPrefix'].sort(),
      );
      expect(row.code).toBeTruthy();
      expect(row.postalPrefix === null || typeof row.postalPrefix === 'string').toBe(true);
    }
  });
  it('wards: row count equals the sum of province wards', async () => {
    const total = (await import('../packages/core/src/address/data.js')).PROVINCES.reduce(
      (n, p) => n + p.wards.length,
      0,
    );
    expect(cat('wards').rows).toHaveLength(total);
  });
  it('wards: columns include code, name, type, provinceCode, postalCode', () => {
    const cols = cat('wards').columns;
    for (const c of ['code', 'name', 'type', 'provinceCode', 'postalCode'])
      expect(cols).toContain(c);
  });
  it('wards: every provinceCode refers to a provinces row', () => {
    const codes = new Set(cat('provinces').rows.map((r) => r.code));
    for (const w of cat('wards').rows) expect(codes.has(w.provinceCode)).toBe(true);
  });
  it('wards: codes are unique', () => {
    const rows = cat('wards').rows;
    expect(new Set(rows.map((r) => r.code)).size).toBe(rows.length);
  });
  it('mapping: covers every old ward key and has one row per candidate', async () => {
    const { MAPPING } = await import('../packages/core/src/address/data.js');
    const r = cat('mapping');
    expect(r.columns.slice(0, 3)).toEqual(['oldWardCode', 'newWardCode', 'divided']);
    const olds = new Set(r.rows.map((x) => x.oldWardCode));
    for (const k of Object.keys(MAPPING.wards)) expect(olds.has(k)).toBe(true);
    const candidates = Object.values(MAPPING.wards).reduce((n, v) => n + v.length, 0);
    expect(r.rows).toHaveLength(candidates);
  });
  it('mapping: new ward codes exist in the wards table', () => {
    const wards = new Set(cat('wards').rows.map((r) => r.code));
    for (const m of cat('mapping').rows) expect(wards.has(m.newWardCode)).toBe(true);
  });
  it('legacy-provinces: 63 rows with code, name, type', async () => {
    const r = cat('legacy-provinces');
    expect(r.rows).toHaveLength(63);
    for (const c of ['code', 'name', 'type']) expect(r.columns).toContain(c);
  });
  it('legacy-districts: row count equals the legacy district total and has a parent code', async () => {
    const { LEGACY_PROVINCES } = await import('../packages/core/src/address/data.js');
    const r = cat('legacy-districts');
    expect(r.rows).toHaveLength(LEGACY_PROVINCES.reduce((n, p) => n + p.districts.length, 0));
    expect(r.columns.length).toBeGreaterThanOrEqual(4);
  });
  it('legacy-wards: row count equals the legacy ward total', async () => {
    const { LEGACY_PROVINCES } = await import('../packages/core/src/address/data.js');
    const total = LEGACY_PROVINCES.reduce(
      (n, p) => n + p.districts.reduce((m, d) => m + d.wards.length, 0),
      0,
    );
    expect(cat('legacy-wards').rows).toHaveLength(total);
  });
  it('unknown table returns INVALID_TABLE with a hint listing valid names, no throw', () => {
    const r = exp('nope');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('INVALID_TABLE');
      expect(r.error.hint).toContain('provinces');
      expect(r.error.hint).toContain('legacy-wards');
    }
  });
});

describe('catalogue formatters (CLI helpers)', () => {
  const load = async () =>
    (await import('../packages/cli/src/export-format.js')) as unknown as {
      toCatalogueCsv: (c: Cat) => string;
      toCatalogueSql: (c: Cat) => string;
    };

  it('csv: starts with a comment naming version, decree and SOURCES.md', async () => {
    const out = (await load()).toCatalogueCsv(synthetic);
    const first = out.split('\n')[0]!;
    expect(first.startsWith('#')).toBe(true);
    expect(first).toContain('v-test');
    expect(first).toContain('decree-test');
    expect(first).toContain('SOURCES.md');
  });
  it('csv: quotes commas, quotes and newlines (RFC 4180) and round-trips', async () => {
    const out = (await load()).toCatalogueCsv(synthetic);
    expect(out).toContain('"a, b"');
    expect(out).toContain('"He said ""hi"""');
    expect(out).toContain('"line\nbreak"');
    const rows = parseCsv(out.split('\n').slice(1).join('\n'));
    expect(rows[0]).toEqual(synthetic.columns);
    expect(rows).toHaveLength(synthetic.rows.length + 1);
    expect(rows[1]![1]).toBe("Cu M'gar");
    expect(rows[2]![1]).toBe('He said "hi"');
    expect(rows[3]![1]).toBe('line\nbreak');
  });
  it('sql: starts with a comment, creates the table with underscores', async () => {
    const out = (await load()).toCatalogueSql(synthetic);
    expect(out.split('\n')[0]).toMatch(/^--.*v-test.*decree-test.*SOURCES\.md/);
    expect(out).toContain('CREATE TABLE IF NOT EXISTS legacy_wards');
    expect(out).not.toContain('legacy-wards');
  });
  it("sql: escapes ' by doubling it", async () => {
    const out = (await load()).toCatalogueSql(synthetic);
    expect(out).toContain("'Cu M''gar'");
    expect(out).not.toContain("'Cu M'gar'");
  });
  it('sql: one INSERT per row, NULL for null', async () => {
    const out = (await load()).toCatalogueSql(synthetic);
    expect(out.match(/INSERT INTO legacy_wards/g)).toHaveLength(3);
    expect(out).toMatch(/NULL/);
  });
});
