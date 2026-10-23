import { moneyToWords } from '../money/index.js';
import type { VnError } from '../shared/result.js';
import type { Invoice, InvoiceLine, VatRate } from './schema.js';

export interface LineTotals extends InvoiceLine {
  /** quantity * unitPrice - discount, rounded to VND. */
  amount: number;
  vatAmount: number;
  total: number;
}

export interface VatBreakdown {
  rate: VatRate;
  taxable: number;
  vat: number;
}

export interface InvoiceTotals {
  lines: LineTotals[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  byRate: VatBreakdown[];
  /** Grand total in Vietnamese words ("Số tiền bằng chữ"). */
  totalInWords: string;
  /** Set when a total is not finite or cannot be written in words; `totalInWords` is then ''. */
  totalInWordsError?: VnError;
}

/** Round half away from zero to an integer VND (Vietnamese accounting rounding). */
export function roundVnd(n: number): number {
  return Math.sign(n) * Math.round(Math.abs(n));
}

export function vatPercent(rate: VatRate): number {
  return typeof rate === 'number' ? rate : 0;
}

export function computeTotals(
  invoice: Invoice,
  options: { thousand?: 'nghìn' | 'ngàn'; capitalize?: boolean } = {},
): InvoiceTotals {
  const lines: LineTotals[] = [];
  const byRateMap = new Map<VatRate, VatBreakdown>();
  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;

  for (const line of invoice.lines) {
    if (line.isNote) {
      lines.push({ ...line, amount: 0, vatAmount: 0, total: 0 });
      continue;
    }
    const gross = roundVnd(line.quantity * line.unitPrice);
    const discount = roundVnd(line.discount ?? 0);
    const amount = gross - discount;
    const vatAmount = roundVnd((amount * vatPercent(line.vatRate)) / 100);
    lines.push({ ...line, amount, vatAmount, total: amount + vatAmount });
    subtotal += amount;
    discountTotal += discount;
    vatTotal += vatAmount;
    const b = byRateMap.get(line.vatRate) ?? { rate: line.vatRate, taxable: 0, vat: 0 };
    b.taxable += amount;
    b.vat += vatAmount;
    byRateMap.set(line.vatRate, b);
  }
  const grandTotal = subtotal + vatTotal;
  const base = {
    lines,
    subtotal,
    discountTotal,
    vatTotal,
    grandTotal,
    byRate: [...byRateMap.values()],
  };
  const all = [subtotal, discountTotal, vatTotal, grandTotal, ...lines.map((l) => l.total)];
  if (!all.every(Number.isFinite))
    return {
      ...base,
      totalInWords: '',
      totalInWordsError: {
        code: 'INVALID_TOTAL',
        message: 'Invoice totals are not finite numbers (check quantity and unitPrice)',
        hint: 'Run validateInvoice first; quantity and unitPrice must be finite numbers',
      },
    };
  const words = moneyToWords(grandTotal, {
    thousand: options.thousand,
    capitalize: options.capitalize ?? true,
  });
  if (!words.ok) return { ...base, totalInWords: '', totalInWordsError: words.error };
  return { ...base, totalInWords: words.words };
}
