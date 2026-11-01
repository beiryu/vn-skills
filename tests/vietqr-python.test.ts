import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildVietQR,
  findBank,
  parseVietQR,
  searchBanks,
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
  findBank: Case<string, Subset | null>[];
  buildVietQR: Case<BuildVietQROptions, Subset>[];
  parseVietQR: Case<string, Subset>[];
}>('vietqr');

const ROOT = resolve(__dirname, '..');
const SCRIPT = resolve(ROOT, 'skills/vietqr/scripts/vietqr.py');
const BANKS_COPY = resolve(ROOT, 'skills/vietqr/scripts/banks.json');
const hasPython = spawnSync('python3', ['--version']).status === 0;
if (!hasPython) console.warn('python3 not found on PATH: skipping vietqr.py tests');
const describePy = hasPython ? describe : describe.skip;

interface Out {
  ok: boolean;
  payload?: string;
  crcValid?: boolean;
  expectedCrc?: string;
  banks: Subset[];
  error: { code: string; message?: string; hint?: string };
}

function run(args: string[]): Out {
  const r = spawnSync('python3', [SCRIPT, ...args], { encoding: 'utf8' });
  try {
    return JSON.parse(r.stdout) as Out;
  } catch {
    throw new Error(`vietqr.py ${args.join(' ')} gave non-JSON output: ${r.stdout}\n${r.stderr}`);
  }
}

function buildArgs(o: BuildVietQROptions): string[] {
  const a = ['build', `--bank=${o.bank}`, `--account=${o.account}`];
  if (o.amount !== undefined && o.amount !== null) a.push(`--amount=${o.amount}`);
  if (typeof o.note === 'string' || typeof o.note === 'number') a.push(`--note=${o.note}`);
  if (o.service === 'card') a.push('--service=QRIBFTTC');
  return a;
}

// Cases using options the Python script does not expose (rawNote, forced dynamic) or a null note are excluded.
const buildCases = golden.buildVietQR
  .filter((c) => !c.input.rawNote && c.input.dynamic === undefined && c.input.note !== null)
  .map((c) => [title(c), c] as const);

describePy('vietqr.py golden cases', () => {
  it.each(buildCases)('build: %s', (_, c) => {
    expect(run(buildArgs(c.input))).toMatchObject(c.expected);
  });
  it.each(golden.parseVietQR.map((c) => [title(c), c] as const))('parse: %s', (_, c) => {
    expect(run(['parse', c.input])).toMatchObject(c.expected);
  });
  it.each(golden.findBank.map((c) => [title(c), c] as const))('banks lookup: %s', (_, c) => {
    const out = run(['banks', c.input]);
    expect(out.ok).toBe(true);
    if (c.expected === null) expect(findBank(c.input)).toBeUndefined();
    else expect(out.banks[0]).toMatchObject(c.expected);
  });
});

describePy('vietqr.py behaviour', () => {
  it('prints the issue example payload equal to core', () => {
    const core = buildVietQR({
      bank: 'VCB',
      account: '0011001234567',
      amount: 500000,
      note: 'don 123',
    });
    if (!core.ok) throw new Error('core failed');
    const out = run([
      'build',
      '--bank',
      'VCB',
      '--account',
      '0011001234567',
      '--amount',
      '500000',
      '--note',
      'don 123',
    ]);
    expect(out.ok).toBe(true);
    expect(out.payload).toBe(core.payload);
  });

  it('supports the card service', () => {
    const core = buildVietQR({ bank: 'VCB', account: '123', service: 'card' });
    if (!core.ok) throw new Error('core failed');
    expect(
      run(['build', '--bank', 'VCB', '--account', '123', '--service', 'QRIBFTTC']).payload,
    ).toBe(core.payload);
  });

  it('invalid bank, amount and account give the core error codes', () => {
    const bad = buildVietQR({ bank: 'nope-bank', account: '123' });
    const out = run(['build', '--bank', 'nope-bank', '--account', '123']);
    expect(out.ok).toBe(false);
    expect(out.error.code).toBe(bad.ok ? undefined : bad.error.code);
    expect(out.error.code).toBe('BANK_NOT_FOUND');
    expect(out.error).toHaveProperty('message');
    expect(out.error).toHaveProperty('hint');
    expect(run(['build', '--bank', 'VCB', '--account', '123', '--amount', '12.5']).error.code).toBe(
      'INVALID_AMOUNT',
    );
    expect(run(['build', '--bank', 'VCB', '--account', '12-34']).error.code).toBe(
      'INVALID_ACCOUNT',
    );
  });

  it('a bad CRC is reported like core', () => {
    const p =
      '00020101021238530010A000000727012300069704230109mynamebvh0208QRIBFTTA53037045405500005802VN62080804test63040000';
    const core = parseVietQR(p);
    const out = run(['parse', p]);
    expect(out.ok).toBe(true);
    expect(out.crcValid).toBe(false);
    if (core.ok) expect(out.expectedCrc).toBe(core.expectedCrc);
  });

  it('unparseable payloads give the core error codes', () => {
    for (const p of ['abc', 'hello world']) {
      const core = parseVietQR(p);
      const out = run(['parse', p]);
      expect(out.ok).toBe(false);
      expect(out.error.code).toBe(core.ok ? undefined : core.error.code);
    }
  });

  it('banks <query> matches searchBanks for BIN, code and name', () => {
    for (const q of ['970436', 'VCB', 'Vietcombank']) {
      const out = run(['banks', q]);
      expect(out.ok).toBe(true);
      expect(out.banks[0]?.bin).toBe(searchBanks(q)[0]?.bin);
    }
  });

  it('--out is refused with a hint about the Node CLI', () => {
    const out = run(['build', '--bank', 'VCB', '--account', '123', '--out', 'x.png']);
    expect(out.ok).toBe(false);
    expect(out.error.hint).toMatch(/node/i);
  });
});

describe('vietqr.py packaging', () => {
  it('exists and ends with a newline', () => {
    expect(existsSync(SCRIPT)).toBe(true);
    expect(readFileSync(SCRIPT, 'utf8').endsWith('\n')).toBe(true);
  });

  it('banks.json equals packages/core/data/banks.json', () => {
    const core = JSON.parse(
      readFileSync(resolve(ROOT, 'packages/core/data/banks.json'), 'utf8'),
    ) as unknown;
    const raw = readFileSync(BANKS_COPY, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(JSON.parse(raw)).toEqual(core);
  });

  it('imports only standard-library modules and no network code', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    const mods = [...src.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w., ]+))/gm)]
      .flatMap((m) => (m[1] ?? m[2] ?? '').split(',').map((s) => s.trim().split(/\s+as\s+/)[0]!))
      .map((m) => m.split('.')[0]!)
      .filter(Boolean);
    expect(mods.length).toBeGreaterThan(0);
    if (hasPython) {
      const r = spawnSync(
        'python3',
        ['-c', 'import sys,json;print(json.dumps(sorted(sys.stdlib_module_names)))'],
        { encoding: 'utf8' },
      );
      const std = new Set(JSON.parse(r.stdout) as string[]);
      expect(mods.filter((m) => m !== '__future__' && !std.has(m))).toEqual([]);
    }
    expect(
      mods.filter((m) =>
        ['socket', 'urllib', 'http', 'ssl', 'ftplib', 'smtplib', 'requests'].includes(m),
      ),
    ).toEqual([]);
  });
});
