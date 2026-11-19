import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../packages/mcp/src/server';
import { TOOL_GROUPS, TOOLSET_NAMES, createToolFilter } from '../packages/mcp/src/toolsets';

async function tools(options?: Parameters<typeof createServer>[0]) {
  const server = createServer(options);
  const client = new Client({ name: 'test', version: '0.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const names = (await client.listTools()).tools.map((t) => t.name).sort();
  await client.close();
  return names;
}

describe('toolsets map', () => {
  it('every registered tool has a group and every mapped tool is registered', async () => {
    const names = await tools();
    expect(names).toHaveLength(41);
    expect(names).toEqual(Object.keys(TOOL_GROUPS).sort());
  });

  it('has the 11 documented groups', () => {
    expect(TOOLSET_NAMES.sort()).toEqual(
      [
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
      ].sort(),
    );
  });

  it('filters tools in-process', async () => {
    expect(await tools({ toolsets: ['vn-name'] })).toEqual(['vn_name']);
    expect(await tools({ tools: ['vn_name'] })).toEqual(['vn_name']);
  });

  it('rejects unknown names', () => {
    expect(() => createToolFilter({ toolsets: ['foo'] })).toThrow(/foo/);
    expect(() => createToolFilter({ tools: ['bar'] })).toThrow(/bar/);
  });

  it('group is enabled when any of its tools is enabled', () => {
    const f = createToolFilter({ tools: ['vietqr_parse'] });
    expect(f.groupEnabled('vietqr')).toBe(true);
    expect(f.groupEnabled('vn-lunar')).toBe(false);
  });
});
