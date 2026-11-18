import { describe, expect, it } from 'vitest';
import { buildVietQR, moneyToWords, formatNumber, renderVietQRCard } from '@vn-skills/core';

// Deterministic 25x25 checker-ish matrix; the caller normally supplies the real QR matrix.
const modules: boolean[][] = Array.from({ length: 25 }, (_, y) =>
  Array.from({ length: 25 }, (_, x) => (x * 3 + y * 5 + x * y) % 3 === 0),
);
const darkCount = modules.flat().filter(Boolean).length;

function card(
  build: Parameters<typeof buildVietQR>[0],
  opts: Parameters<typeof renderVietQRCard>[1] = {},
  m = modules,
) {
  const b = buildVietQR(build);
  if (!b.ok) throw new Error('build failed');
  return renderVietQRCard({ ...b, modules: m }, opts);
}
const withAmount = { bank: 'VCB', account: '0011001234567', amount: 500000, note: 'thanh toan' };
const noAmount = { bank: 'VCB', account: '0011001234567' };

function svgOf(r: ReturnType<typeof card>): string {
  if (!r.ok) throw new Error('render failed');
  return r.svg;
}

describe('renderVietQRCard', () => {
  it('is exported and returns svg, width and height', () => {
    expect(typeof renderVietQRCard).toBe('function');
    const r = card(withAmount);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.svg.startsWith('<svg')).toBe(true);
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
    }
  });

  it('draws one rect per dark module (plus background/other rects are not counted as modules)', () => {
    const plain = svgOf(card(noAmount));
    const rects = (plain.match(/<rect\b/g) ?? []).length;
    // Allow a small number of non-module rects (background, border).
    expect(rects).toBeGreaterThanOrEqual(darkCount);
    expect(rects - darkCount).toBeLessThanOrEqual(3);
  });

  it('rect count grows with the number of dark modules', () => {
    const none = modules.map((r) => r.map(() => false));
    none[0]![0] = true;
    const a = (svgOf(card(noAmount, {}, none)).match(/<rect\b/g) ?? []).length;
    const b = (svgOf(card(noAmount)).match(/<rect\b/g) ?? []).length;
    expect(b - a).toBe(darkCount - 1);
  });

  it('shows bank short name and account number', () => {
    const svg = svgOf(card(withAmount));
    expect(svg).toContain('0011001234567');
    expect(svg).toContain('Vietcombank');
  });

  it('shows formatted amount and capitalised words when there is an amount', () => {
    const svg = svgOf(card(withAmount));
    const f = formatNumber(500000, { maxFractionDigits: 0 });
    expect(f.ok && svg).toContain(`${f.ok ? f.text : ''} ₫`);
    const w = moneyToWords(500000);
    if (!w.ok) throw new Error('words');
    const cap = w.words.charAt(0).toUpperCase() + w.words.slice(1);
    expect(svg).toContain(cap);
  });

  it('omits amount and words when the QR has no amount', () => {
    const svg = svgOf(card(noAmount));
    expect(svg).not.toContain('₫');
    expect(svg).not.toContain('đồng');
  });

  it('shows the note when present and not when absent', () => {
    expect(svgOf(card(withAmount))).toContain('thanh toan');
    expect(svgOf(card(noAmount))).not.toContain('thanh toan');
  });

  it('shows accountName as display text only', () => {
    const b = buildVietQR(withAmount);
    const r = card(withAmount, { accountName: 'NGUYEN VAN A' });
    expect(svgOf(r)).toContain('NGUYEN VAN A');
    expect(b.ok && b.payload).not.toContain('NGUYEN VAN A');
  });

  it('escapes accountName with <&">\'', () => {
    const svg = svgOf(card(withAmount, { accountName: `A<&">'B` }));
    expect(svg).toContain('A&lt;&amp;&quot;&gt;&apos;B');
    expect(svg).not.toContain('A<&');
  });

  it('is well-formed: no unescaped & or < inside text nodes', () => {
    const svg = svgOf(card(withAmount, { accountName: 'A <b> & "c"' }));
    const texts = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]!);
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t).not.toMatch(/</);
      expect(t).not.toMatch(/&(?!(amp|lt|gt|quot|apos|#\d+);)/);
    }
  });

  describe('long lines wrap inside the card', () => {
    const texts = (svg: string) =>
      [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]!);
    const long = {
      bank: 'VietinBank',
      account: '0011001234567',
      amount: 987654321987,
      note: 'thanhtoanhoadondiennuocthang11nam2026khachhang0123456789',
    };
    for (const template of ['card', 'print'] as const) {
      it(`${template}: no line wider than the card, nothing lost`, () => {
        const r = card(long, {
          template,
          accountName: 'CONG TY TNHH THUONG MAI DICH VU XUAT NHAP KHAU NGUYEN VAN A',
        });
        if (!r.ok) throw new Error('render failed');
        const fs = Number(/font-size="(\d+)"/.exec(r.svg)![1]);
        const pad = template === 'print' ? 32 : 20;
        const rows = texts(r.svg);
        for (const t of rows)
          expect([...t].length * fs * 0.6).toBeLessThanOrEqual(r.width - pad * 2);
        const all = rows.join(' ');
        const words = moneyToWords(long.amount, { thousand: 'nghìn' });
        if (!words.ok) throw new Error('words');
        for (const w of words.words.split(' ').slice(1)) expect(all).toContain(w);
        const b = buildVietQR(long);
        if (!b.ok || !b.note) throw new Error('build');
        expect(rows.join('')).toContain(b.note); // a word longer than a row is cut, not dropped
        expect(all).toContain('VietinBank');
        // Each wrapped row adds one line of height.
        const short = card({ bank: 'VCB', account: '1' }, { template });
        expect(short.ok && r.height > short.height).toBe(true);
      });
    }
    it('keeps a line that fits on one row', () => {
      expect(texts(svgOf(card(withAmount)))).toContain('0011001234567');
      expect(texts(svgOf(card(withAmount)))).toContain('500.000 ₫');
    });
  });

  it('print template is taller than card', () => {
    const c = card(withAmount, { template: 'card' });
    const p = card(withAmount, { template: 'print' });
    expect(c.ok && p.ok && p.height > c.height).toBe(true);
  });

  it('uses a generic font stack and no remote resources', () => {
    const svg = svgOf(card(withAmount));
    expect(svg).toContain('sans-serif');
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    expect(svg).not.toContain('<image');
    expect(svg).not.toContain('@font-face');
  });

  it('thousand: ngàn changes the words', () => {
    const a = svgOf(card({ ...withAmount, amount: 2000 }, { thousand: 'ngàn' }));
    expect(a).toContain('ngàn');
  });

  it('fails with INVALID_INPUT for empty modules', () => {
    const r = card(withAmount, {}, []);
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('fails with INVALID_INPUT for a failed build result', () => {
    const bad = buildVietQR({ bank: 'nope-bank', account: '1' });
    expect(bad.ok).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = renderVietQRCard({ ...(bad as any), modules }, {});
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
});
