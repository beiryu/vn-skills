import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as core from '@vn-skills/core';
import { computeTotals, VAT_RATES } from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

interface R {
  ok: boolean;
  net: number;
  vat: number;
  gross: number;
  error: { code: string; hint?: string };
}
type Fn = (amount: unknown, rate: unknown) => R;
const splitVatInclusive = (core as unknown as { splitVatInclusive: Fn }).splitVatInclusive;
const applyVat = (core as unknown as { applyVat: Fn }).applyVat;

const CLI = resolve(__dirname, '..', 'packages', 'cli', 'dist', 'index.js');
const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

const golden = loadGolden<{
  vat: Array<{
    name: string;
    fn: 'splitVatInclusive' | 'applyVat';
    input: [unknown, unknown];
    expected: Record<string, unknown>;
  }>;
}>('vn-einvoice');

describe('einvoice vat (golden)', () => {
  it.each(golden.vat.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const fn = c.fn === 'applyVat' ? applyVat : splitVatInclusive;
    expect(fn(...c.input)).toMatchObject(c.expected);
  });
});

describe('splitVatInclusive', () => {
  it('1 080 000 @8', () =>
    expect(splitVatInclusive(1_080_000, 8)).toMatchObject({
      ok: true,
      gross: 1_080_000,
      net: 1_000_000,
      vat: 80_000,
      rate: 8,
    }));
  it('110 000 @10', () =>
    expect(splitVatInclusive(110_000, 10)).toMatchObject({ net: 100_000, vat: 10_000 }));
  it('100 000 @8', () =>
    expect(splitVatInclusive(100_000, 8)).toMatchObject({ net: 92_593, vat: 7_407 }));
  it('@5', () => expect(splitVatInclusive(105_000, 5)).toMatchObject({ net: 100_000, vat: 5_000 }));
  it.each([0, 'KCT', 'KKKNT'])('rate %s keeps net = gross', (r) =>
    expect(splitVatInclusive(123_456, r)).toMatchObject({ ok: true, net: 123_456, vat: 0 }),
  );
  it('amount 0', () =>
    expect(splitVatInclusive(0, 10)).toMatchObject({ ok: true, net: 0, vat: 0, gross: 0 }));
  it('large amount', () =>
    expect(splitVatInclusive(1_100_000_000_000, 10)).toMatchObject({
      net: 1_000_000_000_000,
      vat: 100_000_000_000,
    }));
  it('invalid rate', () => {
    const r = splitVatInclusive(1000, 7);
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe('INVALID_VAT_RATE');
    expect(r.error.hint).toBeTruthy();
  });
  it.each([-1, 1.5, NaN, Infinity, '1000', null, undefined])('invalid amount %s', (a) => {
    const r = splitVatInclusive(a, 10);
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe('INVALID_AMOUNT');
    expect(r.error.hint).toBeTruthy();
  });
  it('net + vat === gross for many amounts and rates', () => {
    for (const rate of VAT_RATES) {
      for (let g = 0; g <= 3000; g += 7) {
        const r = splitVatInclusive(g, rate);
        expect(r.ok).toBe(true);
        expect(r.net + r.vat).toBe(g);
      }
    }
  });
});

describe('applyVat', () => {
  it('1 000 000 @8', () =>
    expect(applyVat(1_000_000, 8)).toMatchObject({
      ok: true,
      net: 1_000_000,
      vat: 80_000,
      gross: 1_080_000,
      rate: 8,
    }));
  it('KCT has no VAT', () => expect(applyVat(500, 'KCT')).toMatchObject({ vat: 0, gross: 500 }));
  it('invalid rate', () => expect(applyVat(1000, 3).error.code).toBe('INVALID_VAT_RATE'));
  it('negative amount', () => expect(applyVat(-5, 10).error.code).toBe('INVALID_AMOUNT'));
  it('string amount does not throw', () => expect(applyVat('5', 10).ok).toBe(false));
  it('agrees with computeTotals on a one-line invoice', () => {
    for (const rate of VAT_RATES) {
      for (const net of [0, 1, 99_999, 92_593, 1_234_567]) {
        const t = computeTotals({
          series: '1C25TAA',
          issueDate: '2025-10-15',
          seller: { name: 'A', taxId: '0100233488', address: 'HN' },
          buyer: { name: 'B', address: 'HCM' },
          lines: [{ name: 'X', quantity: 1, unitPrice: net, vatRate: rate }],
        });
        const a = applyVat(net, rate);
        expect(a.vat).toBe(t.vatTotal);
        expect(a.gross).toBe(t.grandTotal);
      }
    }
  });
});

describe('einvoice vat CLI', () => {
  const run = (args: string[]) => {
    const r = spawnSync(process.execPath, [CLI, 'einvoice', 'vat', ...args], { encoding: 'utf8' });
    return { code: r.status, json: () => JSON.parse(r.stdout) as Record<string, unknown> };
  };
  it('--inclusive splits', () => {
    const r = run(['1080000', '--rate', '8', '--inclusive']);
    expect(r.code).toBe(0);
    expect(r.json()).toMatchObject({ net: 1_000_000, vat: 80_000, gross: 1_080_000 });
  });
  it('applies VAT without --inclusive', () => {
    const r = run(['1000000', '--rate', '8']);
    expect(r.json()).toMatchObject({ net: 1_000_000, vat: 80_000, gross: 1_080_000 });
  });
  it('rejects an invalid rate', () => expect(run(['1000', '--rate', '7']).code).not.toBe(0));
});

describe('vn_einvoice_vat MCP tool', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });
  afterAll(async () => {
    await client.close();
  });
  const call = async (args: Record<string, unknown>) => {
    const r = await client.callTool({ name: 'vn_einvoice_vat', arguments: args });
    const c = (r.content as Array<{ type: string; text?: string }>).find((x) => x.type === 'text');
    return JSON.parse(c!.text!) as Record<string, unknown>;
  };
  it('inclusive', async () =>
    expect(await call({ amount: 1_080_000, rate: 8, inclusive: true })).toMatchObject({
      net: 1_000_000,
      vat: 80_000,
    }));
  it('forward', async () =>
    expect(await call({ amount: 100_000, rate: 10 })).toMatchObject({
      vat: 10_000,
      gross: 110_000,
    }));
  it('has title and annotations', async () => {
    const t = (await client.listTools()).tools.find((x) => x.name === 'vn_einvoice_vat');
    expect(t?.title).toBeTruthy();
    expect(t?.annotations?.readOnlyHint).toBe(true);
    expect(t?.annotations?.openWorldHint).toBe(false);
  });
});
