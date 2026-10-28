import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type Args = Record<string, string | undefined>;

function define(
  server: McpServer,
  name: string,
  title: string,
  description: string,
  argsSchema: Record<string, z.ZodType<string | undefined>>,
  text: (a: Args) => string,
): void {
  server.registerPrompt(name, { title, description, argsSchema }, (args) => ({
    messages: [{ role: 'user' as const, content: { type: 'text' as const, text: text(args) } }],
  }));
}

export function registerPrompts(server: McpServer): void {
  define(
    server,
    'tao-vietqr',
    'Tạo mã QR VietQR',
    'Tạo mã QR chuyển khoản VietQR (NAPAS 247) cho một tài khoản ngân hàng.',
    {
      bank: z.string().describe('Ngân hàng: BIN, mã hoặc tên, ví dụ VCB, 970436, Vietcombank'),
      account: z.string().describe('Số tài khoản thụ hưởng'),
      amount: z
        .string()
        .optional()
        .describe('Số tiền (VND, số nguyên); bỏ trống nếu không cố định'),
      note: z.string().optional().describe('Nội dung chuyển khoản'),
    },
    ({ bank, account, amount, note }) =>
      `Use the vietqr_build tool to create a VietQR code with bank=${bank}, account=${account}` +
      (amount ? `, amount=${amount}` : '') +
      (note ? `, note=${note}` : '') +
      '. VietQR is built offline; it is not a payment confirmation, so never claim a transfer was received.',
  );

  define(
    server,
    'doi-dia-chi-moi',
    'Đổi địa chỉ cũ sang địa chỉ mới',
    'Chuyển địa chỉ cũ (63 tỉnh, quận/huyện) sang cấu trúc 2 cấp sau 01/07/2025.',
    { address: z.string().describe('Địa chỉ cũ cần chuyển đổi') },
    ({ address }) =>
      `Use the vn_address_convert tool with text="${address}". Since 01/07/2025 Vietnam has 34 provinces and ` +
      'no districts: report the new ward and province and the mapping type; if the old ward was split, list all candidates.',
  );

  define(
    server,
    'kiem-tra-mst',
    'Kiểm tra mã số thuế',
    'Kiểm tra cấu trúc và chữ số kiểm tra của mã số thuế (offline).',
    { taxId: z.string().describe('Mã số thuế (10, 13 hoặc 12 số)') },
    ({ taxId }) =>
      `Use the vn_tax_id_validate tool on "${taxId}". A valid result only means the structure and check digit are ` +
      'correct; it does not mean the tax ID is registered or active. Do not query or scrape the tax authority.',
  );

  define(
    server,
    'doc-cccd',
    'Đọc số CCCD',
    'Kiểm tra và giải mã số CCCD 12 số hoặc CMND 9 số (offline).',
    { id: z.string().describe('Số CCCD (12 số) hoặc CMND (9 số)') },
    ({ id }) =>
      `Use the vn_id_parse tool on "${id}". Format validity does not mean the identity exists. ` +
      'ID numbers are personal data: do not send them to third parties.',
  );

  define(
    server,
    'so-tien-bang-chu',
    'Số tiền bằng chữ',
    'Đọc số tiền VND bằng chữ tiếng Việt.',
    { amount: z.string().describe('Số tiền (VND)') },
    ({ amount }) =>
      `Use the vn_money_to_words tool with amount=${amount} and give the amount in Vietnamese words. ` +
      'Do not convert the number to words from memory.',
  );

  define(
    server,
    'ngay-lam-viec',
    'Cộng ngày làm việc',
    'Tính ngày sau khi cộng (hoặc trừ) số ngày làm việc, bỏ qua cuối tuần, nghỉ lễ và nghỉ bù.',
    {
      date: z.string().describe('Ngày bắt đầu (yyyy-mm-dd hoặc dd/mm/yyyy)'),
      days: z.string().describe('Số ngày làm việc cần cộng (âm để trừ)'),
    },
    ({ date, days }) =>
      `Use the vn_holidays_add_working_days tool with the day, month and year of ${date} and n=${days}. ` +
      'The start date is not counted. If the result has certain: false, say that unannounced holidays were crossed.',
  );

  define(
    server,
    'doi-am-duong',
    'Đổi ngày dương sang âm',
    'Đổi ngày dương lịch sang âm lịch kèm can chi.',
    { date: z.string().describe('Ngày dương lịch (dd/mm/yyyy hoặc yyyy-mm-dd)') },
    ({ date }) =>
      `Use the vn_lunar_from_solar tool with date=${date}. ` +
      'Never answer lunar calendar questions from memory; report the lunar date, leap-month flag and can chi from the tool.',
  );

  define(
    server,
    'kiem-tra-hoa-don',
    'Kiểm tra hóa đơn điện tử',
    'Kiểm tra dữ liệu hóa đơn điện tử theo Nghị định 123/2020.',
    { invoice: z.string().describe('Dữ liệu hóa đơn dạng JSON') },
    ({ invoice }) =>
      `Use the vn_einvoice_validate tool with this invoice JSON as the invoice argument:\n${invoice}\n` +
      'List errors and warnings. This only validates data; it does not sign, transmit or register invoices with the tax authority.',
  );
}
