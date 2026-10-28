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
  it('warns when spaces are removed from the account', () => {
    const r = buildVietQR({ bank: 'VCB', account: 'abc def' });
    expect(r.ok && r.account).toBe('abcdef');
    expect(r.ok && r.warnings).toContain(
      'Spaces removed from account "abc def" -> "abcdef"; check the account number.',
    );
  });
  it('warns for grouped account numbers', () => {
    const r = buildVietQR({ bank: 'VCB', account: '0011 0012 34567' });
    expect(r.ok && r.warnings).toContain(
      'Spaces removed from account "0011 0012 34567" -> "0011001234567"; check the account number.',
    );
  });
  it('does not warn for leading/trailing whitespace only', () => {
    const r = buildVietQR({ bank: 'VCB', account: ' 0011001234567 ' });
    expect(r.ok && r.account).toBe('0011001234567');
    expect(r.ok && r.warnings).toEqual([]);
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
  it('sanitizeNote tolerates null, undefined and non-string input', () => {
    expect(sanitizeNote(null as never)).toBe('');
    expect(sanitizeNote(undefined as never)).toBe('');
    expect(sanitizeNote(123 as never)).toBe('123');
  });
  it('treats a null note like an omitted note', () => {
    const withNull = buildVietQR({ bank: 'VCB', account: '123', note: null as never });
    const omitted = buildVietQR({ bank: 'VCB', account: '123' });
    expect(withNull.ok).toBe(true);
    expect(withNull).toEqual(omitted);
    expect(withNull.ok && withNull.note).toBeUndefined();
  });
  it('coerces a numeric note to a string', () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', note: 123 as never });
    expect(r.ok && r.note).toBe('123');
    const raw = buildVietQR({ bank: 'VCB', account: '123', note: 123 as never, rawNote: true });
    expect(raw.ok && raw.note).toBe('123');
  });
  it('builds card service QR', () => {
    const r = buildVietQR({ bank: 'VCB', account: '9704360123456789', service: 'card' });
    expect(r.ok && r.payload.includes('QRIBFTTC')).toBe(true);
  });
  it('warns when a "," group separator is read as thousands', () => {
    for (const [input, value] of [
      ['1,000', 1000],
      ['1,000,000', 1000000],
    ] as const) {
      const r = buildVietQR({ bank: 'VCB', account: '123', amount: input });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.amount).toBe(value);
      const w = r.warnings.filter((x) => x.includes(`"${input}"`));
      expect(w).toHaveLength(1);
      expect(w[0]).toContain(String(value));
    }
  });
  it('gives no amount warning for dot, plain, suffixed or number amounts', () => {
    for (const amount of ['1.000.000', '1000000', '500000đ', 1000000]) {
      const r = buildVietQR({ bank: 'VCB', account: '123', amount });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.warnings.filter((x) => /amount/i.test(x))).toEqual([]);
    }
  });
  it('still rejects "1,5" as INVALID_AMOUNT', () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', amount: '1,5' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_AMOUNT');
  });
  it.each([
    ['50k', '50000'],
    ['1tr2', '1200000'],
    ['1,5 triệu', '1500000'],
  ])('names the exact amount to pass for shorthand "%s"', (amount, value) => {
    const r = buildVietQR({ bank: 'VCB', account: '123', amount });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_AMOUNT');
    expect(r.error.hint).toContain(value);
    expect(r.error.hint).toContain(`"${amount}"`);
  });
  it('keeps the old hint when the amount is unreadable', () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', amount: 'abc' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('INVALID_AMOUNT');
    expect(r.error.hint).toBe('VND has no decimals; pass e.g. 500000.');
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

describe('parseVietQR when the CRC value is 6304', () => {
  const build = () => {
    const r = buildVietQR({ bank: 'VCB', account: '123', amount: 148444 });
    if (!r.ok) throw new Error('build failed');
    return r;
  };

  it('round-trips build -> parse', () => {
    const r = build();
    expect(r.crc).toBe('6304');
    const p = parseVietQR(r.payload);
    expect(p.ok && p.crcValid).toBe(true);
    expect(p.ok && p.warnings.some((w) => w.includes('CRC'))).toBe(false);
  });

  it('still gives the lower-cased hint for a lower-cased payload', () => {
    const p = parseVietQR(build().payload.toLowerCase());
    const warnings = p.ok ? p.warnings : [];
    expect(p.ok && p.crcValid).toBe(false);
    expect(warnings.some((w) => /lower-?cased/i.test(w) && /original/i.test(w))).toBe(true);
    expect(warnings.some((w) => w.startsWith('CRC mismatch'))).toBe(false);
  });
});

describe('parseVietQR lower-cased payloads', () => {
  const build = (note?: string) => {
    const r = buildVietQR({ bank: 'VCB', account: '0011001234567', amount: 50000, note });
    if (!r.ok) throw new Error('build failed');
    return r.payload;
  };

  it('says the payload was lower-cased and not that the GUID is not NAPAS', () => {
    for (const payload of [build(), build('TEST')]) {
      const p = parseVietQR(payload.toLowerCase());
      expect(p.ok && p.crcValid).toBe(false);
      const warnings = p.ok ? p.warnings : [];
      expect(warnings.some((w) => /lower-?cased/i.test(w) && /original/i.test(w))).toBe(true);
      expect(warnings.some((w) => w.startsWith('CRC mismatch'))).toBe(false);
      expect(warnings.some((w) => w.includes('not NAPAS'))).toBe(false);
      expect(warnings.some((w) => /GUID/.test(w) && /lower-?cased/i.test(w))).toBe(true);
    }
  });

  it('keeps the plain CRC mismatch warning for a genuinely wrong CRC', () => {
    const p = parseVietQR(build().slice(0, -4) + '0000');
    const warnings = p.ok ? p.warnings : [];
    expect(warnings.some((w) => w.startsWith('CRC mismatch'))).toBe(true);
    expect(warnings.some((w) => /lower-?cased/i.test(w))).toBe(false);
  });

  it('gives no false hint when the original had a mixed-case note', () => {
    const p = parseVietQR(build('test').toLowerCase());
    expect(p.ok && p.crcValid).toBe(false);
    const warnings = p.ok ? p.warnings : [];
    expect(warnings.some((w) => w.startsWith('CRC mismatch'))).toBe(true);
    expect(warnings.some((w) => /lower-?cased in transit/i.test(w))).toBe(false);
  });
});

describe('SWIFT/BIC lookup', () => {
  it.each([
    ['ASCBVNVX', '970416'],
    ['ascbvnvx', '970416'],
    ['BFTVVNVX', '970436'],
    ['bftvvnvx', '970436'],
    ['CIBBVNVN', '422589'],
    ['ASCBVNVXABC', '970416'],
    ['bftvvnvxxxx', '970436'],
  ])('findBank(%s) -> %s', (q, bin) => {
    expect(findBank(q)?.bin).toBe(bin);
  });
  it('returns undefined for an unknown BIC-like string', () => {
    expect(findBank('ZZZZVNVX')).toBeUndefined();
  });
  it('keeps 8/11-letter aliases resolving', () => {
    expect(findBank('vietcombank')?.bin).toBe('970436');
    expect(findBank('techcombank')?.code).toBe('TCB');
  });
  it('BIC-shaped name queries still use the substring fallback', () => {
    expect(findBank('vietinba')?.shortName).toBe('VietinBank');
  });
  it('searchBanks puts the SWIFT match first', () => {
    expect(searchBanks('BFTVVNVX')[0]?.bin).toBe('970436');
  });
  it('buildVietQR accepts a SWIFT code as bank', () => {
    const r = buildVietQR({ bank: 'BFTVVNVX', account: '0011001234567' });
    expect(r.ok && r.payload.includes('970436')).toBe(true);
  });
});
