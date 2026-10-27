import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync, writeFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  validateInvoice,
  computeTotals,
  MockProvider,
  createProvider,
  NotImplementedError,
  ConfigError,
  roundVnd,
  MisaMeInvoiceProvider,
} from '@vn-skills/core';
import { loadGolden, mergePatch, title } from './golden.js';

type Subset = Record<string, unknown>;

/** Either a literal `input` or an RFC 7396 merge `patch` applied to `base`. */
interface InvoiceCase {
  name: string;
  input?: unknown;
  patch?: Subset;
}

const golden = loadGolden<{
  base: Subset;
  validateInvoice: Array<
    InvoiceCase & {
      expected: Subset & { errorPaths?: string[]; warningPaths?: string[] };
    }
  >;
  computeTotals: Array<
    InvoiceCase & {
      options?: Parameters<typeof computeTotals>[1];
      expected: Subset;
      vatByRate?: Record<string, number>;
    }
  >;
  computeTotalsInvalid: Array<{ name: string; input: unknown; expected: Subset }>;
  roundVnd: Array<{ name: string; input: number; expected: number }>;
}>('vn-einvoice');

const input = (c: InvoiceCase) => ('input' in c ? c.input : mergePatch(golden.base, c.patch));
const base = () => input({ name: 'base', patch: {} });

describe('validateInvoice (golden)', () => {
  it.each(golden.validateInvoice.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const { errorPaths = [], warningPaths = [], ...expected } = c.expected;
    const v = validateInvoice(input(c));
    expect(v).toMatchObject(expected);
    for (const path of errorPaths) expect(v.errors.map((e) => e.path)).toContain(path);
    for (const path of warningPaths) expect(v.warnings.map((w) => w.path)).toContain(path);
  });
});

describe('computeTotals (golden)', () => {
  it.each(golden.computeTotals.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const v = validateInvoice(input(c));
    if (!v.invoice) throw new Error(JSON.stringify(v.errors));
    const t = computeTotals(v.invoice, c.options);
    expect(t).toMatchObject(c.expected);
    for (const [rate, vat] of Object.entries(c.vatByRate ?? {}))
      expect(t.byRate.find((b) => String(b.rate) === rate)?.vat).toBe(vat);
  });
});

describe('computeTotals (invalid input)', () => {
  it.each(golden.computeTotalsInvalid.map((c) => [title(c), c] as const))('%s', (_, c) => {
    const t = computeTotals(c.input as never);
    expect(t).toMatchObject(c.expected);
    expect(t.totalInWordsError?.message).toBeTruthy();
    expect(t.totalInWordsError?.hint).toContain('validateInvoice');
  });

  it('returns INVALID_INVOICE for undefined', () => {
    const t = computeTotals(undefined as never);
    expect(t.lines).toEqual([]);
    expect(t.grandTotal).toBe(0);
    expect(t.totalInWordsError?.code).toBe('INVALID_INVOICE');
  });

  it('skips null and non-object line entries', () => {
    const valid = validateInvoice(base()).invoice!;
    const expected = computeTotals(valid);
    const dirty = { ...valid, lines: [null, 'x', 5, ...valid.lines, undefined] };
    const t = computeTotals(dirty as never);
    expect(t.lines).toHaveLength(valid.lines.length);
    expect(t.subtotal).toBe(expected.subtotal);
    expect(t.vatTotal).toBe(expected.vatTotal);
    expect(t.grandTotal).toBe(expected.grandTotal);
    expect(t.totalInWordsError).toBeUndefined();
  });
});

describe('roundVnd (golden)', () => {
  it.each(golden.roundVnd.map((c) => [title(c), c] as const))('%s', (_, c) =>
    expect(roundVnd(c.input)).toBe(c.expected),
  );
});

describe('MockProvider', () => {
  it('creates, gets, lists and cancels', async () => {
    const p = new MockProvider({ now: () => new Date('2025-10-15T00:00:00Z') });
    const inv = validateInvoice(base()).invoice!;
    const a = await p.createInvoice(inv);
    const b = await p.createInvoice(inv);
    expect(a.number).toBe('00000001');
    expect(b.number).toBe('00000002');
    expect(a.status).toBe('issued');
    expect(a.totals.grandTotal).toBe(7_660_000);
    expect(a.issuedAt).toBe('2025-10-15T00:00:00.000Z');
    expect((await p.getInvoice(a.id))?.id).toBe(a.id);
    expect((await p.listInvoices()).length).toBe(2);
    const c = await p.cancelInvoice(a.id, 'sai thông tin');
    expect(c.status).toBe('cancelled');
    expect((await p.listInvoices({ status: 'cancelled' })).length).toBe(1);
    await expect(p.cancelInvoice(a.id, 'x')).rejects.toThrow(/already cancelled/);
    await expect(p.cancelInvoice('nope', 'x')).rejects.toThrow(/not found/);
    await expect(p.cancelInvoice(b.id, '')).rejects.toThrow(/reason/);
  });
  it('honours an explicit invoice number', async () => {
    const p = new MockProvider();
    const issued = await p.createInvoice({
      ...validateInvoice(base()).invoice!,
      number: '00000099',
    });
    expect(issued.number).toBe('00000099');
  });
  it('createProvider("mock") works', async () => {
    const p = createProvider('mock');
    expect(p.capabilities.mock).toBe(true);
  });
});

describe('real provider skeletons', () => {
  it('throw ConfigError without env', () => {
    expect(() => createProvider('misa', {})).toThrow(ConfigError);
    expect(() => createProvider('viettel', {})).toThrow(ConfigError);
    expect(() => createProvider('vnpt', {})).toThrow(ConfigError);
  });
  it('throw NotImplementedError with env', async () => {
    const env = {
      VN_EINVOICE_MISA_BASE_URL: 'https://sandbox.invalid',
      VN_EINVOICE_MISA_APP_ID: 'x',
      VN_EINVOICE_MISA_TAX_CODE: 'x',
      VN_EINVOICE_MISA_USERNAME: 'x',
      VN_EINVOICE_MISA_PASSWORD: 'x',
    };
    const p = new MisaMeInvoiceProvider(env);
    expect(p.capabilities.create).toBe(false);
    await expect(p.createInvoice(validateInvoice(base()).invoice!)).rejects.toThrow(
      NotImplementedError,
    );
  });
  it('rejects unknown provider', () =>
    expect(() => createProvider('foo' as never)).toThrow(/Unknown provider/));
});

describe('non-finite and overflowing totals', () => {
  const big = () =>
    mergePatch(base(), {
      lines: [{ name: 'X', quantity: 1e300, unitPrice: 1e300, vatRate: 10 }],
    });
  it('computeTotals reports an error for a non-numeric quantity', () => {
    const inv = validateInvoice(base()).invoice!;
    inv.lines[0]!.quantity = 'abc' as unknown as number;
    const t = computeTotals(inv);
    expect(t.totalInWords).toBe('');
    expect(t.totalInWordsError?.code).toBeTruthy();
  });
  it('validateInvoice flags quantity * unitPrice overflow at the line', () => {
    const v = validateInvoice(big());
    expect(v.ok).toBe(false);
    expect(v.errors.map((e) => e.path)).toContain('lines[0]');
  });
  it('computeTotals reports an error for an infinite total', () => {
    const inv = validateInvoice(base()).invoice!;
    inv.lines[0] = { ...inv.lines[0]!, quantity: 1e300, unitPrice: 1e300 };
    expect(computeTotals(inv).totalInWordsError).toBeDefined();
  });
  it('normal totals have no error', () =>
    expect(computeTotals(validateInvoice(base()).invoice!).totalInWordsError).toBeUndefined());
  it('MockProvider refuses to issue a blank amount in words', async () => {
    const inv = validateInvoice(base()).invoice!;
    inv.lines[0] = { ...inv.lines[0]!, quantity: 1e300, unitPrice: 1e300 };
    const err = await new MockProvider().createInvoice(inv).catch((e: unknown) => e);
    expect((err as { error: { code: string } }).error.code).toBe('INVALID_TOTAL');
  });
  it('computeTotals passes through the moneyToWords error', () => {
    const inv = validateInvoice(base()).invoice!;
    inv.lines[0] = { ...inv.lines[0]!, quantity: 1e10, unitPrice: 1e10 };
    const t = computeTotals(inv);
    expect(t.totalInWords).toBe('');
    expect(t.totalInWordsError?.code).toBe('INVALID_AMOUNT');
  });
});

describe('overflowing totals through the CLI and MCP', () => {
  const CLI = resolve(__dirname, '..', 'packages', 'cli', 'dist', 'index.js');
  const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');
  const bad = () => {
    const inv = validateInvoice(base()).invoice!;
    const line = { ...inv.lines[0]!, quantity: 1, unitPrice: 4e15 };
    inv.lines = [line, line, line];
    return inv;
  };
  const text = (r: unknown) =>
    JSON.parse(
      (r as { content: Array<{ type: string; text?: string }> }).content.find(
        (x) => x.type === 'text',
      )!.text!,
    ) as { ok: boolean; error?: { code: string } };
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });
  afterAll(async () => {
    await client.close();
  });

  it('CLI einvoice totals returns ok:false with the error code', () => {
    const r = spawnSync(process.execPath, [CLI, 'einvoice', 'totals', '-', '--json'], {
      encoding: 'utf8',
      input: JSON.stringify(bad()),
    });
    expect(r.status).toBe(1);
    const out = JSON.parse(r.stdout || r.stderr) as { ok: boolean; error: { code: string } };
    expect(out.ok).toBe(false);
    expect(out.error.code).toBe('INVALID_AMOUNT');
  });
  it('CLI einvoice create returns ok:false with the error code', () => {
    const f = resolve(tmpdir(), `vn-bad-invoice-${process.pid}.json`);
    writeFileSync(f, JSON.stringify(bad()));
    const r = spawnSync(process.execPath, [CLI, 'einvoice', 'create', f, '--json'], {
      encoding: 'utf8',
    });
    rmSync(f);
    expect(r.status).toBe(1);
    const out = JSON.parse(r.stdout || r.stderr) as { ok: boolean; error: { code: string } };
    expect(out.error.code).toBe('INVALID_AMOUNT');
  });
  it('MCP vn_einvoice_totals returns ok:false with the error', async () => {
    const j = text(
      await client.callTool({ name: 'vn_einvoice_totals', arguments: { invoice: bad() } }),
    );
    expect(j.ok).toBe(false);
    expect(j.error?.code).toBe('INVALID_AMOUNT');
  });
  it('MCP vn_einvoice_mock_issue returns ok:false with the error', async () => {
    const j = text(
      await client.callTool({ name: 'vn_einvoice_mock_issue', arguments: { invoice: bad() } }),
    );
    expect(j.ok).toBe(false);
    expect(j.error?.code).toBe('INVALID_AMOUNT');
  });
});
