import { describe, expect, it } from 'vitest';
import {
  parseAddress,
  parseAddress2025,
  convertAddress,
  convertAddresses,
  findProvince,
  searchWards,
  PROVINCES,
  LEGACY_PROVINCES,
  MAPPING,
  formatAddress,
  parseAddressLegacy,
  type ConvertInput,
} from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

interface Case<I, E> {
  name?: string;
  input: I;
  expected: E;
}
type Subset = Record<string, unknown>;

const golden = loadGolden<{
  findProvince: Case<string, Subset | null>[];
  parseAddress2025: Case<string, Subset>[];
  parseAddressLegacy: Case<string, Subset>[];
  parseAddress: Case<string, Subset>[];
  convertAddress: Case<string | ConvertInput, Subset>[];
  searchWardsFirst: Case<[query: string, province?: string], Subset>[];
  formatAddress: Case<Parameters<typeof formatAddress>[0], string>[];
}>('vn-address');

const cases = <I, E>(list: Case<I, E>[]) => list.map((c) => [title(c), c] as const);

describe('dataset sanity', () => {
  it('has 34 provinces and 3321 wards', () => {
    expect(PROVINCES.length).toBe(34);
    expect(PROVINCES.reduce((n, p) => n + p.wards.length, 0)).toBe(3321);
  });
  it('has 63 legacy provinces', () => expect(LEGACY_PROVINCES.length).toBe(63));
  it('maps every legacy ward', () => {
    const legacyWards = LEGACY_PROVINCES.reduce(
      (n, p) => n + p.districts.reduce((m, d) => m + d.wards.length, 0),
      0,
    );
    expect(Object.keys(MAPPING.wards).length).toBe(legacyWards);
  });
  it('every mapping target exists in the new catalogue', () => {
    const codes = new Set(PROVINCES.flatMap((p) => p.wards.map((w) => w.code)));
    for (const list of Object.values(MAPPING.wards))
      for (const [code] of list) expect(codes.has(code)).toBe(true);
  });
});

describe('golden fixtures', () => {
  it.each(cases(golden.findProvince))('findProvince: %s', (_, c) => {
    const p = findProvince(c.input);
    if (c.expected === null) expect(p).toBeUndefined();
    else expect(p).toMatchObject(c.expected);
  });
  it.each(cases(golden.parseAddress2025))('parseAddress2025: %s', (_, c) =>
    expect(parseAddress2025(c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.parseAddressLegacy))('parseAddressLegacy: %s', (_, c) =>
    expect(parseAddressLegacy(c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.parseAddress))('parseAddress: %s', (_, c) =>
    expect(parseAddress(c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.convertAddress))('convertAddress: %s', (_, c) =>
    expect(convertAddress(c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.searchWardsFirst))('searchWards first: %s', (_, c) =>
    expect(searchWards(...c.input)[0]).toMatchObject(c.expected),
  );
  it.each(cases(golden.formatAddress))('formatAddress: %s', (_, c) =>
    expect(formatAddress(c.input)).toBe(c.expected),
  );
});

describe('parseAddress2025', () => {
  it('warns on legacy district tokens', () => {
    const r = parseAddress2025('12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM');
    expect(r.ok && r.warnings.some((w) => w.includes('district'))).toBe(true);
  });
});

describe('convertAddress', () => {
  it('reports divided wards with candidates', () => {
    // Xã Tân Thạnh, huyện Thới Lai, Cần Thơ was split (see mapping data)
    const r = convertAddress('Xã Tân Thạnh, Huyện Thới Lai, Cần Thơ');
    expect(r.ok && r.mappingType).toBe('divided');
    expect(r.ok && r.candidates.length).toBeGreaterThan(1);
    expect(r.ok && r.candidates.filter((c) => c.isDefault).length).toBe(1);
    expect(r.ok && r.warnings.some((w) => w.includes('split'))).toBe(true);
  });
});

describe('searchWards', () => {
  it('finds wards across provinces', () => {
    const list = searchWards('Tân Thành');
    expect(list.length).toBeGreaterThan(1);
  });
});

describe('convertAddresses', () => {
  const good = 'P. Bến Nghé, Q.1, TP.HCM';
  it('handles a mixed batch', () => {
    const r = convertAddresses([good, 'zzz không có địa chỉ này', null, '', 5]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.summary).toEqual({ total: 5, converted: 1, failed: 4 });
    expect(r.results.map((x) => x.ok)).toEqual([true, false, false, false, false]);
    expect(r.results[3]).toMatchObject({ index: 3, input: '' });
  });
  it('matches convertAddress per item', () => {
    const items = [good, 'Phường 1, Quận 3, TP.HCM', 'Xã Thanh Xuân, Huyện Sóc Sơn, Hà Nội'];
    const r = convertAddresses(items);
    if (!r.ok) throw new Error('unexpected');
    items.forEach((input, i) => {
      const one = convertAddress(input);
      const row = r.results[i]!;
      expect(row.index).toBe(i);
      if (!one.ok) {
        expect(row).toMatchObject({ ok: false, error: one.error });
        return;
      }
      expect(row.ok).toBe(true);
      if (!row.ok) return;
      expect(row.mappingType).toBe(one.mappingType);
      expect(row.old.formatted).toBe(one.old.formatted);
      expect(row.new.formatted).toBe(one.new.formatted);
      expect(row.new.ward?.code).toBe(one.new.ward?.code);
      expect(row.candidates.map((c) => c.code)).toEqual(one.candidates.map((c) => c.ward.code));
      expect(row.confidence).toBe(one.confidence);
      expect(row.warnings).toEqual(one.warnings);
    });
  });
  it('empty array', () => {
    expect(convertAddresses([])).toEqual({
      ok: true,
      results: [],
      summary: { total: 0, converted: 0, failed: 0 },
    });
  });
  it('rejects too many and non-arrays', () => {
    const r = convertAddresses(new Array(1001).fill(good));
    expect(r.ok === false && r.error.code).toBe('TOO_MANY');
    const n = convertAddresses('x');
    expect(n.ok === false && n.error.code).toBe('INVALID_INPUT');
  });
});
