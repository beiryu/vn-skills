import { describe, expect, it } from 'vitest';
import { formatDate } from '@vn-skills/core';
import { loadGolden } from './golden.js';

const golden = loadGolden<{
  formatDate: Array<{ input: string; expected: string | null }>;
}>('vn-number-format');

describe('vn-number-format golden fixtures', () => {
  it.each(golden.formatDate.map((c) => [c.input, c] as const))('formatDate %s', (_, c) => {
    if (c.expected === null) {
      expect(formatDate(c.input)).toMatchObject({ ok: false, error: { code: 'INVALID_DATE' } });
    } else {
      expect(formatDate(c.input)).toEqual({ ok: true, text: c.expected });
    }
  });
});
