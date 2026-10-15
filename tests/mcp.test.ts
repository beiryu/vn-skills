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

describe('vn-skills MCP server', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });
  afterAll(async () => {
    await client.close();
  });

  it('lists the expected tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'vietqr_build',
        'vietqr_parse',
        'vietqr_banks',
        'vn_address_parse',
        'vn_address_convert',
        'vn_address_search_wards',
        'vn_tax_id_validate',
        'vn_money_to_words',
        'vn_lunar_from_solar',
        'vn_lunar_to_solar',
        'vn_lunar_holidays',
        'vn_einvoice_validate',
        'vn_einvoice_totals',
        'vn_einvoice_mock_issue',
      ].sort(),
    );
    for (const t of tools) expect(t.description?.length ?? 0).toBeGreaterThan(30);
  });

  it('vietqr_build returns payload and image', async () => {
    const r = await client.callTool({
      name: 'vietqr_build',
      arguments: {
        bank: 'VCB',
        account: '0011001234567',
        amount: 500000,
        note: 'test',
        image: true,
      },
    });
    const j = text(r);
    expect(j.ok).toBe(true);
    expect(String(j.payload)).toMatch(/6304[0-9A-F]{4}$/);
    expect((r.content as Array<{ type: string }>).some((c) => c.type === 'image')).toBe(true);
  });
  it('vietqr_build error is flagged', async () => {
    const r = await client.callTool({
      name: 'vietqr_build',
      arguments: { bank: 'zzz', account: '1' },
    });
    expect(r.isError).toBe(true);
  });
  it('vn_money_to_words', async () => {
    const j = text(
      await client.callTool({ name: 'vn_money_to_words', arguments: { amount: 1200000 } }),
    );
    expect(j.words).toBe('một triệu hai trăm nghìn đồng');
  });
  it('vn_tax_id_validate', async () => {
    const j = text(
      await client.callTool({ name: 'vn_tax_id_validate', arguments: { taxId: '0100233488' } }),
    );
    expect(j.valid).toBe(true);
  });
  it('vn_lunar_from_solar', async () => {
    const j = text(
      await client.callTool({ name: 'vn_lunar_from_solar', arguments: { date: '2025-01-29' } }),
    );
    expect(j.yearCanChi).toBe('Ất Tỵ');
  });
  it('vn_lunar_to_solar', async () => {
    const j = text(
      await client.callTool({
        name: 'vn_lunar_to_solar',
        arguments: { day: 1, month: 1, year: 2026 },
      }),
    );
    expect(j.date).toBe('2026-02-17');
  });
  it('vn_address_convert', async () => {
    const j = text(
      await client.callTool({
        name: 'vn_address_convert',
        arguments: { text: 'P. Bến Nghé, Q.1, TP.HCM' },
      }),
    );
    expect((j.new as { ward: { fullName: string } }).ward.fullName).toBe('Phường Sài Gòn');
  });
  it('vn_address_parse', async () => {
    const j = text(
      await client.callTool({
        name: 'vn_address_parse',
        arguments: { text: 'Phường Sài Gòn, TP.HCM' },
      }),
    );
    expect((j.province as { code: string }).code).toBe('79');
  });
  it('vn_einvoice_totals', async () => {
    const invoice = {
      series: '1C25TAA',
      issueDate: '2025-10-15',
      seller: { name: 'A', taxId: '0100233488', address: 'HN' },
      buyer: { name: 'B', address: 'HCM' },
      lines: [{ name: 'X', quantity: 1, unitPrice: 100000, vatRate: 10 }],
    };
    const j = text(await client.callTool({ name: 'vn_einvoice_totals', arguments: { invoice } }));
    expect(j.grandTotal).toBe(110000);
    const issued = text(
      await client.callTool({ name: 'vn_einvoice_mock_issue', arguments: { invoice } }),
    );
    expect(issued.status).toBe('issued');
  });
  it('vn_lunar_holidays', async () => {
    const j = text(
      await client.callTool({
        name: 'vn_lunar_holidays',
        arguments: { year: 2026, publicOnly: true },
      }),
    );
    expect((j.holidays as unknown[]).length).toBeGreaterThan(5);
  });
});
