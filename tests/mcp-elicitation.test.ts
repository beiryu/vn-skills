/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-type-assertion */
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { convertAddress } from '@vn-skills/core';
import { createServer } from '../packages/mcp/src/server.js';

const DIVIDED = 'Xã Tân Thạnh, Huyện Thới Lai, Cần Thơ';

type Reply =
  { action: 'accept'; content: Record<string, unknown> } | { action: 'decline' | 'cancel' };

async function setup(reply?: (schema: any) => Reply) {
  const requests: any[] = [];
  const client = new Client(
    { name: 'test', version: '0.0.0' },
    { capabilities: reply ? { elicitation: {} } : {} },
  );
  if (reply) {
    client.setRequestHandler(ElicitRequestSchema, async (req) => {
      requests.push(req.params);
      return reply((req.params as any).requestedSchema) as any;
    });
  }
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([createServer().connect(a), client.connect(b)]);
  return { client, requests };
}

const call = async (client: Client, args: Record<string, unknown>) => {
  const r = (await client.callTool({ name: 'vn_address_convert', arguments: args })) as {
    content: Array<{ text: string }>;
  };
  return JSON.parse(r.content[0]!.text) as any;
};

function dividedCandidates() {
  const r = convertAddress(DIVIDED);
  if (!r.ok) throw new Error('setup');
  return r.candidates;
}

describe('vn_address_convert elicitation', () => {
  it('asks with an enum equal to the candidate codes and applies the accepted ward', async () => {
    const cands = dividedCandidates();
    const other = cands.find((c) => !c.isDefault)!;
    const { client, requests } = await setup(() => ({
      action: 'accept',
      content: { ward: other.ward.code },
    }));
    const out = await call(client, { text: DIVIDED });
    expect(requests).toHaveLength(1);
    const schema = requests[0].requestedSchema;
    expect(schema.required).toEqual(['ward']);
    expect(schema.properties.ward.type).toBe('string');
    expect(schema.properties.ward.enum).toEqual(cands.map((c) => c.ward.code));
    expect(out.chosenBy).toBe('user');
    expect(out.new.ward.code).toBe(other.ward.code);
    expect(out.new.formatted).toContain(other.ward.fullName);
    const flags = Object.fromEntries(out.candidates.map((c: any) => [c.code, c.isDefault]));
    expect(flags[other.ward.code]).toBe(true);
    expect(Object.values(flags).filter(Boolean)).toHaveLength(1);
    await client.close();
  });

  for (const action of ['decline', 'cancel'] as const) {
    it(`keeps the default on ${action}`, async () => {
      const def = dividedCandidates().find((c) => c.isDefault)!;
      const { client, requests } = await setup(() => ({ action }));
      const out = await call(client, { text: DIVIDED });
      expect(requests).toHaveLength(1);
      expect(out.chosenBy).toBe('default');
      expect(out.new.ward.code).toBe(def.ward.code);
      await client.close();
    });
  }

  it('keeps the default on an invalid code', async () => {
    const def = dividedCandidates().find((c) => c.isDefault)!;
    const { client } = await setup(() => ({ action: 'accept', content: { ward: 'not-a-code' } }));
    const out = await call(client, { text: DIVIDED });
    expect(out.chosenBy).toBe('default');
    expect(out.new.ward.code).toBe(def.ward.code);
    await client.close();
  });

  it('without elicitation capability returns output with no chosenBy', async () => {
    const def = dividedCandidates().find((c) => c.isDefault)!;
    const { client } = await setup();
    const out = await call(client, { text: DIVIDED });
    expect('chosenBy' in out).toBe(false);
    expect(out.mappingType).toBe('divided');
    expect(out.new.ward.code).toBe(def.ward.code);
    await client.close();
  });

  it('never elicits for a non-divided address', async () => {
    const r = convertAddress({ province: 'Cần Thơ' });
    expect(r.ok && r.mappingType).not.toBe('divided');
    const { client, requests } = await setup(() => ({ action: 'cancel' }));
    const out = await call(client, { province: 'Cần Thơ' });
    expect(out.ok).toBe(true);
    expect(requests).toHaveLength(0);
    expect('chosenBy' in out).toBe(false);
    await client.close();
  });

  it('describes the elicitation in the tool description', async () => {
    const { client } = await setup();
    const { tools } = await client.listTools();
    const t = tools.find((x) => x.name === 'vn_address_convert')!;
    expect(t.description).toMatch(/ask the user/i);
    await client.close();
  });
});
