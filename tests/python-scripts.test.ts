import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadGolden, title } from './golden.js';

const ROOT = resolve(__dirname, '..');
const CLI = join(ROOT, 'packages', 'cli', 'dist', 'index.js');
const MONEY = join(ROOT, 'skills', 'vn-money-words', 'scripts', 'money_words.py');
const TAXID = join(ROOT, 'skills', 'vn-tax-id', 'scripts', 'taxid.py');

const hasPython = spawnSync('python3', ['--version']).status === 0;
if (!hasPython) console.warn('python3 not found on PATH: skipping python-scripts tests');
const d = hasPython ? describe : describe.skip;

function run(script: string, args: string[]): Record<string, any> {
  const r = spawnSync('python3', [script, ...args], { encoding: 'utf8' });
  try {
    return JSON.parse(r.stdout) as Record<string, any>;
  } catch {
    throw new Error(`no JSON from ${script} ${args.join(' ')}: ${r.stdout} ${r.stderr}`);
  }
}

interface MoneyCase {
  name?: string;
  input: number | string;
  options?: Record<string, unknown>;
  expected: string;
}
const money = loadGolden<{
  moneyToWords: MoneyCase[];
  moneyToWordsInvalid: {
    name?: string;
    input: number | string;
    prefix?: string;
    repeat?: number;
  }[];
  wordsToNumber: {
    name?: string;
    input?: string;
    roundTrip?: string;
    expected: Record<string, unknown>;
  }[];
  numberToWords: MoneyCase[];
}>('vn-money-words');

const supported = (c: MoneyCase) =>
  Object.keys(c.options ?? {}).every((k) => k === 'thousand' || k === 'odd');
const flags = (c: MoneyCase) =>
  Object.entries(c.options ?? {}).flatMap(([k, v]) => [`--${k}`, String(v)]);

d('money_words.py (golden)', () => {
  it.each(money.moneyToWords.filter(supported).map((c) => [title(c), c] as const))(
    'words %s',
    (_, c) => {
      const r = run(MONEY, ['words', String(c.input), ...flags(c)]);
      expect(r.ok).toBe(true);
      expect(r.words).toBe(c.expected);
    },
  );
  it.each(money.numberToWords.filter(supported).map((c) => [title(c), c] as const))(
    'words --plain %s',
    (_, c) => {
      const r = run(MONEY, ['words', String(c.input), '--plain', ...flags(c)]);
      expect(r.ok).toBe(true);
      expect(r.words).toBe(c.expected);
    },
  );
  it.each(money.moneyToWordsInvalid.map((c) => [title(c), c] as const))('invalid %s', (_, c) => {
    const input = c.repeat
      ? `${c.prefix ?? ''}${String(c.input).repeat(c.repeat)}`
      : String(c.input);
    const r = run(MONEY, ['words', input]);
    expect(r.ok).toBe(false);
    expect(r.error.code).toBeTypeOf('string');
    if (c.repeat) expect(r.error.code).toBe('INVALID_AMOUNT');
  });
  it.each(money.wordsToNumber.map((c) => [title(c), c] as const))('parse %s', (_, c) => {
    const text = c.roundTrip
      ? (run(MONEY, ['words', c.roundTrip, '--plain']).words as string)
      : (c.input as string);
    const r = run(MONEY, ['parse', text]);
    expect(r).toMatchObject(c.expected);
  });
});

interface TaxCase<E> {
  name?: string;
  input: string;
  expected: E;
}
const tax = loadGolden<{
  taxIdCheckDigit: TaxCase<number | null>[];
  validateTaxId: TaxCase<Record<string, any>>[];
}>('vn-tax-id');

d('taxid.py (golden)', () => {
  it.each(tax.validateTaxId.map((c) => [title(c), c] as const))('validate %s', (_, c) => {
    const r = run(TAXID, ['validate', c.input]);
    const { ok, error, ...rest } = c.expected;
    expect(r.ok).toBe(ok);
    if (ok) expect(r).toMatchObject({ ok, ...rest });
    else if (error) expect(r.error.code).toBe(error.code);
    if (!ok) {
      expect(r.error.message).toBeTypeOf('string');
      expect(r.error).toHaveProperty('hint');
    }
  });
  it.each(tax.taxIdCheckDigit.map((c) => [title(c), c] as const))('check-digit %s', (_, c) => {
    const r = run(TAXID, ['check-digit', c.input]);
    expect(r.ok).toBe(true);
    expect(r.checkDigit).toBe(c.expected);
  });
  it('check-digit rejects non-9-digit input with INVALID_FORMAT', () => {
    const r = run(TAXID, ['check-digit', '12345']);
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe('INVALID_FORMAT');
  });
});

describe('bundled python scripts', () => {
  const STDLIB = new Set(['sys', 'json', 're', 'argparse', 'typing', 'math', 'os', 'unicodedata']);
  it.each([MONEY, TAXID])('%s exists, imports only stdlib, no network', (file) => {
    expect(existsSync(file)).toBe(true);
    const src = readFileSync(file, 'utf8');
    expect(src.endsWith('\n')).toBe(true);
    const mods = [
      ...src.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w., ]+))/gm),
    ].flatMap((m) => (m[1] ? [m[1]] : m[2]!.split(',').map((s) => s.trim().split(/\s+as\s+/)[0]!)));
    for (const m of mods) {
      const top = m.split('.')[0]!;
      if (top === '__future__') continue;
      expect(STDLIB.has(top), `${top} is not an allowed stdlib import`).toBe(true);
    }
    expect(src).not.toMatch(/\b(socket|urllib|http|requests|ssl)\b/);
  });
});

describe('vn-skills install copies scripts/', () => {
  it.each([
    ['vn-money-words', 'money_words.py'],
    ['vn-tax-id', 'taxid.py'],
  ])('%s', (skill, file) => {
    const cwd = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const home = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const r = spawnSync(process.execPath, [CLI, 'install', skill, '--agent', 'claude'], {
      encoding: 'utf8',
      cwd,
      env: { ...process.env, HOME: home, USERPROFILE: home },
    });
    expect(r.status).toBe(0);
    expect(existsSync(join(cwd, '.claude', 'skills', skill, 'scripts', file))).toBe(true);
  });
});
