import { describe, expect, it } from 'vitest';
import { parseCitizenId } from '@vn-skills/core';
import { loadGolden } from './golden.js';

const golden = loadGolden<{ parse: Array<{ input: string; expected: Record<string, unknown> }> }>(
  'vn-id',
);

describe('vn-id golden fixtures', () => {
  it.each(golden.parse.map((c) => [c.input, c] as const))('parse %s', (_, c) => {
    expect(parseCitizenId(c.input)).toMatchObject(c.expected);
  });
});
