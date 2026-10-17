import { removeDiacritics, normalizeText } from '../shared/diacritics.js';
import { fail, type Result } from '../shared/result.js';

const COMPOUND_FAMILY = ['ton that', 'nguyen phuc'];

export interface SplitName {
  full: string;
  family: string;
  middle: string;
  given: string;
}

function words(input: string): string[] {
  return input.normalize('NFC').trim().split(/\s+/).filter(Boolean);
}

/** Split a Vietnamese full name into họ / tên đệm / tên. Single words become the given name. */
export function splitName(input: string): Result<SplitName> {
  const parts = words(input);
  if (parts.length === 0) {
    return fail('EMPTY_NAME', 'Name is empty', 'Pass a non-empty full name');
  }
  const full = parts.join(' ');
  if (parts.length === 1) return { ok: true, full, family: '', middle: '', given: parts[0]! };
  let familyLen = 1;
  const pair = removeDiacritics(parts.slice(0, 2).join(' ')).toLowerCase();
  if (parts.length >= 3 && COMPOUND_FAMILY.includes(pair)) familyLen = 2;
  return {
    ok: true,
    full,
    family: parts.slice(0, familyLen).join(' '),
    middle: parts.slice(familyLen, -1).join(' '),
    given: parts[parts.length - 1]!,
  };
}

/** Unaccented, lowercase, hyphen-separated slug. */
export function slugifyName(input: string): string {
  return normalizeText(input).replace(/ /g, '-');
}

/** First letter of each word, uppercased, tone mark removed (Á -> A, Ấ -> Â). `ascii` also strips diacritics. */
export function initials(input: string, opts: { ascii?: boolean } = {}): string {
  return words(input)
    .map((w) => {
      const c = stripTones(Array.from(w.normalize('NFC'))[0]!.toLocaleUpperCase('vi'));
      return opts.ascii ? removeDiacritics(c) : c;
    })
    .join('');
}

const TONES = /[̣̀́̃̉]/g;

function stripTones(ch: string): string {
  return ch.normalize('NFD').replace(TONES, '').normalize('NFC');
}

const ALPHABET = 'aăâbcdđeêghiklmnoôơpqrstuưvxy';

function letterKey(s: string): number[] {
  const out: number[] = [];
  for (const ch of s.normalize('NFC').toLowerCase()) {
    // strip tone marks but keep the ă â ê ô ơ ư letters
    const base = stripTones(ch);
    const i = ALPHABET.indexOf(base);
    out.push(i >= 0 ? i : ALPHABET.length + base.charCodeAt(0));
  }
  return out;
}

function cmp(a: string, b: string): number {
  const ka = letterKey(a);
  const kb = letterKey(b);
  for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
    if (ka[i] !== kb[i]) return ka[i]! - kb[i]!;
  }
  if (ka.length !== kb.length) return ka.length - kb.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Sort full names the Vietnamese way: by tên, then tên đệm, then họ. Returns a new array. */
export function sortNames(names: readonly string[]): string[] {
  const keyed = names.map((n) => {
    const r = splitName(n);
    return { n, f: r.ok ? r.family : '', m: r.ok ? r.middle : '', g: r.ok ? r.given : n };
  });
  keyed.sort((a, b) => cmp(a.g, b.g) || cmp(a.m, b.m) || cmp(a.f, b.f));
  return keyed.map((k) => k.n);
}
