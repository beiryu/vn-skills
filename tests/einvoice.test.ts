import { describe, expect, it } from 'vitest';
import {
  validateInvoice,
  computeTotals,
  MockProvider,
  createProvider,
  NotImplementedError,
  ConfigError,
  roundVnd,
  MisaMeInvoiceProvider,
  type Party,
  type InvoiceLine,
} from '@vn-skills/core';

type LooseLine = Partial<Omit<InvoiceLine, 'vatRate'>> & { name: string; vatRate: unknown };
type LooseInvoice = {
  series: string;
  issueDate: string;
  seller: Party;
  buyer: Party;
  lines: LooseLine[];
};

const base = (): LooseInvoice => ({
  series: '1C25TAA',
  issueDate: '2025-10-15',
  seller: { name: 'Công ty A', taxId: '0100233488', address: 'Hà Nội' },
  buyer: { name: 'Công ty B', taxId: '0314409058', address: 'TP.HCM' },
  lines: [
    { name: 'Tư vấn', unit: 'giờ', quantity: 10, unitPrice: 500000, vatRate: 10 },
    { name: 'Máy chủ', unit: 'tháng', quantity: 1, unitPrice: 2000000, vatRate: 8 },
  ],
});

describe('validateInvoice', () => {
  it('accepts a valid invoice', () => {
    const v = validateInvoice(base());
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.invoice?.lines[0]?.no).toBe(1);
  });
  it('rejects non-object', () => expect(validateInvoice('x').ok).toBe(false));
  it('rejects missing series', () => {
    const inv = base() as Record<string, unknown>;
    delete inv.series;
    expect(validateInvoice(inv).errors.some((e) => e.path === 'series')).toBe(true);
  });
  it('warns on odd series pattern', () => {
    expect(
      validateInvoice({ ...base(), series: 'ABC' }).warnings.some((w) => w.path === 'series'),
    ).toBe(true);
  });
  it('rejects bad issueDate', () => {
    expect(
      validateInvoice({ ...base(), issueDate: '15/10/2025' }).errors.some(
        (e) => e.path === 'issueDate',
      ),
    ).toBe(true);
  });
  it('rejects non-VND currency', () => {
    expect(
      validateInvoice({ ...base(), currency: 'USD' }).errors.some((e) => e.path === 'currency'),
    ).toBe(true);
  });
  it('rejects seller without tax id', () => {
    const inv = base();
    inv.seller = { name: 'A', address: 'x' } as typeof inv.seller;
    expect(validateInvoice(inv).errors.some((e) => e.path === 'seller.taxId')).toBe(true);
  });
  it('rejects invalid seller tax id checksum', () => {
    const inv = base();
    inv.seller.taxId = '0100233480';
    expect(validateInvoice(inv).errors.some((e) => e.path === 'seller.taxId')).toBe(true);
  });
  it('warns when retail buyer has no ids', () => {
    const inv = base();
    inv.buyer = { name: 'Khách lẻ', address: '' } as typeof inv.buyer;
    const v = validateInvoice(inv);
    expect(v.ok).toBe(true);
    expect(v.warnings.some((w) => w.path === 'buyer.taxId')).toBe(true);
  });
  it('rejects empty lines', () => expect(validateInvoice({ ...base(), lines: [] }).ok).toBe(false));
  it('rejects zero quantity', () => {
    const inv = base();
    inv.lines[0]!.quantity = 0;
    expect(validateInvoice(inv).errors.some((e) => e.path === 'lines[0].quantity')).toBe(true);
  });
  it('rejects negative price', () => {
    const inv = base();
    inv.lines[0]!.unitPrice = -1;
    expect(validateInvoice(inv).ok).toBe(false);
  });
  it('rejects unknown VAT rate', () => {
    const inv = base();
    (inv.lines[0] as { vatRate: unknown }).vatRate = 7;
    expect(validateInvoice(inv).errors.some((e) => e.path === 'lines[0].vatRate')).toBe(true);
  });
  it('accepts KCT / KKKNT rates', () => {
    const inv = base();
    (inv.lines[0] as { vatRate: unknown }).vatRate = 'KCT';
    (inv.lines[1] as { vatRate: unknown }).vatRate = 'KKKNT';
    expect(validateInvoice(inv).ok).toBe(true);
  });
  it('accepts note lines', () => {
    const inv = base();
    (inv.lines as unknown[]).push({ name: 'Ghi chú', isNote: true });
    const v = validateInvoice(inv);
    expect(v.ok).toBe(true);
    expect(v.invoice?.lines[2]?.isNote).toBe(true);
  });
  it('warns on decimal unit price', () => {
    const inv = base();
    inv.lines[0]!.unitPrice = 1000.5;
    expect(validateInvoice(inv).warnings.some((w) => w.path === 'lines[0].unitPrice')).toBe(true);
  });
});

describe('computeTotals', () => {
  it('computes VAT per rate and total in words', () => {
    const v = validateInvoice(base());
    const t = computeTotals(v.invoice!);
    expect(t.subtotal).toBe(7_000_000);
    expect(t.vatTotal).toBe(500_000 + 160_000);
    expect(t.grandTotal).toBe(7_660_000);
    expect(t.byRate.find((b) => b.rate === 10)?.vat).toBe(500_000);
    expect(t.byRate.find((b) => b.rate === 8)?.vat).toBe(160_000);
    expect(t.totalInWords).toBe('Bảy triệu sáu trăm sáu mươi nghìn đồng');
  });
  it('applies discounts', () => {
    const inv = base();
    inv.lines = [{ name: 'X', quantity: 2, unitPrice: 100_000, discount: 50_000, vatRate: 10 }];
    const t = computeTotals(validateInvoice(inv).invoice!);
    expect(t.subtotal).toBe(150_000);
    expect(t.discountTotal).toBe(50_000);
    expect(t.vatTotal).toBe(15_000);
  });
  it('rounds VAT to whole VND', () => {
    const inv = base();
    inv.lines = [{ name: 'X', quantity: 3, unitPrice: 33_333, vatRate: 8 }];
    const t = computeTotals(validateInvoice(inv).invoice!);
    expect(t.lines[0]?.amount).toBe(99_999);
    expect(t.lines[0]?.vatAmount).toBe(8_000); // 7999.92 -> 8000
  });
  it('KCT lines carry no VAT', () => {
    const inv = base();
    inv.lines = [{ name: 'X', quantity: 1, unitPrice: 1000, vatRate: 'KCT' as never }];
    const t = computeTotals(validateInvoice(inv).invoice!);
    expect(t.vatTotal).toBe(0);
    expect(t.grandTotal).toBe(1000);
  });
  it('southern wording option', () => {
    const t = computeTotals(validateInvoice(base()).invoice!, { thousand: 'ngàn' });
    expect(t.totalInWords).toContain('ngàn');
  });
  it('roundVnd half away from zero', () => {
    expect(roundVnd(0.5)).toBe(1);
    expect(roundVnd(-0.5)).toBe(-1);
    expect(roundVnd(2.4)).toBe(2);
  });
});

describe('MockProvider', () => {
  it('creates, gets, lists and cancels', async () => {
    const p = new MockProvider({ now: () => new Date('2025-10-15T00:00:00Z') });
    const inv = validateInvoice(base()).invoice!;
    const a = await p.createInvoice(inv);
    const b = await p.createInvoice(inv);
    expect(a.number).toBe('00000001');
    expect(b.number).toBe('00000002');
    expect(a.status).toBe('issued');
    expect(a.totals.grandTotal).toBe(7_660_000);
    expect(a.issuedAt).toBe('2025-10-15T00:00:00.000Z');
    expect((await p.getInvoice(a.id))?.id).toBe(a.id);
    expect((await p.listInvoices()).length).toBe(2);
    const c = await p.cancelInvoice(a.id, 'sai thông tin');
    expect(c.status).toBe('cancelled');
    expect((await p.listInvoices({ status: 'cancelled' })).length).toBe(1);
    await expect(p.cancelInvoice(a.id, 'x')).rejects.toThrow(/already cancelled/);
    await expect(p.cancelInvoice('nope', 'x')).rejects.toThrow(/not found/);
    await expect(p.cancelInvoice(b.id, '')).rejects.toThrow(/reason/);
  });
  it('honours an explicit invoice number', async () => {
    const p = new MockProvider();
    const issued = await p.createInvoice({
      ...validateInvoice(base()).invoice!,
      number: '00000099',
    });
    expect(issued.number).toBe('00000099');
  });
  it('createProvider("mock") works', async () => {
    const p = createProvider('mock');
    expect(p.capabilities.mock).toBe(true);
  });
});

describe('real provider skeletons', () => {
  it('throw ConfigError without env', () => {
    expect(() => createProvider('misa', {})).toThrow(ConfigError);
    expect(() => createProvider('viettel', {})).toThrow(ConfigError);
    expect(() => createProvider('vnpt', {})).toThrow(ConfigError);
  });
  it('throw NotImplementedError with env', async () => {
    const env = {
      VN_EINVOICE_MISA_BASE_URL: 'https://sandbox.invalid',
      VN_EINVOICE_MISA_APP_ID: 'x',
      VN_EINVOICE_MISA_TAX_CODE: 'x',
      VN_EINVOICE_MISA_USERNAME: 'x',
      VN_EINVOICE_MISA_PASSWORD: 'x',
    };
    const p = new MisaMeInvoiceProvider(env);
    expect(p.capabilities.create).toBe(false);
    await expect(p.createInvoice(validateInvoice(base()).invoice!)).rejects.toThrow(
      NotImplementedError,
    );
  });
  it('rejects unknown provider', () =>
    expect(() => createProvider('foo' as never)).toThrow(/Unknown provider/));
});
