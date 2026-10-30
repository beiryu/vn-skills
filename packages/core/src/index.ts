export * from './vietqr/index.js';
export * from './taxid/index.js';
export * from './money/index.js';
export * from './numfmt/index.js';
export * from './lunar/index.js';
export * from './address/index.js';
export * from './einvoice/index.js';
export * from './id/index.js';
export * from './name/index.js';
export * from './phone/index.js';
export * from './holidays/index.js';
export { removeDiacritics, normalizeText, compactKey } from './shared/diacritics.js';
export { tlvEncode, tlvDecode, type TlvNode } from './shared/tlv.js';
export type { Result, VnError } from './shared/result.js';
export const VERSION = '0.8.0'; // x-release-please-version
