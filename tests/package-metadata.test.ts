import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Pkg {
  description: string;
  keywords?: string[];
}

function load(name: string): Pkg {
  return JSON.parse(
    readFileSync(resolve(__dirname, '..', 'packages', name, 'package.json'), 'utf8'),
  ) as Pkg;
}

const COMMON = [
  'vietnam',
  'vietnamese',
  'vietqr',
  'napas',
  'cccd',
  'ma-so-thue',
  'am-lich',
  'lunar',
  'hoa-don',
  'einvoice',
  'dia-chi',
  'address',
  'holidays',
  'agent-skills',
];
const AGENTS = ['claude', 'cursor', 'codex'];

const AREAS: Array<[string, RegExp]> = [
  ['VietQR', /vietqr/i],
  ['addresses', /address/i],
  ['tax IDs', /tax/i],
  ['CCCD', /cccd/i],
  ['phone', /phone/i],
  ['holidays', /holiday/i],
  ['working days', /working day/i],
  ['money in words', /money in words|money-in-words/i],
  ['number formatting', /number format/i],
  ['names', /names?\b/i],
  ['lunar calendar', /lunar/i],
  ['e-invoice', /e-invoice/i],
];

const expected: Record<string, string[]> = {
  core: COMMON,
  cli: [...COMMON, ...AGENTS],
  mcp: [...COMMON, ...AGENTS, 'mcp', 'model-context-protocol'],
};

describe.each(Object.keys(expected))('packages/%s metadata', (name) => {
  const pkg = load(name);

  it.each(AREAS)('description mentions %s', (_label, re) => {
    expect(pkg.description).toMatch(re);
  });

  it('has the required keywords', () => {
    expect(pkg.keywords ?? []).toEqual(expect.arrayContaining(expected[name]!));
  });
});

describe('packages/mcp/server.json (MCP Registry)', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
  const read = (p: string): Record<string, any> =>
    JSON.parse(readFileSync(resolve(__dirname, '..', 'packages', 'mcp', p), 'utf8'));
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
  const server = read('server.json');
  const pkg = read('package.json');

  it('description fits the registry limit of 100 characters', () => {
    expect(server.description.length).toBeLessThanOrEqual(100);
  });

  it.each([
    ['phone numbers', /phone/i],
    ['names', /names?\b/i],
    ['number formatting', /format/i],
  ])('description mentions %s', (_label, re) => {
    expect(server.description).toMatch(re);
  });

  it('versions match packages/mcp/package.json', () => {
    expect(server.version).toBe(pkg.version);
    expect(server.packages[0].version).toBe(pkg.version);
  });
});
