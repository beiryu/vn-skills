import { fail, type Result } from '../shared/result.js';

export interface MoneyToWordsOptions {
  /** "nghìn" (northern, default) or "ngàn" (southern). */
  thousand?: 'nghìn' | 'ngàn';
  /** Word for the tens gap in e.g. 105 -> "một trăm lẻ năm" / "một trăm linh năm". Default "lẻ". */
  odd?: 'lẻ' | 'linh';
  /** Unit appended at the end. Default "đồng"; pass '' for a bare number. */
  unit?: string;
  /** Use "tư" for 4 in 24, 34, ... (common in invoices). Default true. */
  useTu?: boolean;
  /** Capitalize first letter. Default false. */
  capitalize?: boolean;
  /** Append "chẵn" when the amount is a round thousand (e.g. "một triệu đồng chẵn"). Default false. */
  chan?: boolean;
}

export interface MoneyWords {
  words: string;
  amount: string;
  negative: boolean;
}

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** Read a 3-digit group (0-999). `full` forces reading leading zeros ("không trăm ..."). */
function readGroup(n: number, full: boolean, opts: Required<MoneyToWordsOptions>): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const units = n % 10;
  const parts: string[] = [];

  if (hundreds > 0 || full) {
    parts.push(`${DIGITS[hundreds]} trăm`);
  }
  if (tens === 0) {
    if (units > 0) {
      if (hundreds > 0 || full) parts.push(opts.odd);
      parts.push(DIGITS[units]!);
    }
  } else if (tens === 1) {
    parts.push('mười');
    if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(DIGITS[units]!);
  } else {
    parts.push(`${DIGITS[tens]} mươi`);
    if (units === 1) parts.push('mốt');
    else if (units === 4 && opts.useTu) parts.push('tư');
    else if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(DIGITS[units]!);
  }
  return parts.join(' ');
}

/** Scale words for group index i (0 = units, 1 = thousands, 2 = millions, 3 = billions, then repeats with "tỷ"). */
function scaleWord(i: number, thousand: string): string {
  const base = ['', thousand, 'triệu', 'tỷ'];
  if (i < 4) return base[i]!;
  const tyCount = Math.floor(i / 3);
  const rem = i % 3;
  return [base[rem], ...Array<string>(tyCount).fill('tỷ')].filter(Boolean).join(' ');
}

/**
 * Convert an integer VND amount to Vietnamese words, e.g. 1200000 -> "một triệu hai trăm nghìn đồng".
 * Accepts number, bigint, or a numeric string (digits with optional thousands separators). Non-integers are rejected.
 */
export function moneyToWords(
  amount: number | bigint | string,
  options: MoneyToWordsOptions = {},
): Result<MoneyWords> {
  const opts: Required<MoneyToWordsOptions> = {
    thousand: options.thousand ?? 'nghìn',
    odd: options.odd ?? 'lẻ',
    unit: options.unit ?? 'đồng',
    useTu: options.useTu ?? true,
    capitalize: options.capitalize ?? false,
    chan: options.chan ?? false,
  };

  let big: bigint;
  if (typeof amount === 'bigint') big = amount;
  else if (typeof amount === 'number') {
    if (!Number.isFinite(amount)) return fail('INVALID_AMOUNT', 'Amount must be finite');
    if (!Number.isInteger(amount))
      return fail(
        'INVALID_AMOUNT',
        `Amount ${amount} is not an integer`,
        'VND has no fractional unit; round first.',
      );
    if (Math.abs(amount) > Number.MAX_SAFE_INTEGER)
      return fail(
        'INVALID_AMOUNT',
        'Number exceeds safe integer range',
        'Pass a bigint or a numeric string for very large amounts.',
      );
    big = BigInt(amount);
  } else {
    const s = String(amount).trim().replace(/[\s_]/g, '');
    let cleaned: string;
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s))
      cleaned = s.replace(/\./g, ''); // 1.200.000 (vi separators)
    else if (/^-?\d{1,3}(,\d{3})+$/.test(s))
      cleaned = s.replace(/,/g, ''); // 1,200,000
    else cleaned = s;
    if (!/^-?\d+$/.test(cleaned)) {
      return fail(
        'INVALID_AMOUNT',
        `"${amount}" is not an integer amount`,
        'Use digits only, e.g. 1200000 or 1.200.000.',
      );
    }
    big = BigInt(cleaned);
  }

  const negative = big < 0n;
  if (negative) big = -big;

  let words: string;
  if (big === 0n) {
    words = DIGITS[0]!;
  } else {
    const groups: number[] = [];
    let n = big;
    while (n > 0n) {
      groups.push(Number(n % 1000n));
      n /= 1000n;
    }
    const parts: string[] = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i]!;
      if (g === 0) continue;
      const isLeading = i === groups.length - 1;
      const text = readGroup(g, !isLeading, opts);
      const scale = scaleWord(i, opts.thousand);
      parts.push(scale ? `${text} ${scale}` : text);
    }
    words = parts.join(' ');
  }

  if (opts.unit) words += ` ${opts.unit}`;
  if (opts.chan && big !== 0n && big % 1000n === 0n) words += ' chẵn';
  if (negative) words = `âm ${words}`;
  if (opts.capitalize) words = words.charAt(0).toUpperCase() + words.slice(1);

  return { ok: true, words, amount: (negative ? '-' : '') + big.toString(), negative };
}

/** Read a plain integer (no currency unit). */
export function numberToWords(
  n: number | bigint | string,
  options: Omit<MoneyToWordsOptions, 'unit' | 'chan'> = {},
): Result<MoneyWords> {
  return moneyToWords(n, { ...options, unit: '', chan: false });
}
