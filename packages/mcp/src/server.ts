import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import QRCode from 'qrcode';
import {
  buildVietQR,
  parseVietQR,
  searchBanks,
  parseAddress,
  convertAddress,
  searchWards,
  validateTaxId,
  moneyToWords,
  lunarInfo,
  lunarToSolar,
  holidays,
  parseDateInput,
  validateInvoice,
  computeTotals,
  MockProvider,
  VERSION,
} from '@vn-skills/core';

type ToolResult = {
  content: Array<
    { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }
  >;
  isError?: boolean;
};

const json = (data: unknown, isError = false): ToolResult => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
    },
  ],
  isError,
});

const mock = new MockProvider();

export function createServer(): McpServer {
  const server = new McpServer({ name: 'vn-skills', version: VERSION });

  server.registerTool(
    'vietqr_build',
    {
      title: 'Build VietQR',
      description:
        'Create a VietQR (NAPAS 247) bank-transfer QR payload. Returns the EMVCo string, CRC and optionally a PNG image. Bank accepts BIN (970436), code (VCB) or name (Vietcombank). Amount is integer VND; note is sanitized (no diacritics, max 25 chars).',
      inputSchema: {
        bank: z.string().describe('Bank BIN, code or name, e.g. "VCB", "970436", "Vietcombank"'),
        account: z.string().describe('Beneficiary account number'),
        amount: z
          .union([z.number(), z.string()])
          .optional()
          .describe('Amount in VND (integer). Omit for a static QR.'),
        note: z.string().optional().describe('Transfer note / purpose'),
        image: z.boolean().optional().describe('Also return a PNG image (base64). Default false.'),
      },
    },
    async ({ bank, account, amount, note, image }) => {
      const r = buildVietQR({ bank, account, amount, note });
      if (!r.ok) return json({ ok: false, error: r.error }, true);
      const data = {
        ok: true,
        payload: r.payload,
        bank: r.bank,
        account: r.account,
        amount: r.amount,
        note: r.note,
        dynamic: r.dynamic,
        crc: r.crc,
        warnings: r.warnings,
      };
      const result = json(data);
      if (image) {
        const dataUrl = await QRCode.toDataURL(r.payload, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 512,
        });
        result.content.push({ type: 'image', data: dataUrl.split(',')[1]!, mimeType: 'image/png' });
      }
      return result;
    },
  );

  server.registerTool(
    'vietqr_parse',
    {
      title: 'Parse VietQR',
      description:
        'Decode a VietQR / EMVCo QR payload string: bank, account, amount, note, and whether the CRC is valid.',
      inputSchema: { payload: z.string().describe('The decoded QR text, starting with 000201') },
    },
    async ({ payload }) => {
      const r = parseVietQR(payload);
      return r.ok ? json({ ...r, ok: true }) : json({ ok: false, error: r.error }, true);
    },
  );

  server.registerTool(
    'vietqr_banks',
    {
      title: 'Search banks',
      description:
        'Search the NAPAS bank list by BIN, code, short name or full name. Empty query lists all banks.',
      inputSchema: { query: z.string().optional().describe('e.g. "vietcombank", "VCB", "9704"') },
    },
    async ({ query }) => json({ ok: true, banks: searchBanks(query ?? '') }),
  );

  server.registerTool(
    'vn_address_parse',
    {
      title: 'Parse Vietnamese address',
      description:
        'Parse a free-text Vietnamese address into province / ward / street using the post-01/07/2025 catalogue (34 provinces, no districts). Handles missing diacritics and abbreviations (TP.HCM, Q.1, P. Bến Nghé). Set mode "legacy" for pre-2025 addresses with districts.',
      inputSchema: {
        text: z.string().describe('Free-text address'),
        mode: z.enum(['auto', 'from2025', 'legacy']).optional().describe('Default auto'),
      },
    },
    async ({ text, mode }) => {
      const r = parseAddress(text, { mode: mode ?? 'auto' });
      if (!r.ok) return json({ ok: false, error: r.error }, true);
      const slim = (u?: { code: string; fullName: string; postalCode?: string }) =>
        u && { code: u.code, fullName: u.fullName, postalCode: u.postalCode };
      return json(
        r.mode === 'from2025'
          ? {
              ok: true,
              mode: r.mode,
              province: slim(r.province),
              ward: slim(r.ward),
              street: r.street,
              formatted: r.formatted,
              confidence: r.confidence,
              matches: r.matches,
              warnings: r.warnings,
            }
          : {
              ok: true,
              mode: r.mode,
              province: slim(r.province),
              district: slim(r.district),
              ward: slim(r.ward),
              street: r.street,
              formatted: r.formatted,
              confidence: r.confidence,
              matches: r.matches,
              warnings: r.warnings,
            },
      );
    },
  );

  server.registerTool(
    'vn_address_convert',
    {
      title: 'Convert old address to new (2025)',
      description:
        'Convert a pre-July-2025 Vietnamese address (63 provinces, districts, wards) into the new 2-level structure (34 provinces, wards). Returns the new ward/province, mapping type (unchanged/merged/divided) and all candidates when the old ward was split.',
      inputSchema: {
        text: z.string().optional().describe('Free-text old address'),
        province: z.string().optional(),
        district: z.string().optional(),
        ward: z.string().optional(),
        street: z.string().optional(),
      },
    },
    async ({ text, province, district, ward, street }) => {
      const input = text ?? (province ? { province, district, ward, street } : undefined);
      if (!input)
        return json(
          { ok: false, error: { code: 'EMPTY', message: 'Provide text or province' } },
          true,
        );
      const r = convertAddress(input);
      if (!r.ok) return json({ ok: false, error: r.error }, true);
      return json({
        ok: true,
        mappingType: r.mappingType,
        old: {
          province: r.old.province?.fullName,
          district: r.old.district?.fullName,
          ward: r.old.ward?.fullName,
          street: r.old.street,
          formatted: r.old.formatted,
        },
        new: {
          province: { code: r.new.province.code, fullName: r.new.province.fullName },
          ward: r.new.ward && {
            code: r.new.ward.code,
            fullName: r.new.ward.fullName,
            postalCode: r.new.ward.postalCode,
          },
          street: r.new.street,
          formatted: r.new.formatted,
        },
        candidates: r.candidates.map((c) => ({
          code: c.ward.code,
          fullName: c.ward.fullName,
          province: c.province.fullName,
          isDefault: c.isDefault,
        })),
        confidence: r.confidence,
        warnings: r.warnings,
      });
    },
  );

  server.registerTool(
    'vn_address_search_wards',
    {
      title: 'Search wards',
      description: 'Find current (post-2025) wards by name, optionally within a province.',
      inputSchema: {
        query: z.string(),
        province: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ query, province, limit }) =>
      json({
        ok: true,
        wards: searchWards(query, province, limit ?? 10).map((x) => ({
          code: x.ward.code,
          fullName: x.ward.fullName,
          province: x.province.fullName,
          postalCode: x.ward.postalCode,
          score: x.score,
        })),
      }),
  );

  server.registerTool(
    'vn_tax_id_validate',
    {
      title: 'Validate tax ID',
      description:
        'Offline validation of a Vietnamese tax ID (mã số thuế): 10 digits (enterprise), 13 digits (branch, e.g. 0100233488-001) with check-digit verification, or 12-digit personal ID (format only). Does not query the tax authority.',
      inputSchema: { taxId: z.string() },
    },
    async ({ taxId }) => {
      const r = validateTaxId(taxId);
      return r.ok
        ? json({ ...r, valid: true })
        : json({ ok: false, valid: false, error: r.error }, true);
    },
  );

  server.registerTool(
    'vn_money_to_words',
    {
      title: 'Amount in Vietnamese words',
      description:
        'Read an integer VND amount in Vietnamese words, e.g. 1200000 -> "một triệu hai trăm nghìn đồng". Options: thousand "nghìn"/"ngàn", odd "lẻ"/"linh", capitalize, unit.',
      inputSchema: {
        amount: z.union([z.number(), z.string()]),
        thousand: z.enum(['nghìn', 'ngàn']).optional(),
        odd: z.enum(['lẻ', 'linh']).optional(),
        unit: z.string().optional().describe('Default "đồng"; "" for none'),
        capitalize: z.boolean().optional(),
        chan: z.boolean().optional().describe('Append "chẵn" for round amounts'),
      },
    },
    async ({ amount, ...opts }) => {
      const r = moneyToWords(amount, opts);
      return r.ok
        ? json({ ok: true, amount: r.amount, words: r.words })
        : json({ ok: false, error: r.error }, true);
    },
  );

  server.registerTool(
    'vn_lunar_from_solar',
    {
      title: 'Solar to lunar date',
      description:
        'Convert a Gregorian date (dd/mm/yyyy or yyyy-mm-dd) to the Vietnamese lunar date with can chi (e.g. Ất Tỵ), zodiac, leap-month flag and solar term.',
      inputSchema: { date: z.string() },
    },
    async ({ date }) => {
      const d = parseDateInput(date);
      if (!d.ok) return json({ ok: false, error: d.error }, true);
      const r = lunarInfo(d.day, d.month, d.year);
      return r.ok ? json(r) : json({ ok: false, error: r.error }, true);
    },
  );

  server.registerTool(
    'vn_lunar_to_solar',
    {
      title: 'Lunar to solar date',
      description:
        'Convert a Vietnamese lunar date to the Gregorian date. Set leap=true for the leap (nhuận) month.',
      inputSchema: {
        day: z.number().int(),
        month: z.number().int(),
        year: z.number().int(),
        leap: z.boolean().optional(),
      },
    },
    async ({ day, month, year, leap }) => {
      const r = lunarToSolar(day, month, year, leap ?? false);
      return r.ok
        ? json({
            ok: true,
            day: r.day,
            month: r.month,
            year: r.year,
            date: `${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`,
          })
        : json({ ok: false, error: r.error }, true);
    },
  );

  server.registerTool(
    'vn_lunar_holidays',
    {
      title: 'Vietnamese holidays',
      description:
        'List Vietnamese holidays for a solar year (Tết, Giỗ Tổ Hùng Vương, 30/4, 1/5, 2/9, Trung thu...). Lunar holidays are resolved to solar dates. publicOnly limits to official days off.',
      inputSchema: { year: z.number().int(), publicOnly: z.boolean().optional() },
    },
    async ({ year, publicOnly }) =>
      json({ ok: true, year, holidays: holidays(year, { publicOnly }) }),
  );

  const invoiceSchema = z
    .record(z.string(), z.unknown())
    .describe(
      'Invoice object: {series, issueDate, seller{name,taxId,address}, buyer{...}, lines[{name,quantity,unitPrice,vatRate}]}',
    );

  server.registerTool(
    'vn_einvoice_validate',
    {
      title: 'Validate e-invoice',
      description:
        'Validate an e-invoice (hóa đơn điện tử) object against the mandatory contents of Decree 123/2020 (series, date, seller tax ID, lines, VAT rates 0/5/8/10/KCT/KKKNT).',
      inputSchema: { invoice: invoiceSchema },
    },
    async ({ invoice }) => {
      const v = validateInvoice(invoice);
      return json({ ok: v.ok, errors: v.errors, warnings: v.warnings }, !v.ok);
    },
  );

  server.registerTool(
    'vn_einvoice_totals',
    {
      title: 'Compute e-invoice totals',
      description:
        'Validate an invoice and compute line amounts, VAT per rate, grand total and the total in Vietnamese words.',
      inputSchema: { invoice: invoiceSchema, thousand: z.enum(['nghìn', 'ngàn']).optional() },
    },
    async ({ invoice, thousand }) => {
      const v = validateInvoice(invoice);
      if (!v.ok) return json({ ok: false, errors: v.errors }, true);
      return json({ ok: true, ...computeTotals(v.invoice!, { thousand }), warnings: v.warnings });
    },
  );

  server.registerTool(
    'vn_einvoice_mock_issue',
    {
      title: 'Issue invoice (mock)',
      description:
        'Issue an invoice through the in-memory MOCK provider (no real API, nothing persisted). Useful for testing integrations before wiring MISA/Viettel/VNPT sandbox adapters.',
      inputSchema: { invoice: invoiceSchema },
    },
    async ({ invoice }) => {
      const v = validateInvoice(invoice);
      if (!v.ok) return json({ ok: false, errors: v.errors }, true);
      const issued = await mock.createInvoice(v.invoice!);
      return json({ ok: true, ...issued });
    },
  );

  return server;
}
