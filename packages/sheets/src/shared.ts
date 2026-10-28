import type { Result } from '../../core/src/shared/result.js';

declare const Utilities: { formatDate(d: Date, tz: string, fmt: string): string } | undefined;
declare const Session: { getScriptTimeZone(): string } | undefined;

/** Applies `fn` to a single value or to every cell of a 2-D range, keeping the shape. */
export function mapRange(input: unknown, fn: (cell: unknown) => unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((row: unknown) => (Array.isArray(row) ? row.map(fn) : fn(row)));
  }
  return fn(input);
}

/** The picked value on success, the error message text on failure (never throws). */
export function unwrap<T>(r: Result<T>, pick: (v: T) => unknown): unknown {
  return r.ok ? pick(r) : r.error.message;
}

/** Cell value as text; empty or non-scalar cells become an empty string. */
export function asText(v: unknown): string {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
}

export interface Ymd {
  d: number;
  m: number;
  y: number;
}

/** Accepts a Date (read in the script time zone) or a dd/mm/yyyy string; a string result is an error text. */
export function parseDate(v: unknown): Ymd | string {
  // Sheets passes a Date from another realm, so instanceof is unreliable.
  if (Object.prototype.toString.call(v) === '[object Date]') {
    const dt = v as Date;
    if (Number.isNaN(dt.getTime())) return 'Invalid date';
    if (typeof Utilities !== 'undefined' && typeof Session !== 'undefined') {
      const [y, m, d] = Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy-M-d')
        .split('-')
        .map(Number);
      return { d: d!, m: m!, y: y! };
    }
    return { d: dt.getDate(), m: dt.getMonth() + 1, y: dt.getFullYear() };
  }
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(asText(v));
  if (!m) return 'Invalid date: use a date cell or dd/mm/yyyy';
  return { d: Number(m[1]), m: Number(m[2]), y: Number(m[3]) };
}
