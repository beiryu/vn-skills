import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';
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
        'vietqr_decode',
        'vn_address_parse',
        'vn_address_convert',
        'vn_address_convert_batch',
        'vn_address_search_wards',
        'vn_tax_id_validate',
        'vn_id_parse',
        'vn_money_to_words',
        'vn_number_format',
        'vn_lunar_from_solar',
        'vn_lunar_to_solar',
        'vn_lunar_holidays',
        'vn_einvoice_validate',
        'vn_einvoice_totals',
        'vn_einvoice_mock_issue',
        'vn_lunar_tet',
        'vn_lunar_canchi',
        'vn_tax_id_check_digit',
        'vn_address_provinces',
        'vn_address_province',
        'vn_einvoice_example',
        'vn_name',
        'vn_holidays_add_working_days',
        'vn_holidays_is_working_day',
        'vn_holidays_year',
        'vn_phone',
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
  it('vietqr_decode reads back the fields of a PNG from vietqr_build', async () => {
    const built = await client.callTool({
      name: 'vietqr_build',
      arguments: {
        bank: 'MB',
        account: '0123456789',
        amount: 150000,
        note: 'don hang 42',
        image: true,
      },
    });
    const b = text(built);
    const img = (built.content as Array<{ type: string; data?: string }>).find(
      (c) => c.type === 'image',
    );
    const file = join(mkdtempSync(join(tmpdir(), 'vn-skills-')), 'qr.png');
    writeFileSync(file, Buffer.from(img!.data!, 'base64'));
    const r = await client.callTool({ name: 'vietqr_decode', arguments: { path: file } });
    expect(r.isError).toBeFalsy();
    const j = text(r);
    expect(j.ok).toBe(true);
    expect(j.payload).toBe(b.payload);
    expect(j.crcValid).toBe(true);
    expect(j.bin).toBe('970422');
    expect(j.account).toBe('0123456789');
    expect(j.amount).toBe(150000);
  });
  it('vietqr_decode returns NO_QR for a PNG without a QR code', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'vn-skills-')), 'blank.png');
    const png = new PNG({ width: 64, height: 64 });
    png.data.fill(255);
    writeFileSync(file, PNG.sync.write(png));
    const r = await client.callTool({ name: 'vietqr_decode', arguments: { path: file } });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatchObject({ ok: false, error: { code: 'NO_QR' } });
  });
  it('vietqr_decode returns READ_ERROR for a file that is not a PNG', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'vn-skills-')), 'x.png');
    writeFileSync(file, 'not a png');
    const r = await client.callTool({ name: 'vietqr_decode', arguments: { path: file } });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatchObject({ ok: false, error: { code: 'READ_ERROR' } });
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
  it('vn_id_parse', async () => {
    const j = text(
      await client.callTool({ name: 'vn_id_parse', arguments: { id: '001090123456' } }),
    );
    expect(j.provinceCode).toBe('001');
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
  it('vn_address_convert_batch', async () => {
    const j = text(
      await client.callTool({
        name: 'vn_address_convert_batch',
        arguments: { addresses: ['P. Bến Nghé, Q.1, TP.HCM', 'zzz không có địa chỉ này'] },
      }),
    );
    expect(j.summary).toEqual({ total: 2, converted: 1, failed: 1 });
  });
  it('vn_address_convert_batch returns per-row errors for null and empty entries', async () => {
    const j = text(
      await client.callTool({
        name: 'vn_address_convert_batch',
        arguments: { addresses: ['Hà Nội', null, ''] },
      }),
    );
    expect(j.ok).toBe(true);
    const results = j.results as Array<{ ok: boolean; error?: { code?: string } }>;
    expect(results).toHaveLength(3);
    expect(results[1]?.ok).toBe(false);
    expect(typeof results[1]?.error?.code).toBe('string');
    expect((j.summary as { failed: number }).failed).toBeGreaterThanOrEqual(1);
  });
  it('vn_address_convert_batch still rejects more than 1000 entries', async () => {
    const addresses = Array.from({ length: 1001 }, () => 'Hà Nội');
    const r = await client
      .callTool({ name: 'vn_address_convert_batch', arguments: { addresses } })
      .then(
        (x) => ({ isError: (x as { isError?: boolean }).isError === true }),
        () => ({ isError: true }),
      );
    expect(r.isError).toBe(true);
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
  it('vn_einvoice_totals reports overflow instead of a blank amount', async () => {
    const invoice = {
      series: '1C25TAA',
      issueDate: '2025-10-15',
      seller: { name: 'A', taxId: '0100233488', address: 'HN' },
      buyer: { name: 'B', address: 'HCM' },
      lines: [{ name: 'X', quantity: 1, unitPrice: 100000, vatRate: 10 }],
    };
    const r = await client.callTool({ name: 'vn_einvoice_totals', arguments: { invoice } });
    expect(text(r).ok).toBe(true);
    const line = { name: 'X', quantity: 1, unitPrice: 4e15, vatRate: 10 };
    invoice.lines = [line, line, line];
    const bad = text(
      await client.callTool({ name: 'vn_einvoice_totals', arguments: { invoice } }),
    ) as { ok: boolean; error?: { code: string } };
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe('INVALID_AMOUNT');
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
  it('vn_lunar_tet', async () => {
    const j = text(await client.callTool({ name: 'vn_lunar_tet', arguments: { year: 2026 } }));
    expect(j).toMatchObject({ ok: true, date: '2026-02-17', canChi: 'Bính Ngọ' });
  });
  it('vn_lunar_tet error is flagged', async () => {
    const r = await client.callTool({ name: 'vn_lunar_tet', arguments: { year: 1 } });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatchObject({ ok: false, error: { code: expect.any(String) } });
  });
  it('vn_lunar_canchi', async () => {
    const j = text(await client.callTool({ name: 'vn_lunar_canchi', arguments: { year: 2024 } }));
    expect(j).toMatchObject({ ok: true, year: 2024, canChi: 'Giáp Thìn' });
  });
  it('vn_lunar_canchi error is flagged', async () => {
    const r = await client.callTool({ name: 'vn_lunar_canchi', arguments: { year: 'abc' } });
    expect(r.isError).toBe(true);
  });
  it('vn_lunar_canchi out-of-range year returns error result', async () => {
    const r = await client.callTool({ name: 'vn_lunar_canchi', arguments: { year: 5000 } });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatchObject({ ok: false, error: { code: 'OUT_OF_RANGE' } });
  });
  it('vn_tax_id_check_digit', async () => {
    const j = text(
      await client.callTool({ name: 'vn_tax_id_check_digit', arguments: { first9: '010023348' } }),
    );
    expect(j).toMatchObject({ ok: true, first9: '010023348', checkDigit: 8, taxId: '0100233488' });
  });
  it('vn_tax_id_check_digit error is flagged', async () => {
    const r = await client.callTool({
      name: 'vn_tax_id_check_digit',
      arguments: { first9: '12345' },
    });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatchObject({ ok: false, error: { code: expect.any(String) } });
  });
  it('vn_address_provinces', async () => {
    const j = text(await client.callTool({ name: 'vn_address_provinces', arguments: {} }));
    expect(j.ok).toBe(true);
    expect(j.count).toBe(34);
    expect((j.provinces as unknown[]).length).toBe(34);
  });
  it('vn_address_province', async () => {
    const j = text(
      await client.callTool({ name: 'vn_address_province', arguments: { query: 'TP.HCM' } }),
    );
    expect(j).toMatchObject({ ok: true, code: '79' });
  });
  it('vn_address_province error is flagged', async () => {
    const r = await client.callTool({
      name: 'vn_address_province',
      arguments: { query: 'zzzz không tồn tại' },
    });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatchObject({ ok: false, error: { code: expect.any(String) } });
  });
  it('vn_einvoice_example', async () => {
    const j = text(await client.callTool({ name: 'vn_einvoice_example', arguments: {} }));
    expect(j.series).toBe('1C25TAA');
    expect((j.seller as { taxId: string }).taxId).toBe('0100233488');
  });
  it('vn_einvoice_example result validates', async () => {
    const invoice = text(await client.callTool({ name: 'vn_einvoice_example', arguments: {} }));
    const v = text(await client.callTool({ name: 'vn_einvoice_validate', arguments: { invoice } }));
    expect(v.ok).toBe(true);
  });
});
