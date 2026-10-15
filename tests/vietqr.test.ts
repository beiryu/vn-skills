import { describe, expect, it } from 'vitest';
import {
  buildVietQR,
  crc16CcittFalse,
  findBank,
  parseVietQR,
  sanitizeNote,
  searchBanks,
  BANKS,
  MAX_NOTE_LENGTH,
} from '@vn-skills/core';

// Known-good vector (TPBank, account "mynamebvh", 50,000 VND, note "test") with CRC AB76.
const GOLDEN =
  '00020101021238530010A000000727012300069704230109mynamebvh0208QRIBFTTA53037045405500005802VN62080804test6304AB76';

describe('crc16CcittFalse', () => {
  it('matches the EMVCo reference vector', () => {
    expect(crc16CcittFalse(GOLDEN.slice(0, -4))).toBe('AB76');
  });
  it('computes known CRC of "123456789"', () => {
    expect(crc16CcittFalse('123456789')).toBe('29B1');
  });
  it('handles empty input', () => {
    expect(crc16CcittFalse('')).toBe('FFFF');
  });
  it('is case-sensitive on input', () => {
    expect(crc16CcittFalse('abc')).not.toBe(crc16CcittFalse('ABC'));
  });
});

describe('findBank / searchBanks', () => {
  it('finds by BIN', () => expect(findBank('970436')?.shortName).toBe('Vietcombank'));
  it('finds by code', () => expect(findBank('VCB')?.bin).toBe('970436'));
  it('finds by lowercase code', () => expect(findBank('tcb')?.bin).toBe('970407'));
  it('finds by name with diacritics', () =>
    expect(findBank('Ngân hàng TMCP Á Châu')?.code).toBe('ACB'));
  it('finds by alias "MB"', () => expect(findBank('MB')?.bin).toBe('970422'));
  it('finds by alias "vietin"', () => expect(findBank('Vietin')?.bin).toBe('970415'));
  it('finds BIDV', () => expect(findBank('BIDV')?.bin).toBe('970418'));
  it('finds Agribank', () => expect(findBank('agribank')?.bin).toBe('970405'));
  it('returns undefined for junk', () => expect(findBank('zzzz-not-a-bank')).toBeUndefined());
  it('returns undefined for empty', () => expect(findBank('')).toBeUndefined());
  it('searchBanks lists all when query empty', () =>
    expect(searchBanks('').length).toBe(BANKS.length));
  it('searchBanks puts exact match first', () => expect(searchBanks('vcb')[0]?.bin).toBe('970436'));
  it('bank list has unique BINs', () => {
    const bins = BANKS.map((b) => b.bin);
    expect(new Set(bins).size).toBe(bins.length);
    expect(bins.every((b) => /^\d{6}$/.test(b))).toBe(true);
  });
});

describe('buildVietQR', () => {
  it('reproduces the golden payload', () => {
    const r = buildVietQR({ bank: '970423', account: 'mynamebvh', amount: 50000, note: 'test' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload).toBe(GOLDEN);
    expect(r.crc).toBe('AB76');
    expect(r.dynamic).toBe(true);
  });
  it('builds a static QR without amount/note', () => {
    const r = buildVietQR({ bank: 'VCB', account: '0011001234567' });
    expect(r.ok && r.payload.startsWith('000201010211')).toBe(true);
    expect(r.ok && r.payload.includes('5303704')).toBe(true);
    expect(r.ok && r.dynamic).toBe(false);
    const p = r.ok ? parseVietQR(r.payload) : undefined;
    expect(p?.ok && p.amount).toBeUndefined();
    expect(p?.ok && p.note).toBeUndefined();
    expect(p?.ok && p.crcValid).toBe(true);
  });
  it('accepts amount as formatted string', () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', amount: '1.500.000 đ' });
    expect(r.ok && r.amount).toBe(1500000);
  });
  it('accepts amount with comma separators', () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', amount: '1,500,000' });
    expect(r.ok && r.amount).toBe(1500000);
  });
  it('rejects decimal amounts', () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', amount: '100.5' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_AMOUNT');
  });
  it('rejects "1.5" style decimals but accepts "500.000"', () => {
    expect(buildVietQR({ bank: 'VCB', account: '123', amount: '1.5' }).ok).toBe(false);
    expect(buildVietQR({ bank: 'VCB', account: '123', amount: '1,25' }).ok).toBe(false);
    const r = buildVietQR({ bank: 'VCB', account: '123', amount: '500.000' });
    expect(r.ok && r.amount).toBe(500000);
  });
  it('rejects zero/negative amounts', () => {
    expect(buildVietQR({ bank: 'VCB', account: '123', amount: 0 }).ok).toBe(false);
    expect(buildVietQR({ bank: 'VCB', account: '123', amount: -5 }).ok).toBe(false);
  });
  it('rejects unknown bank', () => {
    const r = buildVietQR({ bank: 'Ngân hàng không tồn tại', account: '123' });
    expect(!r.ok && r.error.code).toBe('BANK_NOT_FOUND');
  });
  it('rejects invalid account', () => {
    const r = buildVietQR({ bank: 'VCB', account: '12-34' });
    expect(!r.ok && r.error.code).toBe('INVALID_ACCOUNT');
  });
  it('strips spaces in account', () => {
    const r = buildVietQR({ bank: 'VCB', account: '0011 0012 3456' });
    expect(r.ok && r.account).toBe('001100123456');
  });
  it('sanitizes diacritics in note and warns', () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', note: 'Thanh toán đơn hàng #42' });
    expect(r.ok && r.note).toBe('Thanh toan don hang 42');
    expect(r.ok && r.warnings.some((w) => w.includes('sanitized'))).toBe(true);
  });
  it('truncates long notes', () => {
    const long = 'a'.repeat(40);
    const r = buildVietQR({ bank: 'VCB', account: '123', note: long });
    expect(r.ok && r.note?.length).toBe(MAX_NOTE_LENGTH);
    expect(r.ok && r.warnings.some((w) => w.includes('truncated'))).toBe(true);
  });
  it('builds card service QR', () => {
    const r = buildVietQR({ bank: 'VCB', account: '9704360123456789', service: 'card' });
    expect(r.ok && r.payload.includes('QRIBFTTC')).toBe(true);
  });
  it('round-trips through parse', () => {
    const r = buildVietQR({
      bank: 'MB',
      account: '0123456789',
      amount: 500000,
      note: 'chuyen tien',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = parseVietQR(r.payload);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.bin).toBe('970422');
    expect(p.account).toBe('0123456789');
    expect(p.amount).toBe(500000);
    expect(p.note).toBe('chuyen tien');
    expect(p.crcValid).toBe(true);
    expect(p.isVietQR).toBe(true);
  });
  it('sanitizeNote collapses whitespace', () => {
    expect(sanitizeNote('  a   b  ')).toBe('a b');
  });
});

describe('parseVietQR', () => {
  it('parses the golden payload', () => {
    const p = parseVietQR(GOLDEN);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.bin).toBe('970423');
    expect(p.bank?.shortName).toBe('TPBank');
    expect(p.account).toBe('mynamebvh');
    expect(p.amount).toBe(50000);
    expect(p.note).toBe('test');
    expect(p.service).toBe('QRIBFTTA');
    expect(p.currency).toBe('704');
    expect(p.country).toBe('VN');
    expect(p.crcValid).toBe(true);
    expect(p.warnings).toEqual([]);
  });
  it('flags a bad CRC', () => {
    const p = parseVietQR(GOLDEN.slice(0, -4) + '0000');
    expect(p.ok && p.crcValid).toBe(false);
    expect(p.ok && p.warnings.some((w) => w.includes('CRC mismatch'))).toBe(true);
  });
  it('fails on truncated payload', () => {
    const p = parseVietQR(GOLDEN.slice(0, 40));
    expect(p.ok).toBe(false);
  });
  it('fails on garbage', () => {
    expect(parseVietQR('hello world').ok).toBe(false);
    expect(parseVietQR('').ok).toBe(false);
  });
  it('detects non-VietQR GUID', () => {
    const r = buildVietQR({ bank: 'VCB', account: '1' });
    if (!r.ok) throw new Error();
    const tampered = r.payload.replace('A000000727', 'A000000775');
    const p = parseVietQR(tampered);
    expect(p.ok && p.isVietQR).toBe(false);
  });
  it('tolerates surrounding whitespace', () => {
    expect(parseVietQR(`  ${GOLDEN}\n`).ok).toBe(true);
  });
  it('reports static QR as not dynamic', () => {
    const r = buildVietQR({ bank: 'VCB', account: '1' });
    const p = r.ok ? parseVietQR(r.payload) : undefined;
    expect(p?.ok && p.dynamic).toBe(false);
  });
});
