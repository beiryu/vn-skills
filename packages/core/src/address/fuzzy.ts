import { compactKey, removeDiacritics } from '../shared/diacritics.js';

/** Unit-type prefixes that may precede a name in free text. Order matters (longer first). */
const PREFIXES: Array<[RegExp, string]> = [
  [/^(thanh pho|tp|t\.p|tpho)\b\.?\s*/i, 'thanhpho'],
  [/^(tinh|t)\b\.?\s*/i, 'tinh'],
  [/^(quan|q)\b\.?\s*/i, 'quan'],
  [/^(huyen|h)\b\.?\s*/i, 'huyen'],
  [/^(thi xa|tx|t\.x)\b\.?\s*/i, 'thixa'],
  [/^(thi tran|tt|t\.t)\b\.?\s*/i, 'thitran'],
  [/^(phuong|p|ph)\b\.?\s*/i, 'phuong'],
  [/^(xa|x)\b\.?\s*/i, 'xa'],
  [/^(dac khu|dk)\b\.?\s*/i, 'dackhu'],
];

export interface Token {
  /** original text segment */
  raw: string;
  /** ascii lowercase with spaces */
  norm: string;
  /** compact key without unit prefix */
  key: string;
  /** compact key including the unit prefix when one was written */
  keyWithPrefix?: string;
  /** detected unit prefix (compact) */
  prefix?: string;
  /** accented compact key (for disambiguating names that differ only by diacritics) */
  accented: string;
}

/** Common abbreviations users type for provinces/cities. Keys are compact. */
export const ABBREVIATIONS: Record<string, string> = {
  hcm: 'thanhphohochiminh',
  tphcm: 'thanhphohochiminh',
  hochiminh: 'thanhphohochiminh',
  saigon: 'thanhphohochiminh',
  sg: 'thanhphohochiminh',
  sgn: 'thanhphohochiminh',
  hn: 'thanhphohanoi',
  hanoi: 'thanhphohanoi',
  dn: 'thanhphodanang',
  danang: 'thanhphodanang',
  hp: 'thanhphohaiphong',
  haiphong: 'thanhphohaiphong',
  ct: 'thanhphocantho',
  cantho: 'thanhphocantho',
  hue: 'thanhphohue',
  tthue: 'thanhphohue',
  thuathienhue: 'thanhphohue',
};

export function normalizeSegment(raw: string): string {
  return removeDiacritics(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(raw: string): Token {
  const norm = normalizeSegment(raw);
  let prefix: string | undefined;
  let rest = norm;
  for (const [re, p] of PREFIXES) {
    const m = re.exec(rest);
    if (m && m[0].length < rest.length) {
      prefix = p;
      rest = rest.slice(m[0].length).trim();
      break;
    }
  }
  const key = rest.replace(/\s+/g, '');
  return {
    raw: raw.trim(),
    norm,
    key,
    keyWithPrefix: prefix ? prefix + key : undefined,
    prefix,
    accented: raw.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''),
  };
}

/** Split an address on commas / semicolons / " - " and drop empty parts. */
export function splitAddress(text: string): string[] {
  // Split first, trim after: a pattern with \s* on both sides of the separator is quadratic on long runs of spaces.
  return text
    .split(/[;,|]|\s-\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** Sørensen–Dice similarity on character bigrams of compact keys (0..1). */
export function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

export interface Candidate<T> {
  item: T;
  score: number;
  /** 'exact' = key equality, 'alias' = alias/keyword equality, 'fuzzy' = similarity */
  via: 'exact' | 'alias' | 'fuzzy';
}

export interface Keyed {
  key: string;
  keys: string[];
  fullName: string;
  type?: string;
}

/**
 * Match a token against a list of keyed units.
 * Exact matches on `key` (with or without prefix) or on `keys` win; otherwise the best Dice score above `threshold`.
 */
export function matchUnit<T extends Keyed>(
  token: Token,
  units: readonly T[],
  threshold = 0.8,
): Candidate<T>[] {
  const exact: Candidate<T>[] = [];
  const alias: Candidate<T>[] = [];
  const fuzzy: Candidate<T>[] = [];
  const kp = token.keyWithPrefix;
  const k = token.key;
  if (!k) return [];
  for (const u of units) {
    const uKey = u.key;
    const uBare = u.keys[0] ?? uKey;
    if ((kp && kp === uKey) || (!kp && k === uKey)) {
      exact.push({ item: u, score: 1, via: 'exact' });
      continue;
    }
    if (k === uBare || u.keys.includes(k) || (kp && u.keys.includes(kp))) {
      alias.push({ item: u, score: 0.98, via: 'alias' });
      continue;
    }
    // prefix mismatch but same bare name: "xã" written where unit is "phường" etc.
    if (kp && k === uBare) {
      alias.push({ item: u, score: 0.95, via: 'alias' });
      continue;
    }
    const s = Math.max(dice(k, uBare), kp ? dice(kp, uKey) : 0);
    if (s >= threshold) fuzzy.push({ item: u, score: s, via: 'fuzzy' });
  }
  // disambiguate exact ties (names differing only by diacritics) using the accented key
  const pickAccented = (list: Candidate<T>[]) => {
    if (list.length <= 1 || !token.accented) return list;
    const hit = list.filter(
      (c) =>
        c.item.keys.includes(token.accented) ||
        c.item.fullName.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === token.accented,
    );
    return hit.length ? hit : list;
  };
  if (exact.length) return pickAccented(exact);
  if (alias.length) return pickAccented(alias);
  return fuzzy.sort((a, b) => b.score - a.score).slice(0, 5);
}

/** Resolve a province abbreviation (hcm, hn...) to a compact province key. */
export function expandAbbreviation(token: Token): string | undefined {
  return (
    ABBREVIATIONS[token.key] ??
    (token.keyWithPrefix ? ABBREVIATIONS[token.keyWithPrefix] : undefined)
  );
}

export { compactKey };
