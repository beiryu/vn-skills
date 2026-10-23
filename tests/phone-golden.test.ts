import { describe, expect, it } from 'vitest';
import { AREA_CODES, parsePhone } from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

const golden = loadGolden<{
  parsePhone: Array<{ input: string; expected: Record<string, unknown> }>;
}>('vn-phone');

describe('vn-phone golden', () => {
  for (const c of golden.parsePhone)
    it(title(c), () => {
      expect(parsePhone(c.input)).toMatchObject(c.expected);
    });
});

describe('vn-phone area codes', () => {
  for (const code of Object.keys(AREA_CODES))
    it(`${code} resolves to a 2025 province`, () => {
      const r = parsePhone(code + '12345678'.slice(0, code.length === 3 ? 8 : 7));
      expect(r.ok && r.province2025).toBeTruthy();
    });
});

describe('vn-phone +84 followed by trunk 0', () => {
  it('keeps the carrier of the national form and warns about the extra 0', () => {
    const a = parsePhone('+84 0912345678');
    const b = parsePhone('0912345678');
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.carrier).toEqual(b.carrier);
    expect(a.warnings?.length).toBeGreaterThan(0);
    expect(b.warnings ?? []).toEqual([]);
  });
});
