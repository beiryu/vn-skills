import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../packages/mcp/src/server.js';

// One prefix per skill group; only groups that exist in tools/list are checked.
const GROUPS = [
  'vietqr_',
  'vn_address',
  'vn_tax',
  'vn_id',
  'vn_phone',
  'vn_holidays',
  'vn_money',
  'vn_lunar',
  'vn_einvoice',
  'vn_name',
  'vn_number_format',
];

async function connect() {
  const client = new Client({ name: 'test', version: '0.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([createServer().connect(a), client.connect(b)]);
  return client;
}

describe('MCP initialize instructions', () => {
  it('exports the text as SERVER_INSTRUCTIONS and sends it on initialize', async () => {
    const { SERVER_INSTRUCTIONS } = await import('../packages/mcp/src/instructions.js');
    const client = await connect();
    expect(client.getInstructions()).toBe(SERVER_INSTRUCTIONS);
    await client.close();
  });

  it('is non-empty and at most 2000 characters', async () => {
    const client = await connect();
    const s = client.getInstructions();
    expect(typeof s).toBe('string');
    expect(s!.trim().length).toBeGreaterThan(0);
    expect(s!.length).toBeLessThanOrEqual(2000);
    await client.close();
  });

  it('names at least one tool for every skill group in tools/list', async () => {
    const client = await connect();
    const s = client.getInstructions() ?? '';
    const { tools } = await client.listTools();
    for (const g of GROUPS) {
      const inGroup = tools.filter((t) => t.name.startsWith(g));
      if (inGroup.length === 0) continue;
      expect(
        inGroup.some((t) => s.includes(t.name)),
        `group ${g}`,
      ).toBe(true);
    }
    await client.close();
  });

  it('only mentions tool names that exist in tools/list', async () => {
    const client = await connect();
    const s = client.getInstructions() ?? '';
    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));
    const mentioned = s.match(/\b(?:vn|vietqr)_[a-z0-9_]+/g) ?? [];
    expect(mentioned.length).toBeGreaterThan(0);
    for (const m of mentioned) expect(names.has(m), m).toBe(true);
    await client.close();
  });
});
