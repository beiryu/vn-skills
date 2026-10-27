import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import QRCode from 'qrcode';
import { decodeQrPng } from '@vn-skills/cli/decode';
import {
  buildVietQR,
  parseVietQR,
  searchBanks,
  parseAddress,
  splitName,
  slugifyName,
  initials,
  sortNames,
  convertAddress,
  convertAddresses,
  searchWards,
  parsePhone,
  validateTaxId,
  parseCitizenId,
  moneyToWords,
  formatNumber,
  formatVnd,
  formatCompactVnd,
  formatDate,
  parseAmount,
  lunarInfo,
  lunarToSolar,
  tetInfo,
  canChiOfYear,
  taxIdCheckDigitResult,
  lookupProvince,
  provincesList,
  exampleInvoice,
  holidays,
  publicHolidays,
  isWorkingDay,
  addWorkingDays,
  countWorkingDays,
  parseDateInput,
  validateInvoice,
  computeTotals,
  MockProvider,
  VERSION,
  type VnError,
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
      text: JSON.stringify(data, (_k, v: unknown) => (typeof v === 'bigint' ? v.toString() : v), 2),
    },
  ],
  isError,
});

const mock = new MockProvider();

const OFFLINE_READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function createServer(): McpServer {
  const server = new McpServer({ name: 'vn-skills', version: VERSION });

  server.registerTool(
    'vietqr_build',
    {
      title: 'Build VietQR',
      annotations: OFFLINE_READ_ONLY,
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
      annotations: OFFLINE_READ_ONLY,
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
    'vietqr_decode',
    {
      title: 'Decode VietQR image',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Read the QR code in a PNG image file and decode it like vietqr_parse: bank, account, amount, note, CRC validity. Returns READ_ERROR for an unreadable/non-PNG file and NO_QR when no QR code is found.',
      inputSchema: { path: z.string().describe('Path to a PNG image containing a VietQR code') },
    },
    async ({ path }) => {
      const d = decodeQrPng(path);
      if (!d.ok) return json({ ok: false, error: d.error }, true);
      const r = parseVietQR(d.payload);
      return r.ok
        ? json({ ...r, ok: true, payload: d.payload })
        : json({ ok: false, error: r.error }, true);
    },
  );

  server.registerTool(
    'vietqr_banks',
    {
      title: 'Search banks',
      annotations: OFFLINE_READ_ONLY,
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
      annotations: OFFLINE_READ_ONLY,
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
    'vn_address_convert_batch',
    {
      title: 'Convert many old addresses to new (2025)',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Convert up to 1000 pre-July-2025 Vietnamese free-text addresses (63 provinces, districts, wards) into the new 2-level structure (34 provinces, wards) in one call. Returns per-row results plus a summary of converted and failed rows. Null, empty or non-string entries do not fail the call: they come back as failed rows (ok:false with an error code) and are counted in summary.failed.',
      inputSchema: {
        addresses: z
          .array(z.unknown())
          .max(1000)
          .describe('Free-text old addresses (max 1000); null or empty entries become failed rows'),
      },
    },
    async ({ addresses }) => {
      const r = convertAddresses(addresses);
      return json(r, !r.ok);
    },
  );

  server.registerTool(
    'vn_address_convert',
    {
      title: 'Convert old address to new (2025)',
      annotations: OFFLINE_READ_ONLY,
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
      annotations: OFFLINE_READ_ONLY,
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
      annotations: OFFLINE_READ_ONLY,
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
    'vn_id_parse',
    {
      title: 'Parse citizen ID',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Offline validation and decoding of a 12-digit CCCD (province, sex, birth year; legacy province mapped to 2025 province) or format check of a 9-digit CMND. Format validity does not prove the identity exists.',
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      const r = parseCitizenId(id);
      return r.ok ? json(r) : json(r, true);
    },
  );

  server.registerTool(
    'vn_phone',
    {
      title: 'Vietnamese phone number',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Normalise a Vietnamese phone number (0/84/+84, old 11-digit 01xx mobile prefixes) to national and E.164 forms and classify it: mobile (original carrier) or landline (area code, province). Offline.',
      inputSchema: { phone: z.string() },
    },
    async ({ phone }) => {
      const r = parsePhone(phone);
      return r.ok ? json(r) : json(r, true);
    },
  );

  server.registerTool(
    'vn_name',
    {
      title: 'Vietnamese name tools',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Split a Vietnamese full name into họ / tên đệm / tên (handles Tôn Thất, Nguyễn Phúc), plus slug and initials; or sort a list of names by tên with Vietnamese collation.',
      inputSchema: {
        name: z.string().optional().describe('Full name to split'),
        names: z.array(z.string()).optional().describe('Names to sort'),
        ascii: z.boolean().optional().describe('Strip diacritics from initials'),
      },
    },
    async ({ name, names, ascii }) => {
      if (names) return json({ ok: true, sorted: sortNames(names) });
      if (name === undefined) {
        return json(
          { ok: false, error: { code: 'MISSING_INPUT', message: 'Provide name or names' } },
          true,
        );
      }
      const r = splitName(name);
      if (!r.ok) return json(r, true);
      return json({ ...r, slug: slugifyName(name), initials: initials(name, { ascii }) });
    },
  );

  server.registerTool(
    'vn_money_to_words',
    {
      title: 'Amount in Vietnamese words',
      annotations: OFFLINE_READ_ONLY,
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
    'vn_number_format',
    {
      title: 'Vietnamese number formatting and parsing',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Format numbers/VND/dates the Vietnamese way (1.234.567,89; 1.200.000 ₫; 1,2 triệu; dd/MM/yyyy) or parse typed amounts ("1tr2", "500k", "1,5 tỷ"; "1.500" = 1500).',
      inputSchema: {
        mode: z.enum(['number', 'vnd', 'compact', 'date', 'parse']),
        value: z.union([z.number(), z.string()]),
      },
    },
    async ({ mode, value }) => {
      const s = String(value);
      if (mode === 'parse') {
        const r = parseAmount(s);
        return r.ok
          ? json({ ok: true, value: r.value })
          : json({ ok: false, error: r.error }, true);
      }
      const r =
        mode === 'date'
          ? formatDate(s)
          : mode === 'vnd'
            ? formatVnd(Number(s))
            : mode === 'compact'
              ? formatCompactVnd(Number(s))
              : formatNumber(Number(s));
      return r.ok ? json({ ok: true, text: r.text }) : json({ ok: false, error: r.error }, true);
    },
  );

  server.registerTool(
    'vn_lunar_from_solar',
    {
      title: 'Solar to lunar date',
      annotations: OFFLINE_READ_ONLY,
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
      annotations: OFFLINE_READ_ONLY,
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
      annotations: OFFLINE_READ_ONLY,
      description:
        'List Vietnamese holidays for a solar year (Tết, Giỗ Tổ Hùng Vương, 30/4, 1/5, 2/9, Trung thu...). Lunar holidays are resolved to solar dates. publicOnly limits to official days off.',
      inputSchema: { year: z.number().int(), publicOnly: z.boolean().optional() },
    },
    async ({ year, publicOnly }) =>
      json({ ok: true, year, holidays: holidays(year, { publicOnly }) }),
  );

  server.registerTool(
    'vn_holidays_year',
    {
      title: 'Vietnam official days off for a year',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Official days off for public-sector staff in a year (2023-2199): Tết Dương lịch, Tết Âm lịch, Giỗ Tổ Hùng Vương, 30/4, 1/5, Quốc khánh, Ngày Văn hóa Việt Nam 24/11 (from 2026), with nghỉ bù and swapped working Saturdays from the Government notice. Unannounced years return the statutory days, announced: false and the pending Tết / National Day days.',
      inputSchema: { year: z.number().int() },
    },
    async ({ year }) => {
      const r = publicHolidays(year);
      return r.ok ? json(r) : json(r, true);
    },
  );

  server.registerTool(
    'vn_holidays_is_working_day',
    {
      title: 'Is it a working day in Vietnam?',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Whether a date is a working day for public-sector staff (Monday-Friday minus holidays and nghỉ bù, plus swapped Saturdays). certain: false when the year is not announced and the date may still become a Tết or National Day day off.',
      inputSchema: { day: z.number().int(), month: z.number().int(), year: z.number().int() },
    },
    async ({ day, month, year }) => {
      const r = isWorkingDay(day, month, year);
      return r.ok ? json(r) : json(r, true);
    },
  );

  server.registerTool(
    'vn_holidays_add_working_days',
    {
      title: 'Add Vietnamese working days',
      annotations: OFFLINE_READ_ONLY,
      description:
        'The date n working days after (or before, n < 0) a date, skipping weekends, holidays and nghỉ bù; the start date is not counted. certain: false if unannounced days were crossed.',
      inputSchema: {
        day: z.number().int(),
        month: z.number().int(),
        year: z.number().int(),
        n: z.number().int(),
      },
    },
    async ({ day, month, year, n }) => {
      const r = addWorkingDays(day, month, year, n);
      return r.ok ? json(r) : json(r, true);
    },
  );

  server.registerTool(
    'vn_holidays_count_working_days',
    {
      title: 'Count Vietnamese working days',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Number of working days in (from, to]: the start date is not counted, the end date is; negative if to is before from. Skips weekends, holidays and nghỉ bù. certain: false if unannounced Tết or National Day days were crossed.',
      inputSchema: { from: z.string(), to: z.string() },
    },
    async ({ from, to }) => {
      const a = parseDateInput(from);
      if (!a.ok) return json({ ok: false, error: a.error }, true);
      const b = parseDateInput(to);
      if (!b.ok) return json({ ok: false, error: b.error }, true);
      const r = countWorkingDays(a.day, a.month, a.year, b.day, b.month, b.year);
      return r.ok ? json(r) : json(r, true);
    },
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
      annotations: OFFLINE_READ_ONLY,
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
      annotations: OFFLINE_READ_ONLY,
      description:
        'Validate an invoice and compute line amounts, VAT per rate, grand total and the total in Vietnamese words.',
      inputSchema: { invoice: invoiceSchema, thousand: z.enum(['nghìn', 'ngàn']).optional() },
    },
    async ({ invoice, thousand }) => {
      const v = validateInvoice(invoice);
      if (!v.ok) return json({ ok: false, errors: v.errors }, true);
      const t = computeTotals(v.invoice!, { thousand });
      if (t.totalInWordsError) return json({ ok: false, error: t.totalInWordsError }, true);
      return json({ ok: true, ...t, warnings: v.warnings });
    },
  );

  server.registerTool(
    'vn_einvoice_mock_issue',
    {
      title: 'Issue invoice (mock)',
      annotations: OFFLINE_READ_ONLY,
      description:
        'Issue an invoice through the in-memory MOCK provider (no real API, nothing persisted). Useful for testing integrations before wiring MISA/Viettel/VNPT sandbox adapters.',
      inputSchema: { invoice: invoiceSchema },
    },
    async ({ invoice }) => {
      const v = validateInvoice(invoice);
      if (!v.ok) return json({ ok: false, errors: v.errors }, true);
      try {
        const issued = await mock.createInvoice(v.invoice!);
        return json({ ok: true, ...issued });
      } catch (e) {
        const error = (e as { error?: VnError }).error;
        if (error) return json({ ok: false, error }, true);
        throw e;
      }
    },
  );

  server.registerTool(
    'vn_lunar_tet',
    {
      title: 'Date of Tết',
      annotations: OFFLINE_READ_ONLY,
      description: 'Solar date of Tết (lunar new year) for a year, with can chi and leap month.',
      inputSchema: { year: z.number().int().describe('Year, e.g. 2026') },
    },
    async ({ year }) => {
      const r = tetInfo(year);
      return json(r, !r.ok);
    },
  );

  server.registerTool(
    'vn_lunar_canchi',
    {
      title: 'Can chi of a year',
      annotations: OFFLINE_READ_ONLY,
      description: 'Can chi (e.g. Giáp Thìn) of a lunar year, with its leap month if any.',
      inputSchema: { year: z.number().int().describe('Year, e.g. 2024') },
    },
    async ({ year }) => {
      const r = canChiOfYear(year);
      return json(r, !r.ok);
    },
  );

  server.registerTool(
    'vn_tax_id_check_digit',
    {
      title: 'Tax ID check digit',
      annotations: OFFLINE_READ_ONLY,
      description: 'Compute the 10th check digit of a Vietnamese tax ID from its first 9 digits.',
      inputSchema: { first9: z.string().describe('Exactly 9 digits') },
    },
    async ({ first9 }) => {
      const r = taxIdCheckDigitResult(first9);
      return json(r, !r.ok);
    },
  );

  server.registerTool(
    'vn_address_provinces',
    {
      title: 'List provinces',
      annotations: OFFLINE_READ_ONLY,
      description: 'List the 34 current Vietnamese provinces (since 01/07/2025) with ward counts.',
      inputSchema: {},
    },
    async () => json(provincesList()),
  );

  server.registerTool(
    'vn_address_province',
    {
      title: 'Look up a province',
      annotations: OFFLINE_READ_ONLY,
      description: 'Look up one current province by name, alias (e.g. "TP.HCM") or 2-digit code.',
      inputSchema: { query: z.string().describe('Province name, alias or code') },
    },
    async ({ query }) => {
      const r = lookupProvince(query);
      return json(r, !r.ok);
    },
  );

  server.registerTool(
    'vn_einvoice_example',
    {
      title: 'Example e-invoice',
      annotations: OFFLINE_READ_ONLY,
      description: 'Return a valid example invoice object to start from.',
      inputSchema: {},
    },
    async () => json(exampleInvoice()),
  );

  return server;
}
