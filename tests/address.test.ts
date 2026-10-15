import { describe, expect, it } from 'vitest';
import {
  parseAddress,
  parseAddress2025,
  parseAddressLegacy,
  convertAddress,
  findProvince,
  searchWards,
  PROVINCES,
  LEGACY_PROVINCES,
  MAPPING,
  formatAddress,
} from '@vn-skills/core';

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

describe('findProvince', () => {
  it.each([
    ['Hà Nội', '01'],
    ['ha noi', '01'],
    ['HN', '01'],
    ['TP.HCM', '79'],
    ['tphcm', '79'],
    ['Sài Gòn', '79'],
    ['Thành phố Hồ Chí Minh', '79'],
    ['Đà Nẵng', '48'],
    ['Gia Lai', '52'],
    ['Lâm Đồng', '68'],
    ['Tỉnh Nghệ An', '40'],
    ['79', '79'],
  ])('%s -> %s', (q, code) => expect(findProvince(q)?.code).toBe(code));
  it('returns undefined for a merged-away province', () =>
    expect(findProvince('Bình Dương')).toBeUndefined());
  it('returns undefined for junk', () => expect(findProvince('Atlantis')).toBeUndefined());
});

describe('parseAddress2025', () => {
  it('parses a fully qualified address', () => {
    const r = parseAddress2025('12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.province?.code).toBe('79');
    expect(r.ward?.fullName).toBe('Phường Sài Gòn');
    expect(r.street).toBe('12 Nguyễn Huệ');
    expect(r.formatted).toBe('12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh');
  });
  it('parses without diacritics', () => {
    const r = parseAddress2025('12 nguyen hue, phuong sai gon, tp ho chi minh');
    expect(r.ok && r.ward?.fullName).toBe('Phường Sài Gòn');
  });
  it('parses abbreviations P. and TP.HCM', () => {
    const r = parseAddress2025('12 Nguyễn Huệ, P. Sài Gòn, TP.HCM');
    expect(r.ok && r.ward?.fullName).toBe('Phường Sài Gòn');
    expect(r.ok && r.province?.code).toBe('79');
  });
  it('parses ward without prefix', () => {
    const r = parseAddress2025('Sài Gòn, Hồ Chí Minh');
    expect(r.ok && r.ward?.fullName).toBe('Phường Sài Gòn');
  });
  it('parses Hà Nội ward', () => {
    const r = parseAddress2025('Số 1 Hàng Bài, Phường Hoàn Kiếm, Hà Nội');
    expect(r.ok && r.ward?.fullName).toBe('Phường Hoàn Kiếm');
    expect(r.ok && r.province?.code).toBe('01');
  });
  it('parses a commune (xã) in a merged province', () => {
    const r = parseAddress2025('Xã Tuy Phước, Tỉnh Gia Lai');
    expect(r.ok && r.ward?.fullName).toBe('Xã Tuy Phước');
  });
  it('parses đặc khu', () => {
    const r = parseAddress2025('Đặc khu Phú Quốc, An Giang');
    expect(r.ok && r.ward?.fullName).toBe('Đặc khu Phú Quốc');
  });
  it('handles no-separator input', () => {
    const r = parseAddress2025('12 Nguyen Hue Phuong Sai Gon TP Ho Chi Minh');
    expect(r.ok && r.province?.code).toBe('79');
    expect(r.ok && r.ward?.fullName).toBe('Phường Sài Gòn');
  });
  it('warns on legacy district tokens', () => {
    const r = parseAddress2025('12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM');
    expect(r.ok && r.warnings.some((w) => w.includes('district'))).toBe(true);
  });
  it('fails without province', () => {
    const r = parseAddress2025('12 Nguyễn Huệ');
    expect(!r.ok && r.error.code).toBe('PROVINCE_NOT_FOUND');
  });
  it('fails on empty', () => expect(parseAddress2025('').ok).toBe(false));
  it('disambiguates diacritic-only differences (Văn Lang vs Văn Lăng, Thái Nguyên)', () => {
    const a = parseAddress2025('Xã Văn Lang, Thái Nguyên');
    const b = parseAddress2025('Xã Văn Lăng, Thái Nguyên');
    expect(a.ok && a.ward?.fullName).toBe('Xã Văn Lang');
    expect(b.ok && b.ward?.fullName).toBe('Xã Văn Lăng');
  });
});

describe('parseAddressLegacy', () => {
  it('parses province/district/ward', () => {
    const r = parseAddressLegacy('12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.province?.code).toBe('79');
    expect(r.district?.fullName).toBe('Quận 1');
    expect(r.ward?.fullName).toBe('Phường Bến Nghé');
    expect(r.street).toBe('12 Nguyễn Huệ');
  });
  it('parses Q.1 / P. abbreviations', () => {
    const r = parseAddressLegacy('P. Bến Nghé, Q.1, TPHCM');
    expect(r.ok && r.district?.fullName).toBe('Quận 1');
    expect(r.ok && r.ward?.fullName).toBe('Phường Bến Nghé');
  });
  it('parses old province Bình Dương', () => {
    const r = parseAddressLegacy('Phường Phú Lợi, Thành phố Thủ Dầu Một, Bình Dương');
    expect(r.ok && r.province?.fullName).toBe('Tỉnh Bình Dương');
    expect(r.ok && r.district?.fullName).toBe('Thành phố Thủ Dầu Một');
  });
  it('parses no-separator legacy address', () => {
    const r = parseAddressLegacy('Phuong Ben Nghe Quan 1 Ho Chi Minh');
    expect(r.ok && r.district?.fullName).toBe('Quận 1');
  });
  it('fails on empty', () => expect(parseAddressLegacy('').ok).toBe(false));
});

describe('parseAddress (auto)', () => {
  it('picks legacy when a district is present', () => {
    const r = parseAddress('P. Bến Nghé, Q.1, TP.HCM');
    expect(r.ok && r.mode).toBe('legacy');
  });
  it('picks current when the ward exists in the new catalogue', () => {
    const r = parseAddress('Phường Sài Gòn, TP.HCM');
    expect(r.ok && r.mode).toBe('from2025');
  });
});

describe('convertAddress', () => {
  it('Bến Nghé, Q.1 -> Phường Sài Gòn', () => {
    const r = convertAddress('12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.new.ward?.fullName).toBe('Phường Sài Gòn');
    expect(r.new.province.code).toBe('79');
    expect(r.new.street).toBe('12 Nguyễn Huệ');
    expect(r.new.formatted).toBe('12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh');
    expect(r.mappingType).toBe('merged');
  });
  it('Bình Dương -> Thành phố Hồ Chí Minh', () => {
    const r = convertAddress('Phường Phú Lợi, Thành phố Thủ Dầu Một, Tỉnh Bình Dương');
    expect(r.ok && r.new.province.code).toBe('79');
    expect(r.ok && r.new.ward?.fullName).toBe('Phường Phú Lợi');
  });
  it('Bình Định -> Gia Lai', () => {
    const r = convertAddress('Phường Trần Phú, Thành phố Quy Nhơn, Bình Định');
    expect(r.ok && r.new.province.fullName).toBe('Tỉnh Gia Lai');
    expect(r.ok && r.new.ward?.fullName).toBe('Phường Quy Nhơn');
  });
  it('structured input', () => {
    const r = convertAddress({
      province: 'Hà Nội',
      district: 'Quận Hoàn Kiếm',
      ward: 'Phường Hàng Bạc',
      street: '5 Hàng Bạc',
    });
    expect(r.ok && r.new.ward?.fullName).toBe('Phường Hoàn Kiếm');
    expect(r.ok && r.new.street).toBe('5 Hàng Bạc');
  });
  it('reports divided wards with candidates', () => {
    // Xã Tân Thạnh, huyện Thới Lai, Cần Thơ was split (see mapping data)
    const r = convertAddress('Xã Tân Thạnh, Huyện Thới Lai, Cần Thơ');
    expect(r.ok && r.mappingType).toBe('divided');
    expect(r.ok && r.candidates.length).toBeGreaterThan(1);
    expect(r.ok && r.candidates.filter((c) => c.isDefault).length).toBe(1);
    expect(r.ok && r.warnings.some((w) => w.includes('split'))).toBe(true);
  });
  it('district-level unit without wards (Hoàng Sa)', () => {
    const r = convertAddress('Huyện Hoàng Sa, Đà Nẵng');
    expect(r.ok && r.new.ward?.fullName).toBe('Đặc khu Hoàng Sa');
  });
  it('already-new address passes through', () => {
    const r = convertAddress('Phường Sài Gòn, Thành phố Hồ Chí Minh');
    expect(r.ok && r.mappingType).toBe('already-new');
  });
  it('province only when ward unknown', () => {
    const r = convertAddress('Quận 1, TP.HCM');
    expect(r.ok && r.mappingType).toBe('province-only');
    expect(r.ok && r.new.province.code).toBe('79');
  });
  it('fails without province', () => expect(convertAddress('Phường Bến Nghé').ok).toBe(false));
  it('unchanged ward keeps type unchanged', () => {
    const r = convertAddress('Xã Tuy Phước, Huyện Tuy Phước, Bình Định');
    expect(r.ok && r.new.ward?.fullName).toBe('Xã Tuy Phước');
  });
});

describe('searchWards / formatAddress', () => {
  it('finds wards across provinces', () => {
    const list = searchWards('Tân Thành');
    expect(list.length).toBeGreaterThan(1);
  });
  it('restricts to a province', () => {
    const list = searchWards('Sài Gòn', 'HCM');
    expect(list[0]?.ward.fullName).toBe('Phường Sài Gòn');
  });
  it('formatAddress joins parts', () => {
    expect(formatAddress({ street: '1 A', ward: 'Phường X', province: 'Tỉnh Y' })).toBe(
      '1 A, Phường X, Tỉnh Y',
    );
  });
});
