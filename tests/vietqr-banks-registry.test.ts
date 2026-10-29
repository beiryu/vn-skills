import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  BANKS,
  buildVietQR,
  findBank,
  listBanks,
  parseVietQR,
  registerBanks,
  resetBanks,
  searchBanks,
  type Bank,
} from '@vn-skills/core';

const CLI = resolve(__dirname, '..', 'packages', 'cli', 'dist', 'index.js');
const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

const custom: Bank = {
  bin: '990001',
  code: 'TESTPAY',
  shortName: 'TestPay',
  name: 'Test Pay Wallet',
  keywords: ['zebrawallet'],
};
const bundled = BANKS[0]!;

function tmpJson(data: unknown): string {
  const f = join(mkdtempSync(join(tmpdir(), 'vn-skills-banks-')), 'banks.json');
  writeFileSync(f, JSON.stringify(data));
  return f;
}

function cli(args: string[]) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

afterEach(() => resetBanks());

describe('registerBanks', () => {
  it('merge adds a new BIN', () => {
    const r = registerBanks([custom]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.count).toBe(BANKS.length + 1);
      expect(r.added).toEqual(['990001']);
      expect(r.replaced).toEqual([]);
    }
    expect(listBanks()).toHaveLength(BANKS.length + 1);
  });

  it('merge is the default mode and mode "merge" behaves the same', () => {
    const r = registerBanks([custom], { mode: 'merge' });
    expect(r.ok && r.count).toBe(BANKS.length + 1);
  });

  it('merge overrides the name and code of a bundled BIN', () => {
    const r = registerBanks([{ ...bundled, code: 'NEWCODE', name: 'Renamed Bank' }]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.replaced).toEqual([bundled.bin]);
      expect(r.added).toEqual([]);
      expect(r.count).toBe(BANKS.length);
    }
    expect(findBank(bundled.bin)?.name).toBe('Renamed Bank');
    expect(findBank('NEWCODE')?.bin).toBe(bundled.bin);
  });

  it('replace makes the entries the whole list', () => {
    const r = registerBanks([custom], { mode: 'replace' });
    expect(r.ok && r.count).toBe(1);
    expect(listBanks().map((b) => b.bin)).toEqual(['990001']);
    expect(findBank(bundled.bin)).toBeUndefined();
  });

  it('keeps the BANKS export as the bundled list', () => {
    const before = BANKS.length;
    registerBanks([custom], { mode: 'replace' });
    expect(BANKS).toHaveLength(before);
  });

  it('rejects a duplicate BIN within the entries and leaves the registry unchanged', () => {
    const r = registerBanks([custom, { ...custom, code: 'OTHER' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_BANKS');
    expect(listBanks()).toHaveLength(BANKS.length);
    expect(findBank('990001')).toBeUndefined();
  });

  it('rejects a duplicate code (case-insensitive) and leaves the registry unchanged', () => {
    const r = registerBanks([custom, { ...custom, bin: '990002', code: 'testpay' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_BANKS');
    expect(listBanks()).toHaveLength(BANKS.length);
  });

  it('rejects a new entry whose code collides with a remaining bundled bank', () => {
    const r = registerBanks([{ ...custom, code: bundled.code.toLowerCase() }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_BANKS');
  });

  it('rejects an invalid BIN, naming the entry index', () => {
    const r = registerBanks([custom, { ...custom, bin: '12345', code: 'X' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('INVALID_BANKS');
      expect(r.error.message).toMatch(/1/);
    }
    expect(listBanks()).toHaveLength(BANKS.length);
    expect(findBank('990001')).toBeUndefined();
  });

  it.each([
    ['non-digit BIN', { bin: '99000A' }],
    ['empty code', { code: '' }],
    ['empty shortName', { shortName: '' }],
    ['empty name', { name: '' }],
    ['bad swift', { swift: 'ABC' }],
    ['bad vietqr', { vietqr: 'maybe' }],
  ])('rejects %s', (_label, patch) => {
    const r = registerBanks([{ ...custom, ...patch } as Bank]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_BANKS');
    expect(listBanks()).toHaveLength(BANKS.length);
  });

  it('accepts 8 and 11 character swift codes and valid vietqr values', () => {
    const r = registerBanks([
      { ...custom, swift: 'ABCDVNVX', vietqr: 'transfer' },
      { ...custom, bin: '990002', code: 'TESTPAY2', swift: 'ABCDVNVX123', vietqr: 'none' },
    ]);
    expect(r.ok).toBe(true);
  });
});

describe('resetBanks', () => {
  it('restores the bundled list', () => {
    registerBanks([custom], { mode: 'replace' });
    resetBanks();
    expect(listBanks()).toEqual([...BANKS]);
    expect(findBank('990001')).toBeUndefined();
    expect(findBank(bundled.bin)).toBeDefined();
  });
});

describe('lookups read the registry', () => {
  it('findBank resolves by new code and by keyword', () => {
    registerBanks([custom]);
    expect(findBank('TESTPAY')?.bin).toBe('990001');
    expect(findBank('testpay')?.bin).toBe('990001');
    expect(searchBanks('zebrawallet').map((b) => b.bin)).toContain('990001');
  });

  it('SWIFT lookup finds a registered bank', () => {
    registerBanks([{ ...custom, swift: 'ABCDVNVX' }]);
    expect(searchBanks('ABCDVNVX').map((b) => b.bin)).toContain('990001');
  });

  it('build then parse round trip resolves to the custom name', () => {
    registerBanks([custom]);
    const built = buildVietQR({ bank: 'TESTPAY', account: '123456789', amount: 10000 });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const parsed = parseVietQR(built.payload);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.bin).toBe('990001');
    expect(parsed.bank?.name).toBe('Test Pay Wallet');
    expect(parsed.crcValid).toBe(true);
  });

  it('build fails for the custom bank after reset', () => {
    registerBanks([custom]);
    resetBanks();
    const built = buildVietQR({ bank: 'TESTPAY', account: '123456789' });
    expect(built.ok).toBe(false);
  });
});

describe('CLI --banks', () => {
  it('vietqr build and parse use the file', () => {
    const file = tmpJson([custom]);
    const b = cli([
      'vietqr',
      'build',
      '--bank',
      'TESTPAY',
      '--account',
      '123456789',
      '--banks',
      file,
      '--json',
    ]);
    expect(b.code).toBe(0);
    const payload = (JSON.parse(b.out) as { payload: string }).payload;
    const p = cli(['vietqr', 'parse', payload, '--banks', file, '--json']);
    expect(p.code).toBe(0);
    expect(p.out).toContain('Test Pay Wallet');
  });

  it('vietqr banks lists the custom bank', () => {
    const file = tmpJson([custom]);
    const r = cli(['vietqr', 'banks', 'TESTPAY', '--banks', file, '--json']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('990001');
  });

  it('reports READ_ERROR for a missing file', () => {
    const r = cli(['vietqr', 'banks', '--banks', '/nonexistent/banks.json', '--json']);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('READ_ERROR');
  });

  it('reports INVALID_BANKS for an invalid entry', () => {
    const r = cli(['vietqr', 'banks', '--banks', tmpJson([{ ...custom, bin: '1' }]), '--json']);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('INVALID_BANKS');
  });
});

describe('MCP --banks', () => {
  it('vietqr_banks returns the custom bank', async () => {
    const client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [SERVER, '--banks', tmpJson([custom])],
      }),
    );
    try {
      const r = await client.callTool({ name: 'vietqr_banks', arguments: { query: 'TESTPAY' } });
      const content = (r as { content: Array<{ text: string }> }).content;
      expect(content[0]!.text).toContain('Test Pay Wallet');
    } finally {
      await client.close();
    }
  });

  it('exits with status 1 for an invalid file', () => {
    const r = spawnSync(process.execPath, [SERVER, '--banks', tmpJson([{ bin: 'x' }])], {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('INVALID_BANKS');
  });
});
