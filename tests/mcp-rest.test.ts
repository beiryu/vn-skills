import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

const freePort = () =>
  new Promise<number>((res, rej) => {
    const s = createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => res(port));
    });
  });

type Running = { proc: ChildProcess; base: string };

const start = async (extra: string[]): Promise<Running> => {
  const port = await freePort();
  let stderr = '';
  const proc = spawn(process.execPath, [SERVER, '--http', '--port', String(port), ...extra], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  proc.stderr!.on('data', (d: Buffer) => (stderr += d.toString()));
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline && !stderr.includes(String(port))) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return { proc, base: `http://127.0.0.1:${port}` };
};

type Doc = {
  openapi: string;
  servers: Array<{ url: string }>;
  paths: Record<string, Record<string, { operationId: string }>>;
};

const post = (url: string, body: string, headers: Record<string, string> = {}) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });

describe('vn-skills MCP server --http --rest', () => {
  let rest: Running;
  let plain: Running;
  let pub: Running;

  beforeAll(async () => {
    rest = await start(['--rest']);
    plain = await start([]);
    pub = await start(['--rest', '--public-url', 'https://example.test']);
  });
  afterAll(() => {
    rest?.proc.kill();
    plain?.proc.kill();
    pub?.proc.kill();
  });

  it('serves an OpenAPI 3.1.0 document with one operation per MCP tool', async () => {
    const res = await fetch(`${rest.base}/openapi.json`);
    expect(res.status).toBe(200);
    const doc = (await res.json()) as Doc;
    expect(doc.openapi).toBe('3.1.0');

    const client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    await client.close();

    const ops = Object.values(doc.paths).flatMap((p) => Object.values(p));
    expect(names.length).toBeGreaterThan(0);
    expect(ops.map((o) => o.operationId).sort()).toEqual(names);
    expect(Object.keys(doc.paths).sort()).toEqual(names.map((n) => `/tools/${n}`));
  });

  it('POST /tools/vn_money_to_words matches MCP tools/call text', async () => {
    const res = await post(`${rest.base}/tools/vn_money_to_words`, '{"amount":1200000}');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();

    const client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
    const r = (await client.callTool({
      name: 'vn_money_to_words',
      arguments: { amount: 1200000 },
    })) as { content: Array<{ type: string; text: string }> };
    await client.close();
    expect(body).toEqual(JSON.parse(r.content.find((c) => c.type === 'text')!.text));
  });

  it('POST /tools/vietqr_decode accepts base64 data and openapi lists it', async () => {
    const client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
    const built = (await client.callTool({
      name: 'vietqr_build',
      arguments: { bank: 'MB', account: '0123456789', image: true },
    })) as { content: Array<{ type: string; data?: string }> };
    await client.close();
    const png = Buffer.from(built.content.find((c) => c.type === 'image')!.data!, 'base64');
    const res = await post(
      `${rest.base}/tools/vietqr_decode`,
      JSON.stringify({ data: png.toString('base64') }),
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { ok: boolean; account: string };
    expect(j.ok).toBe(true);
    expect(j.account).toBe('0123456789');
    const doc = await (await fetch(`${rest.base}/openapi.json`)).text();
    expect(doc).toContain('"data"');
    expect(doc).toContain('"mimeType"');
  });

  it('returns 400 with ok:false for an invalid tax id', async () => {
    const res = await post(`${rest.base}/tools/vn_tax_id_validate`, '{"taxId":"123"}');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(false);
  });

  it('returns 404 for an unknown tool', async () => {
    const res = await post(`${rest.base}/tools/no_such_tool`, '{}');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON', async () => {
    const res = await post(`${rest.base}/tools/vn_money_to_words`, '{nope');
    expect(res.status).toBe(400);
  });

  it('rejects a foreign Origin with 403', async () => {
    const res = await fetch(`${rest.base}/openapi.json`, {
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
    const p = await post(`${rest.base}/tools/vn_money_to_words`, '{"amount":1}', {
      origin: 'https://evil.example',
    });
    expect(p.status).toBe(403);
  });

  it('returns 404 for /openapi.json without --rest', async () => {
    const res = await fetch(`${plain.base}/openapi.json`);
    expect(res.status).toBe(404);
  });

  it('uses --public-url in servers[0].url', async () => {
    const doc = (await (await fetch(`${pub.base}/openapi.json`)).json()) as Doc;
    expect(doc.servers[0]!.url).toBe('https://example.test');
  });

  it('defaults servers[0].url to the host and port', async () => {
    const doc = (await (await fetch(`${rest.base}/openapi.json`)).json()) as Doc;
    expect(doc.servers[0]!.url).toBe(rest.base);
  });

  describe('/swagger.json', () => {
    type Swagger = {
      swagger: string;
      host: string;
      schemes: string[];
      paths: Record<
        string,
        Record<string, { operationId: string; parameters: Array<{ in: string }> }>
      >;
    };
    const keys = (v: unknown, out: Set<string> = new Set()): Set<string> => {
      if (Array.isArray(v)) v.forEach((x) => keys(x, out));
      else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) {
          out.add(k);
          keys(x, out);
        }
      }
      return out;
    };

    it('serves a Swagger 2.0 document with one operationId per MCP tool', async () => {
      const res = await fetch(`${rest.base}/swagger.json`);
      expect(res.status).toBe(200);
      const text = await res.text();
      const doc = JSON.parse(text) as Swagger;
      expect(doc.swagger).toBe('2.0');
      expect(Buffer.byteLength(text)).toBeLessThan(1024 * 1024);

      const client = new Client({ name: 'test', version: '0.0.0' });
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
      const names = (await client.listTools()).tools.map((t) => t.name).sort();
      await client.close();
      const ops = Object.values(doc.paths).flatMap((p) => Object.values(p));
      expect(names.length).toBeGreaterThan(0);
      expect(ops.map((o) => o.operationId).sort()).toEqual(names);

      const k = keys(doc);
      for (const bad of ['anyOf', 'oneOf', 'const', '$schema']) expect(k.has(bad)).toBe(false);
      for (const o of ops) {
        const body = o.parameters.filter((p) => p.in === 'body');
        expect(body).toHaveLength(1);
      }
    });

    it('derives host and schemes from --public-url', async () => {
      const s = await start(['--rest', '--public-url', 'https://example.com']);
      try {
        const doc = (await (await fetch(`${s.base}/swagger.json`)).json()) as Swagger;
        expect(doc.host).toBe('example.com');
        expect(doc.schemes).toEqual(['https']);
      } finally {
        s.proc.kill();
      }
    });

    it('returns 405 for POST', async () => {
      const res = await post(`${rest.base}/swagger.json`, '{}');
      expect(res.status).toBe(405);
    });

    it('returns 404 without --rest', async () => {
      const res = await fetch(`${plain.base}/swagger.json`);
      expect(res.status).toBe(404);
    });
  });
});
