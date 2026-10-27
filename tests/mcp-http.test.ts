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

type Rpc = { result?: { serverInfo?: unknown; tools?: Array<{ name: string }> } };

const rpc = async (url: string, body: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  const data = raw
    .split('\n')
    .map((l) => (l.startsWith('data:') ? l.slice(5).trim() : l.trim()))
    .find((l) => l.startsWith('{'));
  return { status: res.status, json: data ? (JSON.parse(data) as Rpc) : null };
};

const init = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '0.0.0' },
  },
};

describe('vn-skills MCP server over Streamable HTTP', () => {
  let proc: ChildProcess;
  let base: string;
  let stderr = '';

  beforeAll(async () => {
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    proc = spawn(process.execPath, [SERVER, '--http', '--port', String(port)], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    proc.stderr!.on('data', (d: Buffer) => (stderr += d.toString()));
    const deadline = Date.now() + 4_000;
    while (Date.now() < deadline && !stderr.includes(String(port))) {
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  afterAll(() => {
    proc?.kill();
  });

  it('prints the listening URL to stderr', () => {
    expect(stderr).toContain(`http://127.0.0.1:`);
  });

  it('initialize then tools/list returns the same tools as stdio', async () => {
    const i = await rpc(`${base}/mcp`, init);
    expect(i.status).toBe(200);
    expect(i.json?.result?.serverInfo).toBeTruthy();
    const l = await rpc(`${base}/mcp`, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(l.status).toBe(200);
    const httpNames = l.json!.result!.tools!.map((t) => t.name).sort();

    const client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
    const stdioNames = (await client.listTools()).tools.map((t) => t.name).sort();
    await client.close();
    expect(httpNames.length).toBeGreaterThan(0);
    expect(httpNames).toEqual(stdioNames);
  });

  it('rejects a foreign Origin with 403', async () => {
    const r = await rpc(`${base}/mcp`, init, { origin: 'https://evil.example' });
    expect(r.status).toBe(403);
  });

  it('accepts a localhost Origin', async () => {
    const r = await rpc(`${base}/mcp`, init, { origin: 'http://localhost:5173' });
    expect(r.status).toBe(200);
  });

  it('returns 404 for other paths', async () => {
    const res = await fetch(`${base}/other`, { method: 'POST', body: '{}' });
    expect(res.status).toBe(404);
  });
});
