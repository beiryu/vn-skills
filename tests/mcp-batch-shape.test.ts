import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

const text = (r: unknown) => {
  const content = (r as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  return JSON.parse(content.find((x) => x.type === 'text')!.text!) as Record<string, unknown>;
};

const CASES = [
  ['vn_tax_id_validate_batch', 'vn_tax_id_validate', 'taxId', 'taxIds', '0100233488', '123'],
  ['vn_id_parse_batch', 'vn_id_parse', 'id', 'ids', '001090123456', '123'],
  ['vn_phone_parse_batch', 'vn_phone', 'phone', 'phones', '0912345678', 'abc'],
] as const;

describe('MCP batch rows match single-tool output exactly', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });
  afterAll(async () => {
    await client.close();
  });

  it.each(CASES)('%s', async (batch, single, key, arg, good, bad) => {
    const inputs = [good, bad, ''];
    const j = text(await client.callTool({ name: batch, arguments: { [arg]: inputs } }));
    const rows = j.results as Array<Record<string, unknown>>;
    for (const [i, input] of inputs.entries()) {
      const s = text(await client.callTool({ name: single, arguments: { [key]: input } }));
      const { index: _i, input: _in, ...rest } = rows[i]!;
      expect(rest).toEqual(s);
    }
  });
});
