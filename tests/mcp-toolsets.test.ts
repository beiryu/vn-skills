import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

const GROUPS = [
  'vietqr',
  'vn-address',
  'vn-tax-id',
  'vn-id',
  'vn-phone',
  'vn-holidays',
  'vn-money-words',
  'vn-lunar',
  'vn-einvoice',
  'vn-name',
  'vn-number-format',
];

type Listing = { tools: string[]; prompts: string[]; resources: string[] };

async function listing(args: string[], env: Record<string, string> = {}): Promise<Listing> {
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([k, v]) => v !== undefined && !k.startsWith('VN_SKILLS_')),
  ) as Record<string, string>;
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [SERVER, ...args],
      env: { ...base, ...env },
    }),
  );
  try {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name).sort();
    const resources = [
      ...(await client.listResources()).resources.map((r) => r.uri),
      ...(await client.listResourceTemplates()).resourceTemplates.map((r) => r.uriTemplate),
    ].sort();
    return { tools, prompts, resources };
  } finally {
    await client.close();
  }
}

const run = (args: string[]) =>
  new Promise<{ code: number | null; stderr: string }>((res) => {
    let stderr = '';
    const proc = spawn(process.execPath, [SERVER, ...args], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    proc.stderr!.on('data', (d: Buffer) => (stderr += d.toString()));
    const timer = setTimeout(() => proc.kill(), 5_000);
    proc.on('close', (code) => {
      clearTimeout(timer);
      res({ code, stderr });
    });
  });

const freePort = () =>
  new Promise<number>((res, rej) => {
    const s = createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => res(port));
    });
  });

describe('vn-skills MCP --toolsets / --tools', () => {
  it('default registers everything; every tool belongs to a group', async () => {
    const all = await listing([]);
    expect(all.tools).toHaveLength(41);
    const grouped = await listing(['--toolsets', GROUPS.join(',')]);
    expect(grouped).toEqual(all);
    expect(grouped.tools.every((t) => /^(vietqr|vn)_/.test(t))).toBe(true);
    expect(await listing(['--toolsets', 'all'])).toEqual(all);
  });

  it('--toolsets vietqr keeps only vietqr tools, prompts and resources', async () => {
    const all = await listing([]);
    const l = await listing(['--toolsets', 'vietqr']);
    expect(l.tools).toEqual(['vietqr_banks', 'vietqr_build', 'vietqr_decode', 'vietqr_parse']);
    expect(l.prompts).toContain('tao-vietqr');
    expect(l.prompts).not.toContain('doi-am-duong');
    expect(l.prompts).not.toContain('doi-dia-chi-moi');
    expect(l.resources.some((u) => u.includes('vietqr'))).toBe(true);
    expect(l.resources).not.toContain('vn-skills://provinces');
    expect(l.resources.some((u) => u.includes('holidays'))).toBe(false);
    expect(l.prompts.length).toBeLessThan(all.prompts.length);
    expect(l.resources.length).toBeLessThan(all.resources.length);
  });

  it('--toolsets vn-lunar --tools vietqr_parse adds the single tool', async () => {
    const l = await listing(['--toolsets', 'vn-lunar', '--tools', 'vietqr_parse']);
    expect(l.tools).toContain('vietqr_parse');
    expect(l.tools).toContain('vn_lunar_tet');
    expect(l.tools.filter((t) => !t.startsWith('vn_lunar_'))).toEqual(['vietqr_parse']);
    expect(l.prompts).toContain('doi-am-duong');
  });

  it('a prompt is registered when any tool of its group is enabled', async () => {
    const l = await listing(['--tools', 'vietqr_parse']);
    expect(l.tools).toEqual(['vietqr_parse']);
    expect(l.prompts).toContain('tao-vietqr');
    const l2 = await listing(['--toolsets', 'vn-lunar']);
    expect(l2.prompts).not.toContain('tao-vietqr');
  });

  it('VN_SKILLS_TOOLSETS and VN_SKILLS_TOOLS work like the flags', async () => {
    const flag = await listing(['--toolsets', 'vn-address']);
    expect(flag.tools.length).toBeGreaterThan(0);
    expect(flag.tools.every((t) => t.startsWith('vn_address_'))).toBe(true);
    expect(await listing([], { VN_SKILLS_TOOLSETS: 'vn-address' })).toEqual(flag);
    const env = await listing([], {
      VN_SKILLS_TOOLSETS: 'vn-lunar',
      VN_SKILLS_TOOLS: 'vietqr_parse',
    });
    expect(env).toEqual(await listing(['--toolsets', 'vn-lunar', '--tools', 'vietqr_parse']));
  });

  it('the flag wins over the env var', async () => {
    const l = await listing(['--toolsets', 'vietqr'], { VN_SKILLS_TOOLSETS: 'vn-address' });
    expect(l.tools).toEqual(['vietqr_banks', 'vietqr_build', 'vietqr_decode', 'vietqr_parse']);
  });

  it('unknown names exit non-zero and list the valid names', async () => {
    const a = await run(['--toolsets', 'foo']);
    expect(a.code).not.toBe(0);
    expect(a.code).not.toBeNull();
    expect(a.stderr).toContain('foo');
    expect(a.stderr).toContain('vn-lunar');
    const b = await run(['--tools', 'bar']);
    expect(b.code).not.toBe(0);
    expect(b.code).not.toBeNull();
    expect(b.stderr).toContain('bar');
    expect(b.stderr).toContain('vietqr_parse');
  });

  it('--http --rest --toolsets vietqr limits /openapi.json, /swagger.json and POST /tools', async () => {
    const port = await freePort();
    let stderr = '';
    const proc = spawn(
      process.execPath,
      [SERVER, '--http', '--rest', '--port', String(port), '--toolsets', 'vietqr'],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    proc.stderr!.on('data', (d: Buffer) => (stderr += d.toString()));
    try {
      const deadline = Date.now() + 4_000;
      while (Date.now() < deadline && !stderr.includes(String(port))) {
        await new Promise((r) => setTimeout(r, 50));
      }
      const base = `http://127.0.0.1:${port}`;
      const doc = (await (await fetch(`${base}/openapi.json`)).json()) as {
        paths: Record<string, Record<string, { operationId: string }>>;
      };
      const ops = Object.values(doc.paths)
        .flatMap((p) => Object.values(p).map((o) => o.operationId))
        .sort();
      expect(ops).toEqual(['vietqr_banks', 'vietqr_build', 'vietqr_decode', 'vietqr_parse']);
      const swagger = (await (await fetch(`${base}/swagger.json`)).json()) as {
        swagger: string;
        paths: Record<string, Record<string, { operationId: string }>>;
      };
      expect(swagger.swagger).toBe('2.0');
      expect(
        Object.values(swagger.paths)
          .flatMap((p) => Object.values(p).map((o) => o.operationId))
          .sort(),
      ).toEqual(ops);
      const r = await fetch(`${base}/tools/vn_lunar_tet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      expect(r.status).toBe(404);
    } finally {
      proc.kill();
    }
  });
});
