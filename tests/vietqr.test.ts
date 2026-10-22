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
  type BuildVietQROptions,
} from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

interface Case<I, E> {
  name?: string;
  input: I;
  expected: E;
}
type Subset = Record<string, unknown>;

const golden = loadGolden<{
  crc16CcittFalse: Case<string, string>[];
  findBank: Case<string, Subset | null>[];
  searchBanksFirst: Case<string, Subset>[];
  buildVietQR: Case<BuildVietQROptions, Subset>[];
  parseVietQR: Case<string, Subset>[];
  sanitizeNote: Case<string, string>[];
}>('vietqr');

const cases = <I, E>(list: Case<I, E>[]) => list.map((c) => [title(c), c] as const);

// Known-good vector (TPBank, account "mynamebvh", 50,000 VND, note "test") with CRC AB76.
const GOLDEN =
  '00020101021238530010A000000727012300069704230109mynamebvh0208QRIBFTTA53037045405500005802VN62080804test6304AB76';

describe('golden fixtures', () => {
  it.each(cases(golden.crc16CcittFalse))('crc16CcittFalse: %s', (_, c) =>
    expect(crc16CcittFalse(c.input)).toBe(c.expected),
  );
  it.each(cases(golden.findBank))('findBank: %s', (_, c) => {
    const bank = findBank(c.input);
    if (c.expected === null) expect(bank).toBeUndefined();
    else expect(bank).toMatchObject(c.expected);
  });
  it.each(cases(golden.searchBanksFirst))('searchBanks first: %s', (_, c) =>
    expect(searchBanks(c.input)[0]).toMatchObject(c.expected),
  );
  it.each(cases(golden.buildVietQR))('buildVietQR: %s', (_, c) =>
    expect(buildVietQR(c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.parseVietQR))('parseVietQR: %s', (_, c) =>
    expect(parseVietQR(c.input)).toMatchObject(c.expected),
  );
  it.each(cases(golden.sanitizeNote))('sanitizeNote: %s', (_, c) =>
    expect(sanitizeNote(c.input)).toBe(c.expected),
  );
});

describe('crc16CcittFalse', () => {
  it('matches the CRC embedded in the golden payload', () => {
    expect(crc16CcittFalse(GOLDEN.slice(0, -4))).toBe(GOLDEN.slice(-4));
  });
  it('is case-sensitive on input', () => {
    expect(crc16CcittFalse('abc')).not.toBe(crc16CcittFalse('ABC'));
  });
});

describe('findBank / searchBanks', () => {
  it('searchBanks lists all when query empty', () =>
    expect(searchBanks('').length).toBe(BANKS.length));
  it('bank list has unique BINs', () => {
    const bins = BANKS.map((b) => b.bin);
    expect(new Set(bins).size).toBe(bins.length);
    expect(bins.every((b) => /^\d{6}$/.test(b))).toBe(true);
  });
});

describe('buildVietQR', () => {
  it('builds a static QR without amount/note', () => {
    const r = buildVietQR({ bank: 'VCB', account: '0011001234567' });
    expect(r.ok && r.payload.startsWith('000201010211')).toBe(true);
    expect(r.ok && r.payload.includes('5303704')).toBe(true);
    const p = r.ok ? parseVietQR(r.payload) : undefined;
    expect(p?.ok && p.amount).toBeUndefined();
    expect(p?.ok && p.note).toBeUndefined();
    expect(p?.ok && p.crcValid).toBe(true);
  });
  it('warns when the note is sanitized', () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', note: 'Thanh toán đơn hàng #42' });
    expect(r.ok && r.warnings.some((w) => w.includes('sanitized'))).toBe(true);
  });
  it('truncates long notes', () => {
    const long = 'a'.repeat(40);
    const r = buildVietQR({ bank: 'VCB', account: '123', note: long });
    expect(r.ok && r.note?.length).toBe(MAX_NOTE_LENGTH);
    expect(r.ok && r.warnings.some((w) => w.includes('truncated'))).toBe(true);
  });
  it('does not split a surrogate pair when truncating a raw note', () => {
    const r = buildVietQR({
      bank: 'VCB',
      account: '123',
      note: 'a'.repeat(24) + '😀',
      rawNote: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    expect(r.note).toBeDefined();
    expect(lone.test(r.note ?? '')).toBe(false);
    expect(lone.test(r.payload)).toBe(false);
    const p = parseVietQR(r.payload);
    expect(p.ok && p.note).toBe(r.note);
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
});

describe('parseVietQR', () => {
  it('flags a bad CRC with a warning', () => {
    const p = parseVietQR(GOLDEN.slice(0, -4) + '0000');
    expect(p.ok && p.crcValid).toBe(false);
    expect(p.ok && p.warnings.some((w) => w.includes('CRC mismatch'))).toBe(true);
  });
  it('fails on truncated payload', () => {
    expect(parseVietQR(GOLDEN.slice(0, 40)).ok).toBe(false);
  });
  it('detects non-VietQR GUID', () => {
    const r = buildVietQR({ bank: 'VCB', account: '1' });
    if (!r.ok) throw new Error();
    const tampered = r.payload.replace('A000000727', 'A000000775');
    const p = parseVietQR(tampered);
    expect(p.ok && p.isVietQR).toBe(false);
  });
  it('reports static QR as not dynamic', () => {
    const r = buildVietQR({ bank: 'VCB', account: '1' });
    const p = r.ok ? parseVietQR(r.payload) : undefined;
    expect(p?.ok && p.dynamic).toBe(false);
  });
});
