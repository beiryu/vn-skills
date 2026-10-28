import { fail, type Result } from '../shared/result.js';
import { VAT_RATES, type VatRate } from './schema.js';
import { roundVnd, vatPercent } from './totals.js';

function check(amount: unknown, rate: unknown): Result<Record<never, never>> | null {
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0)
    return fail(
      'INVALID_AMOUNT',
      `Amount must be a non-negative integer number of VND, got ${String(amount)}`,
      'Pass a whole number of đồng as a number, e.g. 1080000',
    );
  if (!VAT_RATES.includes(rate as VatRate))
    return fail(
      'INVALID_VAT_RATE',
      `Unknown VAT rate ${String(rate)}`,
      `Use one of: ${VAT_RATES.join(', ')}`,
    );
  return null;
}

/**
 * Splits a VAT-inclusive price into net and VAT. Never throws.
 * Library convention (not a legal rule): net is rounded half away from zero and the leftover đồng
 * goes to VAT (vat = gross - net), so net + vat === gross always.
 * Rates 0, KCT and KKKNT give net = gross and VAT = 0.
 */
export function splitVatInclusive(
  gross: number,
  vatRate: VatRate,
): Result<{ gross: number; net: number; vat: number; rate: VatRate }> {
  const bad = check(gross, vatRate);
  if (bad) return bad as Result<never>;
  const net = roundVnd((gross * 100) / (100 + vatPercent(vatRate)));
  return { ok: true, gross, net, vat: gross - net, rate: vatRate };
}

/** Adds VAT to a net amount using the same line formula as `computeTotals`. Never throws. */
export function applyVat(
  net: number,
  vatRate: VatRate,
): Result<{ net: number; vat: number; gross: number; rate: VatRate }> {
  const bad = check(net, vatRate);
  if (bad) return bad as Result<never>;
  const vat = roundVnd((net * vatPercent(vatRate)) / 100);
  return { ok: true, net, vat, gross: net + vat, rate: vatRate };
}
