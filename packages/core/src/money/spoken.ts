import { fail, type Result } from '../shared/result.js';
import { parsePhone } from '../phone/index.js';
import { parseAmount } from '../numfmt/index.js';
import { parseDateInput } from '../lunar/index.js';
import { moneyToWords, numberToWords } from './index.js';

export interface Change {
  start: number;
  end: number;
  original: string;
  spoken: string;
  kind: 'phone' | 'money' | 'percent' | 'date' | 'number';
}

export interface Skipped {
  start: number;
  end: number;
  original: string;
  reason: string;
}

const PHONE = /\+?\d+(?:[ .-]\d+)*/y;
const DATE = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d/])/y;
const PARTIAL_DATE = /\d{1,4}\/\d{1,4}(?![\d/])/y;
const MONEY =
  /(\d+(?:\.\d{3})*(?:\s?(?:k|nghìn|ngàn|tr|triệu|tỷ|m|b)\d*)?)\s?(?:đồng|₫|vnđ|vnd|đ)(?![\p{L}\d])/iuy;
const PERCENT = /(\d+)%/y;
const NUMBER = /\d+(?:\.\d{3})*(?![\d]|[.,]\d)/y;
const DECIMAL = /\d+(?:[.,]\d+)+/y;
const RUN = /\d[\d.,/]*/y;

function sticky(re: RegExp, text: string, at: number): RegExpExecArray | null {
  re.lastIndex = at;
  return re.exec(text);
}

const words = (r: { ok: true; words: string } | { ok: false }): string | null =>
  r.ok ? r.words : null;

/**
 * Rewrite numbers, money, percentages, phone numbers and dd/mm/yyyy dates in text as spoken
 * Vietnamese for TTS. Everything else is kept byte-for-byte; ambiguous tokens go to `skipped`.
 */
export function toSpokenText(
  text: string,
  _opts: { phone?: 'digits' } = {},
): Result<{ text: string; changes: Change[]; skipped: Skipped[] }> {
  if (typeof text !== 'string' || text.trim() === '') {
    return fail('EMPTY', 'Text is empty', 'Pass a non-empty string to rewrite for TTS.');
  }
  const changes: Change[] = [];
  const skipped: Skipped[] = [];
  let out = '';
  let pos = 0;
  const digitRe = /\d/g;

  const take = (start: number, end: number, spoken: string, kind: Change['kind']) => {
    out += text.slice(pos, start) + spoken;
    pos = end;
    changes.push({ start, end, original: text.slice(start, end), spoken, kind });
  };
  const skip = (start: number, end: number, reason: string) =>
    skipped.push({ start, end, original: text.slice(start, end), reason });

  let i = 0;
  while (i < text.length) {
    digitRe.lastIndex = i;
    const d = digitRe.exec(text);
    if (!d) break;
    i = d.index;
    // A "+" or "-" right before the digits belongs to the token; "-" only when it is a sign.
    const prev = text[i - 1];
    const signed = prev === '-' && (i < 2 || /[\s([]/.test(text[i - 2]!));
    const plus = prev === '+';

    let m = sticky(PHONE, text, plus ? i - 1 : i);
    if (m && parsePhone(m[0]).ok) {
      const spoken = [...m[0].replace(/\D/g, '')].map((c) => words(numberToWords(c))).join(' ');
      take(m.index, m.index + m[0].length, spoken, 'phone');
      i = pos;
      continue;
    }

    m = sticky(DATE, text, i);
    if (m) {
      const end = i + m[0].length;
      const r = parseDateInput(m[0]);
      if (r.ok) {
        const spoken = `ngày ${words(numberToWords(r.day))} tháng ${words(numberToWords(r.month))} năm ${words(numberToWords(r.year))}`;
        take(i, end, spoken, 'date');
      } else {
        skip(i, end, 'invalid date');
      }
      i = end;
      continue;
    }
    m = sticky(PARTIAL_DATE, text, i);
    if (m) {
      skip(i, i + m[0].length, 'ambiguous partial date (date or fraction)');
      i += m[0].length;
      continue;
    }

    m = sticky(MONEY, text, i);
    if (m) {
      const a = parseAmount(m[1]!);
      const w = a.ok ? words(moneyToWords(a.value)) : null;
      if (w) {
        take(i, i + m[0].length, w, 'money');
        i = pos;
        continue;
      }
    }

    m = sticky(PERCENT, text, i);
    if (m) {
      take(i, i + m[0].length, `${words(numberToWords(m[1]!))} phần trăm`, 'percent');
      i = pos;
      continue;
    }

    m = sticky(NUMBER, text, i);
    if (m) {
      const w = words(numberToWords((signed ? '-' : '') + m[0].replace(/\./g, '')));
      if (w) {
        take(signed ? i - 1 : i, i + m[0].length, w, 'number');
        i = pos;
        continue;
      }
    }

    m = sticky(DECIMAL, text, i);
    if (m) {
      skip(i, i + m[0].length, 'decimal');
      i += m[0].length;
      continue;
    }

    const run = sticky(RUN, text, i);
    i += run ? run[0].length : 1;
  }

  out += text.slice(pos);
  return { ok: true, text: out, changes, skipped };
}
