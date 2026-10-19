/**
 * Minimal, provider-neutral e-invoice (hóa đơn điện tử) data model aligned with the
 * mandatory contents of Decree 123/2020/NĐ-CP, Art. 10 and Circular 78/2021/TT-BTC.
 * This is a validation/normalisation layer only; it does not sign or transmit invoices.
 */
import { validateTaxId } from '../taxid/index.js';

export type VatRate = 0 | 5 | 8 | 10 | 'KCT' | 'KKKNT';
/** KCT = không chịu thuế (exempt); KKKNT = không kê khai, không tính thuế (not declared). */
export const VAT_RATES: readonly VatRate[] = [0, 5, 8, 10, 'KCT', 'KKKNT'];

export interface Party {
  name: string;
  /** Mã số thuế; required for the seller, optional for retail buyers. */
  taxId?: string;
  address: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
  /** Buyer's personal ID / passport when no tax ID (retail). */
  idNumber?: string;
}

export interface InvoiceLine {
  /** Line order (1-based). Filled automatically when omitted. */
  no?: number;
  name: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  /** Line discount amount in VND (not percent). */
  discount?: number;
  vatRate: VatRate;
  /** Set true for notes/description lines that carry no amount. */
  isNote?: boolean;
}

export interface Invoice {
  /** Invoice form/series, e.g. "1C25TAA" (ký hiệu mẫu số + ký hiệu hóa đơn per TT78). */
  series: string;
  /** Invoice number (assigned by the provider/tax authority on issue). */
  number?: string;
  /** ISO date yyyy-mm-dd. */
  issueDate: string;
  currency?: 'VND';
  seller: Party;
  buyer: Party;
  lines: InvoiceLine[];
  /** Payment method text: "TM/CK", "Tiền mặt", "Chuyển khoản"... */
  paymentMethod?: string;
  note?: string;
  /** Provider-specific extra fields (passed through untouched). */
  extra?: Record<string, unknown>;
}

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface InvoiceValidation {
  ok: boolean;
  invoice?: Invoice;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validateParty(
  p: unknown,
  path: string,
  isSeller: boolean,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): Party | undefined {
  if (!isObj(p)) {
    errors.push({ path, message: 'must be an object', severity: 'error' });
    return undefined;
  }
  if (!isStr(p.name) || !p.name.trim())
    errors.push({ path: `${path}.name`, message: 'name is required', severity: 'error' });
  if (!isStr(p.address) || !p.address.trim()) {
    if (isSeller)
      errors.push({ path: `${path}.address`, message: 'address is required', severity: 'error' });
    else
      warnings.push({
        path: `${path}.address`,
        message: 'buyer address is empty',
        severity: 'warning',
      });
  }
  if (p.taxId !== undefined && p.taxId !== '') {
    if (!isStr(p.taxId))
      errors.push({ path: `${path}.taxId`, message: 'taxId must be a string', severity: 'error' });
    else {
      const t = validateTaxId(p.taxId);
      if (!t.ok)
        errors.push({
          path: `${path}.taxId`,
          message: `invalid tax ID: ${t.error.message}`,
          severity: 'error',
        });
      else if (t.warnings.length)
        warnings.push({ path: `${path}.taxId`, message: t.warnings[0]!, severity: 'warning' });
    }
  } else if (isSeller) {
    errors.push({ path: `${path}.taxId`, message: 'seller taxId is required', severity: 'error' });
  } else if (!p.idNumber) {
    warnings.push({
      path: `${path}.taxId`,
      message:
        'buyer has neither taxId nor idNumber (fine for retail "người mua không lấy hóa đơn")',
      severity: 'warning',
    });
  }
  if (
    p.email !== undefined &&
    isStr(p.email) &&
    p.email &&
    !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(p.email)
  ) {
    warnings.push({ path: `${path}.email`, message: 'email looks invalid', severity: 'warning' });
  }
  return p as unknown as Party;
}

/** Validate and normalise an invoice object. Does not throw. */
export function validateInvoice(input: unknown): InvoiceValidation {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!isObj(input))
    return {
      ok: false,
      errors: [{ path: '', message: 'invoice must be an object', severity: 'error' }],
      warnings,
    };

  if (!isStr(input.series) || !input.series.trim())
    errors.push({
      path: 'series',
      message: 'series (ký hiệu hóa đơn) is required',
      severity: 'error',
    });
  else if (!/^[0-9][A-Z][0-9]{2}[A-Z]{3}$/.test(input.series)) {
    warnings.push({
      path: 'series',
      message: 'series does not match the TT78 pattern (e.g. 1C25TAA)',
      severity: 'warning',
    });
  }
  if (input.number !== undefined && !isStr(input.number))
    errors.push({ path: 'number', message: 'number must be a string', severity: 'error' });
  if (
    !isStr(input.issueDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.issueDate) ||
    Number.isNaN(Date.parse(input.issueDate))
  ) {
    errors.push({ path: 'issueDate', message: 'issueDate must be yyyy-mm-dd', severity: 'error' });
  }
  if (input.currency !== undefined && input.currency !== 'VND') {
    errors.push({
      path: 'currency',
      message: 'only VND is supported in this version',
      severity: 'error',
    });
  }
  const seller = validateParty(input.seller, 'seller', true, errors, warnings);
  const buyer = validateParty(input.buyer, 'buyer', false, errors, warnings);

  const lines: InvoiceLine[] = [];
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    errors.push({ path: 'lines', message: 'at least one line is required', severity: 'error' });
  } else {
    input.lines.forEach((raw, i) => {
      const path = `lines[${i}]`;
      if (!isObj(raw))
        return errors.push({ path, message: 'must be an object', severity: 'error' });
      if (!isStr(raw.name) || !raw.name.trim())
        errors.push({ path: `${path}.name`, message: 'name is required', severity: 'error' });
      if (raw.isNote === true) {
        lines.push({
          no: i + 1,
          name: isStr(raw.name) ? raw.name : '',
          quantity: 0,
          unitPrice: 0,
          vatRate: 'KKKNT',
          isNote: true,
        });
        return;
      }
      if (!isNum(raw.quantity) || raw.quantity <= 0)
        errors.push({
          path: `${path}.quantity`,
          message: 'quantity must be > 0',
          severity: 'error',
        });
      if (!isNum(raw.unitPrice) || raw.unitPrice < 0)
        errors.push({
          path: `${path}.unitPrice`,
          message: 'unitPrice must be >= 0',
          severity: 'error',
        });
      if (raw.discount !== undefined && (!isNum(raw.discount) || raw.discount < 0))
        errors.push({
          path: `${path}.discount`,
          message: 'discount must be >= 0',
          severity: 'error',
        });
      if (!VAT_RATES.includes(raw.vatRate as VatRate)) {
        errors.push({
          path: `${path}.vatRate`,
          message: `vatRate must be one of ${VAT_RATES.join(', ')}`,
          severity: 'error',
        });
      }
      if (isNum(raw.unitPrice) && !Number.isInteger(raw.unitPrice)) {
        warnings.push({
          path: `${path}.unitPrice`,
          message: 'unitPrice has decimals; VND amounts are normally integers',
          severity: 'warning',
        });
      }
      lines.push({
        no: isNum(raw.no) ? raw.no : i + 1,
        name: isStr(raw.name) ? raw.name : '',
        unit: isStr(raw.unit) ? raw.unit : undefined,
        quantity: isNum(raw.quantity) ? raw.quantity : 0,
        unitPrice: isNum(raw.unitPrice) ? raw.unitPrice : 0,
        discount: isNum(raw.discount) ? raw.discount : undefined,
        vatRate: raw.vatRate as VatRate,
      });
    });
  }

  if (errors.length) return { ok: false, errors, warnings };
  const invoice: Invoice = {
    series: input.series as string,
    number: input.number as string | undefined,
    issueDate: input.issueDate as string,
    currency: 'VND',
    seller: seller!,
    buyer: buyer!,
    lines,
    paymentMethod: isStr(input.paymentMethod) ? input.paymentMethod : undefined,
    note: isStr(input.note) ? input.note : undefined,
    extra: isObj(input.extra) ? input.extra : undefined,
  };
  return { ok: true, invoice, errors, warnings };
}
