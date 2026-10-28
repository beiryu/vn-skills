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

/** Maximum number of digits accepted by moneyToWords (output grows quadratically with length). */
export const MAX_MONEY_DIGITS = 1000;

const tooLong = (): Result<MoneyWords> =>
  fail(
    'INVALID_AMOUNT',
    `Amount has more than ${MAX_MONEY_DIGITS} digits`,
    `Amounts are limited to ${MAX_MONEY_DIGITS} digits.`,
  );

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
    if (cleaned.replace('-', '').length > MAX_MONEY_DIGITS) return tooLong();
    big = BigInt(cleaned);
  }

  if (typeof amount === 'bigint' && (big < 0n ? -big : big).toString().length > MAX_MONEY_DIGITS)
    return tooLong();

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

export interface ParsedWords {
  value: string;
  negative: boolean;
  unit: string | null;
  chan: boolean;
}

const UNIT_WORDS: Record<string, number> = {
  một: 1,
  mốt: 1,
  hai: 2,
  ba: 3,
  bốn: 4,
  tư: 4,
  năm: 5,
  lăm: 5,
  sáu: 6,
  bảy: 7,
  tám: 8,
  chín: 9,
};
const SCALE_BASE: Record<string, number> = { nghìn: 1, ngàn: 1, triệu: 2 };
const NUMBER_WORDS = new Set([
  'không',
  'mười',
  'mươi',
  'trăm',
  'lẻ',
  'linh',
  'tỷ',
  ...Object.keys(UNIT_WORDS),
  ...Object.keys(SCALE_BASE),
]);

class BadWord extends Error {}

/** Parse one 3-digit group (inverse of readGroup). Throws BadWord naming the offending word. */
function parseGroup(t: string[]): number {
  const digit = (w: string | undefined): number | undefined =>
    w === 'không'
      ? 0
      : w === undefined || w === 'mốt' || w === 'tư' || w === 'lăm'
        ? undefined
        : UNIT_WORDS[w];
  const bad = (i: number): never => {
    throw new BadWord(t[i] ?? t[t.length - 1]);
  };
  const unit = (i: number): number => UNIT_WORDS[t[i]!] ?? bad(i);
  let i = 0;
  let hundreds: number | null = null;
  if (t[1] === 'trăm') {
    hundreds = digit(t[0]) ?? bad(0);
    i = 2;
  }
  let value = (hundreds ?? 0) * 100;
  if (i === t.length) return hundreds ? value : bad(i - 1);
  if (hundreds !== null && (t[i] === 'lẻ' || t[i] === 'linh')) {
    if (i + 2 !== t.length) bad(i + 2);
    return value + unit(i + 1);
  }
  if (t[i] === 'mười') {
    value += 10;
    if (i + 1 === t.length) return value;
    if (i + 2 !== t.length) bad(i + 2);
    return value + unit(i + 1);
  }
  const d = digit(t[i]);
  if (d !== undefined && d >= 2 && t[i + 1] === 'mươi') {
    value += d * 10;
    if (i + 2 === t.length) return value;
    if (i + 3 !== t.length) bad(i + 3);
    return value + unit(i + 2);
  }
  if (hundreds === null && i + 1 === t.length) return unit(i);
  return bad(i);
}

/**
 * Parse Vietnamese number words back to digits, e.g. "một triệu hai trăm nghìn đồng" -> "1200000".
 * Inverse of moneyToWords; colloquial short forms ("trăm rưỡi") are rejected with INVALID_WORDS.
 */
export function wordsToNumber(text: string): Result<ParsedWords> {
  if (typeof text !== 'string') return fail('EMPTY', 'Text must be a non-empty string');
  const tokens = text
    .normalize('NFC')
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (tokens.length === 0) return fail('EMPTY', 'Text is empty');
  const invalid = (w: string, why = 'Unexpected word'): Result<ParsedWords> =>
    fail<ParsedWords>('INVALID_WORDS', `${why} "${w}"`, 'Use words as produced by moneyToWords.');

  let pos = 0;
  const negative = tokens[0] === 'âm';
  if (negative) pos = 1;
  let end = pos;
  while (end < tokens.length && NUMBER_WORDS.has(tokens[end]!)) end++;
  if (end === pos) return invalid(tokens[pos] ?? 'âm');
  const num = tokens.slice(pos, end);

  let total = 0n;
  try {
    if (num.length === 1 && num[0] === 'không') {
      // zero
    } else {
      let prev = Infinity;
      let i = 0;
      while (i < num.length) {
        const start = i;
        while (i < num.length && !(num[i]! in SCALE_BASE) && num[i] !== 'tỷ') i++;
        if (i === start) throw new BadWord(num[i]);
        const group = parseGroup(num.slice(start, i));
        let rem = 0;
        let k = 0;
        if (i < num.length && num[i]! in SCALE_BASE) rem = SCALE_BASE[num[i++]!]!;
        while (i < num.length && num[i] === 'tỷ') {
          k++;
          i++;
        }
        const index = 3 * k + rem;
        if (index >= prev || (index === 0 && i < num.length)) throw new BadWord(num[start]);
        prev = index;
        if (group > 0 && String(group).length + 3 * index > MAX_MONEY_DIGITS)
          return fail<ParsedWords>(
            'INVALID_AMOUNT',
            `Amount has more than ${MAX_MONEY_DIGITS} digits`,
            `Amounts are limited to ${MAX_MONEY_DIGITS} digits.`,
          );
        total += BigInt(group) * 1000n ** BigInt(index);
      }
    }
  } catch (e) {
    if (e instanceof BadWord) return invalid(e.message);
    throw e;
  }

  const rest = tokens.slice(end);
  const bad = rest.find((w, j) => j > 0 && NUMBER_WORDS.has(w));
  if (rest.length > 0 && (bad !== undefined || rest[0] === 'âm')) return invalid(rest[0]!);
  let chan = false;
  if (rest.length > 0 && rest[rest.length - 1] === 'chẵn') {
    chan = true;
    rest.pop();
  }
  const digits = total.toString();
  if (digits.length > MAX_MONEY_DIGITS)
    return fail<ParsedWords>(
      'INVALID_AMOUNT',
      `Amount has more than ${MAX_MONEY_DIGITS} digits`,
      `Amounts are limited to ${MAX_MONEY_DIGITS} digits.`,
    );
  return {
    ok: true,
    value: digits,
    negative,
    unit: rest.length > 0 ? rest.join(' ') : null,
    chan,
  };
}
