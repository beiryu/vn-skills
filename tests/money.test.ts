import { describe, expect, it } from 'vitest';
import { moneyToWords, numberToWords } from '@vn-skills/core';

const w = (n: number | bigint | string, o?: Parameters<typeof moneyToWords>[1]) => {
  const r = moneyToWords(n, o);
  if (!r.ok) throw new Error(r.error.message);
  return r.words;
};

describe('moneyToWords — basics', () => {
  it('0', () => expect(w(0)).toBe('không đồng'));
  it('1', () => expect(w(1)).toBe('một đồng'));
  it('5', () => expect(w(5)).toBe('năm đồng'));
  it('10', () => expect(w(10)).toBe('mười đồng'));
  it('11', () => expect(w(11)).toBe('mười một đồng'));
  it('15', () => expect(w(15)).toBe('mười lăm đồng'));
  it('20', () => expect(w(20)).toBe('hai mươi đồng'));
  it('21', () => expect(w(21)).toBe('hai mươi mốt đồng'));
  it('24 uses tư by default', () => expect(w(24)).toBe('hai mươi tư đồng'));
  it('24 with useTu=false', () => expect(w(24, { useTu: false })).toBe('hai mươi bốn đồng'));
  it('25', () => expect(w(25)).toBe('hai mươi lăm đồng'));
  it('100', () => expect(w(100)).toBe('một trăm đồng'));
  it('101', () => expect(w(101)).toBe('một trăm lẻ một đồng'));
  it('105 with linh', () => expect(w(105, { odd: 'linh' })).toBe('một trăm linh năm đồng'));
  it('110', () => expect(w(110)).toBe('một trăm mười đồng'));
  it('999', () => expect(w(999)).toBe('chín trăm chín mươi chín đồng'));
});

describe('moneyToWords — groups', () => {
  it('1000', () => expect(w(1000)).toBe('một nghìn đồng'));
  it('1005', () => expect(w(1005)).toBe('một nghìn không trăm lẻ năm đồng'));
  it('1050', () => expect(w(1050)).toBe('một nghìn không trăm năm mươi đồng'));
  it('1100', () => expect(w(1100)).toBe('một nghìn một trăm đồng'));
  it('10000', () => expect(w(10000)).toBe('mười nghìn đồng'));
  it('21000 southern', () => expect(w(21000, { thousand: 'ngàn' })).toBe('hai mươi mốt ngàn đồng'));
  it('1000000', () => expect(w(1_000_000)).toBe('một triệu đồng'));
  it('1200000', () => expect(w(1_200_000)).toBe('một triệu hai trăm nghìn đồng'));
  it('1000001', () => expect(w(1_000_001)).toBe('một triệu không trăm lẻ một đồng'));
  it('2500000 (invoice style)', () =>
    expect(w(2_500_000, { capitalize: true })).toBe('Hai triệu năm trăm nghìn đồng'));
  it('1000000000', () => expect(w(1_000_000_000)).toBe('một tỷ đồng'));
  it('1234567890', () =>
    expect(w(1_234_567_890)).toBe(
      'một tỷ hai trăm ba mươi tư triệu năm trăm sáu mươi bảy nghìn tám trăm chín mươi đồng',
    ));
  it('10^12', () => expect(w(1_000_000_000_000)).toBe('một nghìn tỷ đồng'));
  it('10^15 as bigint', () => expect(w(1_000_000_000_000_000n)).toBe('một triệu tỷ đồng'));
  it('10^18 as string', () => expect(w('1000000000000000000')).toBe('một tỷ tỷ đồng'));
  it('2^63 as bigint', () => {
    expect(w(9223372036854775808n)).toBe(
      'chín tỷ tỷ hai trăm hai mươi ba triệu tỷ ba trăm bảy mươi hai nghìn tỷ không trăm ba mươi sáu tỷ tám trăm năm mươi tư triệu bảy trăm bảy mươi lăm nghìn tám trăm lẻ tám đồng',
    );
  });
});

describe('moneyToWords — options & inputs', () => {
  it('chẵn suffix', () => expect(w(1_000_000, { chan: true })).toBe('một triệu đồng chẵn'));
  it('no chẵn for odd amounts', () =>
    expect(w(1_000_500, { chan: true })).toBe('một triệu năm trăm đồng'));
  it('custom unit', () => expect(w(3, { unit: 'USD' })).toBe('ba USD'));
  it('empty unit', () => expect(w(3, { unit: '' })).toBe('ba'));
  it('negative', () => expect(w(-15)).toBe('âm mười lăm đồng'));
  it('vi separators 1.200.000', () => expect(w('1.200.000')).toBe('một triệu hai trăm nghìn đồng'));
  it('en separators 1,200,000', () => expect(w('1,200,000')).toBe('một triệu hai trăm nghìn đồng'));
  it('rejects decimals', () => expect(moneyToWords(12.5).ok).toBe(false));
  it('rejects decimal string', () => expect(moneyToWords('12.5').ok).toBe(false));
  it('rejects text', () => expect(moneyToWords('abc').ok).toBe(false));
  it('rejects NaN/Infinity', () => {
    expect(moneyToWords(NaN).ok).toBe(false);
    expect(moneyToWords(Infinity).ok).toBe(false);
  });
  it('rejects unsafe number', () => expect(moneyToWords(2 ** 60).ok).toBe(false));
  it('numberToWords has no unit', () => {
    const r = numberToWords(2024);
    expect(r.ok && r.words).toBe('hai nghìn không trăm hai mươi tư');
  });
});
