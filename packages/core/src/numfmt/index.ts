import { fail, type Result } from '../shared/result.js';

export type TextResult = Result<{ text: string }>;
export type AmountResult = Result<{ value: number }>;

const NOT_FINITE = 'Value must be a finite number';
const NOT_FINITE_HINT = 'Pass a plain number such as 1234567.89';

function roundDecimal(abs: number, digits: number): string {
  const str = String(abs);
  if (/e/i.test(str)) return abs.toFixed(digits);
  const [int = '0', frac = ''] = str.split('.');
  if (frac.length <= digits) return abs.toFixed(digits);
  const kept = BigInt(int + frac.slice(0, digits)) + (frac.charCodeAt(digits) >= 53 ? 1n : 0n);
  const t = kept.toString().padStart(digits + 1, '0');
  return digits ? `${t.slice(0, -digits)}.${t.slice(-digits)}` : t;
}

/**
 * Vietnamese number: "." groups thousands, "," is the decimal mark (1.234.567,89).
 * `maxFractionDigits` must be an integer in 0-20 (default 2), otherwise INVALID_OPTION.
 * For |n| >= 1e21 the integer part is grouped exactly from the double's value via BigInt
 * (never exponent notation), so 1e25 gives 10.000.000.000.000.000.905.969.664.
 * Rounding is half away from zero on the shortest round-trip decimal representation of the
 * number (String(n)), so 2.675 gives 2,68 and 1.005 gives 1,01. Numbers whose String() uses
 * exponent notation (e.g. 1e-7) fall back to toFixed.
 */
export function formatNumber(n: number, opts: { maxFractionDigits?: number } = {}): TextResult {
  if (!Number.isFinite(n)) return fail('INVALID_NUMBER', NOT_FINITE, NOT_FINITE_HINT);
  const digits = opts.maxFractionDigits ?? 2;
  if (!Number.isInteger(digits) || digits < 0 || digits > 20) {
    return fail(
      'INVALID_OPTION',
      `maxFractionDigits must be an integer between 0 and 20, got ${digits}`,
      'Use an integer from 0 to 20',
    );
  }
  const abs = Math.abs(n);
  const fixed = abs >= 1e21 ? BigInt(abs).toString() : roundDecimal(abs, digits);
  const [int = '0', frac = ''] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+$)/g, '.');
  const fracTrim = frac.replace(/0+$/, '');
  const body = fracTrim ? `${grouped},${fracTrim}` : grouped;
  const isZero = !/[1-9]/.test(body);
  return { ok: true, text: n < 0 && !isZero ? `-${body}` : body };
}

/** "1.200.000 ₫" */
export function formatVnd(n: number): TextResult {
  const r = formatNumber(n);
  return r.ok ? { ok: true, text: `${r.text} ₫` } : r;
}

/** "1,2 triệu", "1,5 tỷ", "500 nghìn"; amounts below 1.000 stay plain. */
export function formatCompactVnd(n: number): TextResult {
  if (!Number.isFinite(n)) return fail('INVALID_NUMBER', NOT_FINITE, NOT_FINITE_HINT);
  const units: [number, string][] = [
    [1e9, ' tỷ'],
    [1e6, ' triệu'],
    [1e3, ' nghìn'],
  ];
  const abs = Math.abs(n);
  // Choose the unit after rounding so 999.999 becomes "1 triệu", not "1.000 nghìn".
  let [div, unit] = units.find(([d]) => abs >= d) ?? [1, ''];
  const rounded = Math.round((abs / div) * 100) / 100;
  if (div > 1 && rounded >= 1000) {
    const up = units[units.findIndex(([d]) => d === div) - 1];
    if (up) [div, unit] = up;
  }
  const r = formatNumber(n / div);
  return r.ok ? { ok: true, text: r.text + unit } : r;
}

/** yyyy-mm-dd or dd/mm/yyyy -> dd/MM/yyyy */
export function formatDate(input: string): TextResult {
  const raw = String(input ?? '');
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const vn = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  const m = iso
    ? { y: +iso[1]!, mo: +iso[2]!, d: +iso[3]! }
    : vn
      ? { y: +vn[3]!, mo: +vn[2]!, d: +vn[1]! }
      : null;
  if (!m) return fail('INVALID_DATE', `Unrecognised date "${raw}"`, 'Use yyyy-mm-dd or dd/mm/yyyy');
  const dt = new Date(0);
  dt.setUTCFullYear(m.y, m.mo - 1, m.d);
  if (dt.getUTCFullYear() !== m.y || dt.getUTCMonth() !== m.mo - 1 || dt.getUTCDate() !== m.d) {
    return fail('INVALID_DATE', `"${raw}" is not a real calendar date`);
  }
  const p = (x: number, w: number) => String(x).padStart(w, '0');
  return { ok: true, text: `${p(m.d, 2)}/${p(m.mo, 2)}/${p(m.y, 4)}` };
}

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  nghin: 1e3,
  ngan: 1e3,
  tr: 1e6,
  trieu: 1e6,
  m: 1e6,
  ty: 1e9,
  b: 1e9,
};

function plainNumber(s: string): number | null {
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let int = s;
  let frac = '';
  const grouped = (t: string, sep: string) => new RegExp(`^\\d{1,3}(\\${sep}\\d{3})*$`).test(t);
  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: the last one is the decimal mark, the other must group thousands.
    const dec = Math.max(lastDot, lastComma);
    const thousandSep = dec === lastComma ? '.' : ',';
    int = s.slice(0, dec);
    frac = s.slice(dec + 1);
    if (!grouped(int, thousandSep) || !/^\d+$/.test(frac)) return null;
    int = int.split(thousandSep).join('');
  } else if (lastComma >= 0) {
    // "," is always the decimal mark.
    if (lastComma !== s.indexOf(',')) return null;
    [int = '', frac = ''] = s.split(',');
    if (!/^\d+$/.test(int) || !/^\d+$/.test(frac)) return null;
  } else if (lastDot >= 0) {
    // "." is a thousands separator when every group has 3 digits ("1.500" = 1500), else invalid.
    if (!grouped(s, '.')) return null;
    int = s.split('.').join('');
  }
  return Number(frac ? `${int}.${frac}` : int);
}

/**
 * Parse a user-typed VND amount: "1tr2", "500k", "1,5 tỷ", "1.234.567,89", "250.000đ".
 * "." is a thousands separator ("1.500" = 1500) and "," is the decimal mark ("1,5" = 1.5).
 * After a unit, trailing digits are the fraction: "1tr2" = 1,2 triệu.
 */
export function parseAmount(input: string): AmountResult {
  const raw = String(input ?? '');
  if (raw.trim() === '') {
    return fail(
      'EMPTY',
      'Amount is empty',
      'Pass a non-empty amount, e.g. "1tr2", "500k" or "1.200.000"',
    );
  }
  const bad = (hint = 'Try "1tr2", "500k", "1.200.000"') =>
    fail<{ value: number }>('INVALID_AMOUNT', `Cannot parse amount "${raw}"`, hint);
  let s = raw
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/(₫|đồng|vnd|vnđ|đ)$/, '');
  s = s.replace(/đ/g, 'd');
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const m = /^([\d.,]+)([a-z]+)?(\d+)?$/.exec(s);
  if (!m) return bad();
  const base = plainNumber(m[1]!);
  if (base === null) {
    return m[1]!.includes('.')
      ? bad('"." groups thousands in Vietnamese (1.500 = 1500); use "," for decimals, e.g. "1,5"')
      : bad();
  }
  if (!m[2]) return m[3] ? bad() : { ok: true, value: base };
  const mult = MULTIPLIERS[m[2]];
  if (!mult) return bad();
  const value = m[3] ? Number(`${m[1]!.replace(/[.,]/g, '')}.${m[3]}`) : base;
  if (m[3] && /[.,]/.test(m[1]!)) return bad();
  return { ok: true, value: Number((value * mult).toFixed(2)) };
}
