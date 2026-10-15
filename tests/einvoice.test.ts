import { describe, expect, it } from 'vitest';
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
