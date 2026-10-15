import type { Invoice } from './schema.js';
import type { InvoiceTotals } from './totals.js';

export type InvoiceStatus = 'draft' | 'issued' | 'cancelled' | 'replaced';

export interface IssuedInvoice {
  /** Provider-side identifier. */
  id: string;
  /** Tax-authority code (mã của cơ quan thuế) when applicable. */
  taxAuthorityCode?: string;
  number: string;
  series: string;
  status: InvoiceStatus;
  issuedAt: string;
  invoice: Invoice;
  totals: InvoiceTotals;
  /** URL to look up the invoice on the provider portal, if any. */
  lookupUrl?: string;
  provider: string;
}

export interface ProviderCapabilities {
  create: boolean;
  get: boolean;
  cancel: boolean;
  list: boolean;
  /** True for the in-memory mock; real adapters are sandbox-only in this version. */
  mock: boolean;
}

export interface EInvoiceProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  createInvoice(invoice: Invoice): Promise<IssuedInvoice>;
  getInvoice(id: string): Promise<IssuedInvoice | undefined>;
  cancelInvoice(id: string, reason: string): Promise<IssuedInvoice>;
  listInvoices?(filter?: {
    status?: InvoiceStatus;
    from?: string;
    to?: string;
  }): Promise<IssuedInvoice[]>;
}

export class NotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(
      `${provider}.${method} is not implemented: this version ships schema + mock adapter only. Real provider calls are out of scope (sandbox-only policy).`,
    );
    this.name = 'NotImplementedError';
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
