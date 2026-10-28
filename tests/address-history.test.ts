import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as core from '@vn-skills/core';
import { MAPPING, PROVINCES } from '@vn-skills/core';

const CLI = resolve(__dirname, '..', 'packages', 'cli', 'dist', 'index.js');
const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

interface Former {
  ward: { code: string; name: string; fullName: string };
  district: { code: string; name: string; fullName: string };
  province: { code: string; name: string; fullName: string };
  isDefault: boolean;
  otherNewWards?: Array<{ code: string }>;
}
interface History {
  ok: boolean;
  ward?: { code: string; fullName: string };
  province?: { code: string; fullName: string };
  former?: Former[];
  error?: { code: string; message: string; hint?: string };
}
type FormerUnits = (q: unknown, o?: { province?: string }) => History;
const formerUnits = (q: unknown, o?: { province?: string }): History =>
  (core as unknown as { formerUnits: FormerUnits }).formerUnits(q, o);

// Reverse the bundled mapping independently of the implementation.
const reverse = new Map<string, Array<{ old: string; isDefault: boolean; all: string[] }>>();
for (const [old, targets] of Object.entries(MAPPING.wards))
  for (const [code, isDefault] of targets) {
    if (!reverse.has(code)) reverse.set(code, []);
    reverse.get(code)!.push({ old, isDefault, all: targets.map((t) => t[0]) });
  }
const merged = [...reverse.entries()].find(([, v]) => v.length >= 2)!;
const splitEntry = [...reverse.entries()].find(([, v]) => v.some((x) => x.all.length > 1))!;
const wardName = (code: string) => {
  for (const p of PROVINCES) {
    const w = p.wards.find((x) => x.code === code);
    if (w) return { w, p };
  }
  throw new Error(code);
};
const nameProvinces = new Map<string, Set<string>>();
for (const p of PROVINCES)
  for (const w of p.wards) {
    if (!nameProvinces.has(w.fullName)) nameProvinces.set(w.fullName, new Set());
    nameProvinces.get(w.fullName)!.add(p.code);
  }
const dup = [...nameProvinces.entries()].find(([, s]) => s.size > 1);

describe('formerUnits', () => {
  it('is exported', () =>
    expect(typeof (core as Record<string, unknown>).formerUnits).toBe('function'));

  it('lists every old ward of a merged ward, by code', () => {
    const r = formerUnits(merged[0]);
    expect(r.ok).toBe(true);
    expect(r.ward!.code).toBe(merged[0]);
    expect(r.province!.code).toBe(wardName(merged[0]).p.code);
    expect(r.former!.map((f) => f.ward.code).sort()).toEqual(merged[1].map((x) => x.old).sort());
    expect(r.former!.length).toBeGreaterThanOrEqual(2);
  });

  it('each former entry carries ward, district and province with code and full name', () => {
    const r = formerUnits(merged[0]);
    for (const f of r.former!) {
      expect(f.ward.fullName).toBeTruthy();
      expect(f.district.code).toBeTruthy();
      expect(f.district.fullName).toBeTruthy();
      expect(f.province.code).toBeTruthy();
      expect(f.province.fullName).toBeTruthy();
    }
  });

  it('carries the mapping flag', () => {
    const r = formerUnits(merged[0]);
    for (const f of r.former!)
      expect(f.isDefault).toBe(merged[1].find((x) => x.old === f.ward.code)!.isDefault);
  });

  it('shows the other new wards of a split old ward', () => {
    const [code, list] = splitEntry;
    const split = list.find((x) => x.all.length > 1)!;
    const f = formerUnits(code).former!.find((x) => x.ward.code === split.old)!;
    expect(f.otherNewWards!.map((w) => w.code).sort()).toEqual(
      split.all.filter((c) => c !== code).sort(),
    );
  });

  it('resolves by name within a province', () => {
    const { w, p } = wardName(merged[0]);
    const r = formerUnits(w.fullName, { province: p.name });
    expect(r.ok).toBe(true);
    expect(r.ward!.code).toBe(w.code);
    expect(r.former!.length).toBe(merged[1].length);
  });

  it('resolves a unique name without province', () => {
    const { w } = wardName(merged[0]);
    if (nameProvinces.get(w.fullName)!.size > 1) return;
    expect(formerUnits(w.fullName).ward!.code).toBe(w.code);
  });

  it('same name in two provinces is AMBIGUOUS without province', () => {
    expect(dup).toBeDefined();
    const r = formerUnits(dup![0]);
    expect(r.ok).toBe(false);
    expect(r.error!.code).toBe('AMBIGUOUS');
    expect(r.error!.hint).toBeTruthy();
  });

  it('same name with province resolves', () => {
    const code = [...dup![1]][0]!;
    const p = PROVINCES.find((x) => x.code === code)!;
    const r = formerUnits(dup![0], { province: p.name });
    expect(r.ok).toBe(true);
    expect(r.province!.code).toBe(code);
  });

  it.each([[''], ['   '], [null], [undefined], [42], [{}], [[]]])('EMPTY for %j', (q) => {
    const r = formerUnits(q);
    expect(r.ok).toBe(false);
    expect(r.error!.code).toBe('EMPTY');
  });

  it('NOT_FOUND for unknown ward, hinting --province', () => {
    const r = formerUnits('zzzzqqqq không có');
    expect(r.error!.code).toBe('NOT_FOUND');
    expect(r.error!.hint).toContain('province');
  });

  it('NOT_FOUND when the province filter excludes the ward', () => {
    const { w, p } = wardName(merged[0]);
    const other = PROVINCES.find((x) => x.code !== p.code)!;
    if (other.wards.some((x) => x.fullName === w.fullName)) return;
    expect(formerUnits(w.fullName, { province: other.name }).error!.code).toBe('NOT_FOUND');
  });

  it('never throws on odd province option', () => {
    expect(() => formerUnits(merged[0], { province: null as unknown as string })).not.toThrow();
  });

  it('property: every old ward appears under each of its new wards', () => {
    for (const [old, targets] of Object.entries(MAPPING.wards))
      for (const [code] of targets) {
        const r = formerUnits(code);
        expect(r.ok).toBe(true);
        expect(r.former!.map((f) => f.ward.code)).toContain(old);
      }
  });
});

describe('address history CLI', () => {
  const run = (args: string[]) =>
    spawnSync(process.execPath, [CLI, 'address', 'history', ...args], { encoding: 'utf8' });

  it('prints JSON when piped', () => {
    const r = run([merged[0]]);
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout) as History;
    expect(j.ward!.code).toBe(merged[0]);
    expect(j.former!.length).toBe(merged[1].length);
  });

  it('--json and --province work with a name', () => {
    const { w, p } = wardName(merged[0]);
    const r = run([...w.fullName.split(' '), '--province', p.name, '--json']);
    expect((JSON.parse(r.stdout) as History).ward!.code).toBe(w.code);
  });

  it('reports EMPTY-style errors as JSON with non-zero exit', () => {
    const r = run(['zzzzqqqq']);
    expect(r.status).not.toBe(0);
    expect((JSON.parse(r.stdout) as History).error!.code).toBe('NOT_FOUND');
  });
});

describe('vn_address_history MCP tool', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });
  afterAll(async () => {
    await client.close();
  });
  const call = async (args: Record<string, unknown>) => {
    const r = await client.callTool({ name: 'vn_address_history', arguments: args });
    const c = (r.content as Array<{ type: string; text?: string }>).find((x) => x.type === 'text');
    return JSON.parse(c!.text!) as History;
  };

  it('is listed', async () => {
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toContain('vn_address_history');
  });
  it('returns the same JSON as core', async () => {
    expect(await call({ ward: merged[0] })).toEqual(
      JSON.parse(JSON.stringify(formerUnits(merged[0]))),
    );
  });
  it('accepts province', async () => {
    const { w, p } = wardName(merged[0]);
    expect((await call({ ward: w.fullName, province: p.name })).ward!.code).toBe(w.code);
  });
});
