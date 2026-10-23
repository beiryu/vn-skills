import { describe, expect, it } from 'vitest';
import { parsePhone } from '@vn-skills/core';

function parse(input: string) {
  const r = parsePhone(input);
  if (!r.ok) throw new Error(r.error.message);
  return r;
}

describe('parsePhone: normalisation', () => {
  it.each([
    '0912345678',
    '+84912345678',
    '84912345678',
    '0912 345 678',
    '091-234-5678',
    '(+84) 912 345 678',
  ])('%s', (input) => {
    const r = parse(input);
    expect(r.e164).toBe('+84912345678');
    expect(r.formatted).toBe('0912 345 678');
    expect(r.type).toBe('mobile');
  });
});

describe('parsePhone: old 11-digit mobile prefixes', () => {
  it.each([
    ['01621234567', '0321234567'],
    ['01661234567', '0361234567'],
    ['01691234567', '0391234567'],
    ['01201234567', '0701234567'],
    ['01211234567', '0791234567'],
    ['01221234567', '0771234567'],
    ['01261234567', '0761234567'],
    ['01281234567', '0781234567'],
    ['01861234567', '0561234567'],
    ['01881234567', '0581234567'],
    ['01231234567', '0831234567'],
    ['01271234567', '0811234567'],
    ['01991234567', '0591234567'],
    ['+841651234567', '0351234567'],
  ])('%s -> %s', (input, national) => {
    const r = parse(input);
    expect(r.national).toBe(national);
    expect(r.e164).toBe('+84' + national.slice(1));
  });
});

describe('parsePhone: carrier by original prefix', () => {
  it.each([
    ['0321234567', 'Viettel'],
    ['0961234567', 'Viettel'],
    ['0911234567', 'VinaPhone'],
    ['0881234567', 'VinaPhone'],
    ['0901234567', 'MobiFone'],
    ['0701234567', 'MobiFone'],
    ['0921234567', 'Vietnamobile'],
    ['0591234567', 'Gmobile'],
    ['0871234567', 'iTel'],
    ['0551234567', 'Wintel'],
  ])('%s is %s', (input, carrier) => {
    expect(parse(input).carrier).toBe(carrier);
  });
});

describe('parsePhone: landlines', () => {
  it('Hà Nội', () => {
    const r = parse('02412345678');
    expect(r.type).toBe('landline');
    expect(r.areaCode).toBe('024');
    expect(r.province).toBe('Hà Nội');
    expect(r.e164).toBe('+842412345678');
  });
  it('TP. Hồ Chí Minh via +84', () => {
    const r = parse('+842812345678');
    expect(r.type).toBe('landline');
    expect(r.areaCode).toBe('028');
  });
  it('4-digit area code', () => {
    const r = parse('02363123456');
    expect(r.areaCode).toBe('0236');
    expect(r.province).toBe('Đà Nẵng');
  });
});

describe('parsePhone: invalid', () => {
  it.each([
    '',
    'abc',
    '091234567',
    '09123456789',
    '0212345',
    '0112345678',
    '+8491234',
    '0412345678',
    '0241234567',
  ])('%j is rejected', (input) => {
    expect(parsePhone(input).ok).toBe(false);
  });
});

describe('parsePhone: error hints', () => {
  it.each([
    ['', 'EMPTY'],
    ['   ', 'EMPTY'],
    ['abc', 'INVALID_FORMAT'],
    ['1234567890', 'INVALID_FORMAT'],
    ['091234567', 'INVALID_LENGTH'],
    ['0212345678', 'INVALID_LENGTH'],
    ['0112345678', 'UNKNOWN_PREFIX'],
    ['04123456789', 'UNKNOWN_PREFIX'],
  ])('%j -> %s has a hint', (input, code) => {
    const r = parsePhone(input);
    if (r.ok) throw new Error('expected failure');
    expect(r.error.code).toBe(code);
    expect(r.error.hint).toEqual(expect.any(String));
    expect(r.error.hint!.length).toBeGreaterThan(0);
  });
  it('null input is EMPTY', () => {
    const r = parsePhone(null as unknown as string);
    expect(!r.ok && r.error.message).toBe('Phone number is empty');
  });
});
