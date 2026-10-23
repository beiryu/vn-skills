import { computeTotals } from '../totals.js';
import type { Invoice } from '../schema.js';
import {
  type EInvoiceProvider,
  type IssuedInvoice,
  type InvoiceStatus,
  type ProviderCapabilities,
} from '../provider.js';

/**
 * In-memory provider for development and tests. Numbers are deterministic (sequential per series).
 * Nothing is persisted; every process starts empty unless `seed` is passed.
 */
export class MockProvider implements EInvoiceProvider {
  readonly name = 'mock';
  readonly capabilities: ProviderCapabilities = {
    create: true,
    get: true,
    cancel: true,
    list: true,
    mock: true,
  };
  private store = new Map<string, IssuedInvoice>();
  private counters = new Map<string, number>();
  private clock: () => Date;

  constructor(options: { seed?: IssuedInvoice[]; now?: () => Date } = {}) {
    this.clock = options.now ?? (() => new Date());
    for (const inv of options.seed ?? []) this.store.set(inv.id, inv);
  }

  async createInvoice(invoice: Invoice): Promise<IssuedInvoice> {
    const totals = computeTotals(invoice);
    if (totals.totalInWordsError)
      throw Object.assign(new Error(totals.totalInWordsError.message), {
        error: totals.totalInWordsError,
      });
    const seq = (this.counters.get(invoice.series) ?? 0) + 1;
    this.counters.set(invoice.series, seq);
    const number = invoice.number ?? String(seq).padStart(8, '0');
    const id = `mock-${invoice.series}-${number}`;
    const issued: IssuedInvoice = {
      id,
      taxAuthorityCode: `M1-${invoice.issueDate.replace(/-/g, '').slice(2)}-${id.slice(-6).toUpperCase()}`,
      number,
      series: invoice.series,
      status: 'issued',
      issuedAt: this.clock().toISOString(),
      invoice: { ...invoice, number },
      totals,
      lookupUrl: `https://example.invalid/lookup/${id}`,
      provider: this.name,
    };
    this.store.set(id, issued);
    return issued;
  }

  async getInvoice(id: string): Promise<IssuedInvoice | undefined> {
    return this.store.get(id);
  }

  async cancelInvoice(id: string, reason: string): Promise<IssuedInvoice> {
    const inv = this.store.get(id);
    if (!inv) throw new Error(`Invoice ${id} not found`);
    if (inv.status === 'cancelled') throw new Error(`Invoice ${id} is already cancelled`);
    if (!reason?.trim()) throw new Error('A cancellation reason is required (lý do hủy)');
    const cancelled: IssuedInvoice = {
      ...inv,
      status: 'cancelled',
      invoice: { ...inv.invoice, extra: { ...inv.invoice.extra, cancelReason: reason } },
    };
    this.store.set(id, cancelled);
    return cancelled;
  }

  async listInvoices(
    filter: { status?: InvoiceStatus; from?: string; to?: string } = {},
  ): Promise<IssuedInvoice[]> {
    return [...this.store.values()].filter(
      (i) =>
        (!filter.status || i.status === filter.status) &&
        (!filter.from || i.invoice.issueDate >= filter.from) &&
        (!filter.to || i.invoice.issueDate <= filter.to),
    );
  }
}
