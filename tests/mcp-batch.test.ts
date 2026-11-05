import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');

const text = (r: unknown) => {
  const content = (r as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  const c = content.find((x) => x.type === 'text');
  return JSON.parse(c!.text!) as Record<string, unknown>;
};

type Row = { index: number; input: unknown; ok: boolean; error?: { code?: string } };

const CASES = [
  {
    batch: 'vn_tax_id_validate_batch',
    single: 'vn_tax_id_validate',
    key: 'taxId',
    arg: 'taxIds',
    good: '0100233488',
    bad: '123',
  },
  {
    batch: 'vn_id_parse_batch',
    single: 'vn_id_parse',
    key: 'id',
    arg: 'ids',
    good: '001090123456',
    bad: '123',
  },
  {
    batch: 'vn_phone_parse_batch',
    single: 'vn_phone',
    key: 'phone',
    arg: 'phones',
    good: '0912345678',
    bad: 'abc',
  },
];

describe('vn-skills MCP batch tools', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });
  afterAll(async () => {
    await client.close();
  });

  const strip = (o: Record<string, unknown>) => {
    const { valid: _v, ...rest } = o;
    return rest;
  };

  describe.each(CASES)('$batch', ({ batch, single, key, arg, good, bad }) => {
    it('is registered as a read-only offline tool with a title', async () => {
      const { tools } = await client.listTools();
      const t = tools.find((x) => x.name === batch);
      expect(t).toBeDefined();
      expect(t?.title).toBeTruthy();
      expect(t?.annotations?.readOnlyHint).toBe(true);
      expect(t?.annotations?.openWorldHint).toBe(false);
      expect(t?.description).toMatch(/1000/);
      expect(t?.description).toMatch(/null/i);
    });

    it('handles a mix of valid, invalid and null entries', async () => {
      const j = text(
        await client.callTool({ name: batch, arguments: { [arg]: [good, bad, null, '', 42] } }),
      );
      expect(j.ok).toBe(true);
      const rows = j.results as Row[];
      expect(rows).toHaveLength(5);
      expect(rows.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);
      expect(rows.map((r) => r.input)).toEqual([good, bad, null, '', 42]);
      expect(rows.map((r) => r.ok)).toEqual([true, false, false, false, false]);
      for (const r of rows.slice(1)) expect(typeof r.error?.code).toBe('string');
      expect(j.summary).toEqual({ total: 5, valid: 1, invalid: 4 });
    });

    it('rejects more than 1000 entries', async () => {
      const r = await client
        .callTool({ name: batch, arguments: { [arg]: Array.from({ length: 1001 }, () => good) } })
        .then(
          (x) => ({ isError: (x as { isError?: boolean }).isError === true }),
          () => ({ isError: true }),
        );
      expect(r.isError).toBe(true);
    });

    it('accepts exactly 1000 entries', async () => {
      const j = text(
        await client.callTool({
          name: batch,
          arguments: { [arg]: Array.from({ length: 1000 }, () => good) },
        }),
      );
      expect(j.summary).toEqual({ total: 1000, valid: 1000, invalid: 0 });
    });

    it("per-row output equals the single-value tool's output", async () => {
      const inputs = [good, bad];
      const j = text(await client.callTool({ name: batch, arguments: { [arg]: inputs } }));
      const rows = j.results as Array<Record<string, unknown>>;
      for (const [i, input] of inputs.entries()) {
        const s = text(await client.callTool({ name: single, arguments: { [key]: input } }));
        const { index, input: echoed, ...rest } = rows[i]!;
        expect(index).toBe(i);
        expect(echoed).toBe(input);
        expect(strip(rest)).toEqual(strip(s));
      }
    });
  });
});
