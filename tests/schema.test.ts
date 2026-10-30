import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCitizenId, parsePhone, validateTaxId } from '@vn-skills/core';

// Standard Schema v1 interface, copied from the spec as a consumer would.
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) =>
      | { readonly value: Output; readonly issues?: undefined }
      | { readonly issues: ReadonlyArray<{ readonly message: string; readonly path?: unknown }> }
      | Promise<unknown>;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}

const distDir = resolve(__dirname, '..', 'packages', 'core', 'dist', 'schema');
const mod = (await import(pathToFileURL(resolve(distDir, 'index.js')).href)) as {
  vnPhone: () => StandardSchemaV1<unknown, unknown>;
  vnTaxId: () => StandardSchemaV1<unknown, unknown>;
  vnCitizenId: () => StandardSchemaV1<unknown, unknown>;
};
const { vnPhone, vnTaxId, vnCitizenId } = mod;

function run(schema: StandardSchemaV1<unknown, unknown>, value: unknown) {
  const r = schema['~standard'].validate(value);
  if (r instanceof Promise) throw new Error('unexpected async validation');
  return r as { value?: unknown; issues?: { message: string; code?: string }[] };
}

const cccd = '001090123456';

describe('@vn-skills/core/schema: build output', () => {
  it('emits dist/schema/index.js and index.d.ts', () => {
    expect(existsSync(resolve(distDir, 'index.js'))).toBe(true);
    expect(existsSync(resolve(distDir, 'index.d.ts'))).toBe(true);
  });

  it('declares a ./schema export', async () => {
    const { default: pkg } = await import('../packages/core/package.json');
    expect(pkg.exports['./schema']).toMatchObject({
      types: expect.any(String),
      import: expect.any(String),
    });
  });
});

describe.each([
  ['vnPhone', vnPhone],
  ['vnTaxId', vnTaxId],
  ['vnCitizenId', vnCitizenId],
] as const)('%s: Standard Schema shape', (_, factory) => {
  const s = factory();
  it('has version 1 and vendor vn-skills', () => {
    expect(s['~standard'].version).toBe(1);
    expect(s['~standard'].vendor).toBe('vn-skills');
    expect(typeof s['~standard'].validate).toBe('function');
  });

  it.each([null, undefined, 123, {}, [], true])('does not throw on %j', (v) => {
    const r = run(s, v);
    expect(r.issues?.length).toBeGreaterThan(0);
    expect(r.issues?.[0]?.message).toBeTruthy();
  });
});

describe('vnPhone', () => {
  it.each(['0912345678', '+84912345678', '0912 345 678'])('accepts %s', (v) => {
    const r = run(vnPhone(), v);
    expect(r.issues).toBeUndefined();
    expect(r.value).toMatchObject({ e164: '+84912345678' });
  });

  it('output equals parsePhone result', () => {
    const expected = parsePhone('0912345678');
    expect(run(vnPhone(), '0912345678').value).toMatchObject(
      expected.ok ? { e164: expected.e164, formatted: expected.formatted } : {},
    );
  });

  it('accepts an old 11-digit mobile number', () => {
    const r = run(vnPhone(), '01621234567');
    expect(r.issues).toBeUndefined();
    expect(r.value).toMatchObject({ type: 'mobile' });
  });

  it.each(['abc', '', '12345'])('rejects %j with a code', (v) => {
    const r = run(vnPhone(), v);
    expect(r.issues).toHaveLength(1);
    expect(r.issues?.[0]?.message).toBeTruthy();
    expect(r.issues?.[0]?.code).toBeTruthy();
  });
});

describe('vnTaxId', () => {
  it('accepts 0100233488 and returns TaxIdInfo with normalized', () => {
    const r = run(vnTaxId(), '0100233488');
    expect(r.issues).toBeUndefined();
    expect(r.value).toMatchObject({ normalized: '0100233488', checksumValid: true });
  });

  it('accepts a branch suffix', () => {
    expect(run(vnTaxId(), '0100233488-001').issues).toBeUndefined();
  });

  it('rejects a failed check digit with INVALID_CHECKSUM', () => {
    const r = run(vnTaxId(), '0100233480');
    expect(r.issues).toHaveLength(1);
    expect(r.issues?.[0]?.code).toBe('INVALID_CHECKSUM');
  });

  it('appends the hint in parentheses', () => {
    const core = validateTaxId('0100233480');
    const r = run(vnTaxId(), '0100233480');
    if (!core.ok && core.error.hint) {
      expect(r.issues?.[0]?.message).toBe(`${core.error.message} (${core.error.hint})`);
    } else if (!core.ok) {
      expect(r.issues?.[0]?.message).toBe(core.error.message);
    }
  });

  it.each(['', 'abc', '12'])('rejects %j', (v) => {
    expect(run(vnTaxId(), v).issues?.length).toBe(1);
  });
});

describe('vnCitizenId', () => {
  it('accepts a 12-digit CCCD and returns the parsed result', () => {
    const r = run(vnCitizenId(), cccd);
    expect(r.issues).toBeUndefined();
    expect(r.value).toMatchObject({ kind: 'cccd', normalized: cccd, provinceCode: '001' });
  });

  it('accepts a 9-digit CMND', () => {
    expect(run(vnCitizenId(), '123456789').value).toMatchObject({ kind: 'cmnd' });
  });

  it('passes through a CCCD with an unknown province code like parseCitizenId', () => {
    const core = parseCitizenId('999090123456');
    const r = run(vnCitizenId(), '999090123456');
    expect(core.ok).toBe(true);
    expect(r.issues).toBeUndefined();
    expect(r.value).toMatchObject({ provinceCode: '999', province: null });
  });

  it.each(['12345', 'abcdefghijkl', ''])('rejects %j with a code', (v) => {
    const r = run(vnCitizenId(), v);
    expect(r.issues).toHaveLength(1);
    expect(r.issues?.[0]?.code).toBeTruthy();
  });
});
