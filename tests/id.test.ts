import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseCitizenId } from '@vn-skills/core';

const CLI = resolve(__dirname, '..', 'packages', 'cli', 'dist', 'index.js');

// Digits: 3 province + 1 sex/century + 2 birth year + 6 random.
const id = (prov: string, sc: number, yy: string) => `${prov}${sc}${yy}123456`;

describe('parseCitizenId: province codes', () => {
  it.each([
    ['001', 'Hà Nội'],
    ['048', 'Đà Nẵng'],
    ['079', 'Hồ Chí Minh'],
    ['096', 'Cà Mau'],
  ])('decodes province %s', (code, name) => {
    const r = parseCitizenId(id(code, 0, '90'));
    expect(r).toMatchObject({ ok: true, kind: 'cccd', provinceCode: code });
    expect(JSON.stringify(r)).toContain(name);
  });

  it('maps a legacy province to its 2025 province', () => {
    const r = parseCitizenId(id('048', 0, '90'));
    expect(JSON.stringify(r)).toContain('Đà Nẵng');
    expect(r).toHaveProperty('newProvince');
  });

  it.each(['000', '097', '999'])('reports unknown province %s without rejecting', (code) => {
    const r = parseCitizenId(id(code, 0, '90'));
    expect(r).toMatchObject({ ok: true, provinceCode: code, province: null });
  });
});

describe('parseCitizenId: sex and century', () => {
  it.each([
    [0, 'male', 1900, '99', 1999],
    [1, 'female', 1900, '99', 1999],
    [2, 'male', 2000, '00', 2000],
    [3, 'female', 2000, '00', 2000],
    [2, 'male', 2000, '99', 2099],
    [3, 'female', 2000, '99', 2099],
    [4, 'male', 2100, '00', 2100],
    [5, 'female', 2100, '00', 2100],
    [6, 'male', 2200, '10', 2210],
    [7, 'female', 2200, '10', 2210],
    [8, 'male', 2300, '10', 2310],
    [9, 'female', 2300, '10', 2310],
  ])('digit %i -> %s, century %i, yy %s', (digit, sex, century, yy, year) => {
    const r = parseCitizenId(id('001', digit, yy));
    expect(r).toMatchObject({ ok: true, sex, birthYear: year });
    expect(JSON.stringify(r)).toContain(String(century));
  });
});

describe('parseCitizenId: format', () => {
  it('accepts a 9-digit legacy CMND (format only)', () => {
    expect(parseCitizenId('123456789')).toMatchObject({ ok: true, kind: 'cmnd' });
  });
  it('tolerates surrounding whitespace', () => {
    expect(parseCitizenId(` ${id('001', 0, '90')} `)).toMatchObject({ ok: true, kind: 'cccd' });
  });
  it.each(['', '12345678', '1234567890', '12345678901', '1234567890123', '00109012345a', 'abc'])(
    'rejects malformed %j',
    (input) => {
      expect(parseCitizenId(input)).toMatchObject({ ok: false });
    },
  );
});

describe('CLI id parse', () => {
  it('prints JSON for a CCCD', () => {
    const r = spawnSync(process.execPath, [CLI, 'id', 'parse', id('001', 0, '90')], {
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ ok: true, kind: 'cccd', provinceCode: '001' });
  });
});

describe('parseCitizenId: future birth year', () => {
  const today = new Date('2026-06-15T00:00:00Z');
  const warningsOf = (r: unknown) => (r as { warnings: string[] }).warnings;

  it('warns when the decoded birth year is after today', () => {
    const r = parseCitizenId('001900123456', { today });
    expect(r).toMatchObject({ ok: true, birthYear: 2300 });
    expect(warningsOf(r).some((w) => w.includes('2300') && /future/i.test(w))).toBe(true);
  });

  it.each([
    [2, '10'],
    [3, '25'],
  ])('does not warn for digit %i with a past year', (digit, yy) => {
    const r = parseCitizenId(id('001', digit, yy), { today });
    expect(r).toMatchObject({ ok: true });
    expect(warningsOf(r).some((w) => /future/i.test(w))).toBe(false);
  });

  it('does not warn when the birth year equals the current year', () => {
    const r = parseCitizenId(id('001', 2, '26'), { today });
    expect(r).toMatchObject({ ok: true, birthYear: 2026 });
    expect(warningsOf(r).some((w) => /future/i.test(w))).toBe(false);
  });

  it('warns for the year after the current year', () => {
    const r = parseCitizenId(id('001', 2, '27'), { today });
    expect(warningsOf(r).some((w) => w.includes('2027'))).toBe(true);
  });
});
