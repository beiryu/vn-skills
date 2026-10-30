import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import worker from '../examples/cloudflare-worker/src/index';

const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

type Rpc = {
  result?: { tools?: Array<{ name: string }>; content?: Array<{ type: string; text?: string }> };
};

const post = async (body: unknown) => {
  const res = await worker.fetch(
    new Request('https://example.workers.dev/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
    }),
  );
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

describe('Cloudflare Worker example', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });
  afterAll(async () => {
    await client.close();
  });

  it('initialize answers statelessly', async () => {
    const r = await post(init);
    expect(r.status).toBe(200);
    expect(r.json?.result).toBeDefined();
  });

  it('tools/list matches the stdio server', async () => {
    const r = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(r.status).toBe(200);
    const names = r.json!.result!.tools!.map((t) => t.name).sort();
    const expected = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual(expected);
  });

  it('tools/call vietqr_build returns ok: true', async () => {
    const r = await post({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'vietqr_build',
        arguments: { bank: 'VCB', account: '0011001234567', amount: 500000, note: 'test' },
      },
    });
    const t = r.json!.result!.content!.find((c) => c.type === 'text')!;
    expect(JSON.parse(t.text!).ok).toBe(true);
  });

  it('GET /other returns 404', async () => {
    const res = await worker.fetch(new Request('https://example.workers.dev/other'));
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toMatch(/json/);
  });
});
