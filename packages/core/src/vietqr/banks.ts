import banksData from '../../data/banks.json' with { type: 'json' };
import { compactKey } from '../shared/diacritics.js';

export interface Bank {
  /** 6-digit NAPAS BIN, e.g. 970436 */
  bin: string;
  /** Short code, e.g. VCB */
  code: string;
  shortName: string;
  name: string;
  swift?: string;
  /** VietQR support level reported by the upstream list. */
  vietqr?: 'transfer' | 'receive' | 'none';
  keywords?: string[];
  deprecated?: boolean;
}

export const BANKS: readonly Bank[] = banksData as Bank[];

const byBin = new Map(BANKS.map((b) => [b.bin, b]));
const byCode = new Map(BANKS.map((b) => [b.code.toLowerCase(), b]));

/** Common aliases people type that are not the official code/short name. */
const ALIASES: Record<string, string> = {
  vietcombank: '970436',
  vcb: '970436',
  techcombank: '970407',
  tcb: '970407',
  mbbank: '970422',
  mb: '970422',
  mbb: '970422',
  vietinbank: '970415',
  ctg: '970415',
  bidv: '970418',
  bid: '970418',
  agribank: '970405',
  agri: '970405',
  vpbank: '970432',
  vpb: '970432',
  acb: '970416',
  tpbank: '970423',
  tpb: '970423',
  sacombank: '970403',
  stb: '970403',
  vib: '970441',
  shb: '970443',
  hdbank: '970437',
  hdb: '970437',
  ocb: '970448',
  msb: '970426',
  eximbank: '970431',
  eib: '970431',
  seabank: '970440',
  lpbank: '970449',
  lpb: '970449',
  lienvietpostbank: '970449',
  namabank: '970428',
  abbank: '970425',
  bacabank: '970409',
  pvcombank: '970412',
  vietabank: '970427',
  scb: '970429',
  cake: '546034',
  ubank: '546035',
  timo: '963388',
  vietbank: '970433',
  kienlongbank: '970452',
  vccb: '970454',
  bvbank: '970454',
  banviet: '970454',
  dongabank: '970406',
  baovietbank: '970438',
  pgbank: '970430',
  ncb: '970419',
  shinhan: '970424',
  woori: '970457',
  hsbc: '458761',
  standardchartered: '970410',
  publicbank: '970439',
  uob: '970458',
  cimb: '422589',
  hongleong: '970442',
  ibk: '970455',
  vrb: '970421',
  gpbank: '970408',
  oceanbank: '970414',
  mbv: '970414',
  cbbank: '970444',
  saigonbank: '970400',
  coopbank: '970446',
};

/**
 * Find a bank by BIN, code, short name, full name or common alias.
 * Diacritics and case are ignored. Returns undefined when nothing matches.
 */
export function findBank(query: string): Bank | undefined {
  const q = String(query ?? '').trim();
  if (!q) return undefined;
  if (/^\d{6}$/.test(q)) return byBin.get(q);
  const key = compactKey(q);
  if (!key) return undefined;
  const alias = ALIASES[key];
  if (alias) return byBin.get(alias);
  const code = byCode.get(q.toLowerCase());
  if (code) return code;
  for (const b of BANKS) {
    if (compactKey(b.shortName) === key) return b;
    if (b.keywords?.some((k) => compactKey(k) === key)) return b;
  }
  const sub = BANKS.filter(
    (b) => compactKey(b.shortName).includes(key) || compactKey(b.name).includes(key),
  );
  return sub.find((b) => !b.deprecated) ?? sub[0];
}

/** Search banks; returns ranked matches (exact first). Empty query returns all banks. */
export function searchBanks(query = ''): Bank[] {
  const key = compactKey(query);
  if (!key) return [...BANKS];
  const exact = findBank(query);
  const rest = BANKS.filter(
    (b) =>
      b !== exact &&
      (b.bin.includes(key) ||
        compactKey(b.code).includes(key) ||
        compactKey(b.shortName).includes(key) ||
        compactKey(b.name).includes(key) ||
        b.keywords?.some((k) => compactKey(k).includes(key))),
  );
  return exact ? [exact, ...rest] : rest;
}
