import { tlvEncode } from '../shared/tlv.js';
import { removeDiacritics } from '../shared/diacritics.js';
import { fail, type Result } from '../shared/result.js';
import { crc16CcittFalse } from './crc16.js';
import { findBank, type Bank } from './banks.js';

export const VIETQR_GUID = 'A000000727';
export const SERVICE_ACCOUNT = 'QRIBFTTA';
export const SERVICE_CARD = 'QRIBFTTC';
/** NAPAS recommends keeping the transfer note short; many banking apps truncate beyond this. */
export const MAX_NOTE_LENGTH = 25;

export interface BuildVietQROptions {
  /** BIN (970436), bank code (VCB), short name (Vietcombank) or alias. */
  bank: string;
  /** Beneficiary account number (or card number when `service` is 'card'). */
  account: string;
  /** Amount in VND, integer. Omit for a static QR where the payer enters the amount. */
  amount?: number | string;
  /** Transfer note / purpose. Diacritics are stripped and the note is truncated to MAX_NOTE_LENGTH. */
  note?: string;
  /** Force dynamic (12) or static (11) point-of-initiation. Defaults to dynamic when amount or note present. */
  dynamic?: boolean;
  service?: 'account' | 'card';
  /** Keep diacritics/punctuation in note instead of sanitizing (not recommended). */
  rawNote?: boolean;
}

export interface BuildVietQRData {
  payload: string;
  bank: Bank;
  account: string;
  amount?: number;
  note?: string;
  dynamic: boolean;
  crc: string;
  warnings: string[];
}

export function sanitizeNote(note: string): string {
  return removeDiacritics(String(note ?? ''))
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Accepts "500000", "500.000", "500,000", "1.500.000 đ", "1,500,000 VND". Returns digits or null.
 * A single "." or "," followed by 1-2 digits is a decimal (rejected), not a thousands separator.
 */
export function parseAmountString(input: string): string | null {
  const s = input
    .trim()
    .replace(/(?:đồng|dong|vnđ|vnd|đ|d)$/i, '')
    .replace(/[\s_]/g, '');
  if (/^\d+$/.test(s)) return s;
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return s.replace(/[.,]/g, '');
  return null;
}

export function buildVietQR(opts: BuildVietQROptions): Result<BuildVietQRData> {
  const warnings: string[] = [];
  const bank = findBank(String(opts.bank ?? ''));
  if (!bank) {
    return fail(
      'BANK_NOT_FOUND',
      `Unknown bank "${opts.bank}"`,
      'Pass a 6-digit NAPAS BIN (e.g. 970436), a bank code (VCB) or a bank name. Use searchBanks() to list banks.',
    );
  }
  if (bank.vietqr === 'none')
    warnings.push(`${bank.shortName} is listed as not supporting VietQR transfers.`);
  if (bank.deprecated)
    warnings.push(`${bank.shortName} is marked deprecated/merged in the bank list.`);

  const trimmedAccount = String(opts.account ?? '').trim();
  const account = trimmedAccount.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9]{1,19}$/.test(account)) {
    return fail(
      'INVALID_ACCOUNT',
      `Account "${opts.account}" must be 1-19 letters/digits`,
      'Remove spaces and punctuation from the account number.',
    );
  }
  if (account !== trimmedAccount)
    warnings.push(
      `Spaces removed from account "${trimmedAccount}" -> "${account}"; check the account number.`,
    );

  let amount: number | undefined;
  if (opts.amount !== undefined && opts.amount !== null && String(opts.amount).trim() !== '') {
    const raw = parseAmountString(String(opts.amount));
    if (raw === null || !/^\d+$/.test(raw)) {
      return fail(
        'INVALID_AMOUNT',
        `Amount "${opts.amount}" must be a positive integer in VND`,
        'VND has no decimals; pass e.g. 500000.',
      );
    }
    amount = Number(raw);
    if (amount <= 0) return fail('INVALID_AMOUNT', 'Amount must be greater than 0');
    if (String(amount).length > 13)
      return fail('INVALID_AMOUNT', 'Amount exceeds 13 digits allowed by EMVCo');
  }

  let note: string | undefined;
  const rawNoteText = String(opts.note ?? '').trim();
  if (rawNoteText !== '') {
    note = opts.rawNote ? rawNoteText : sanitizeNote(rawNoteText);
    if (!opts.rawNote && note !== rawNoteText)
      warnings.push('Note was sanitized (diacritics/punctuation removed).');
    const noteChars = Array.from(note);
    if (noteChars.length > MAX_NOTE_LENGTH) {
      note = noteChars.slice(0, MAX_NOTE_LENGTH).join('').trim();
      warnings.push(`Note truncated to ${MAX_NOTE_LENGTH} characters.`);
    }
    if (note.length === 0) note = undefined;
  }

  const dynamic = opts.dynamic ?? (amount !== undefined || note !== undefined);
  const service = opts.service === 'card' ? SERVICE_CARD : SERVICE_ACCOUNT;

  const beneficiary = tlvEncode('00', bank.bin) + tlvEncode('01', account);
  const merchantInfo =
    tlvEncode('00', VIETQR_GUID) + tlvEncode('01', beneficiary) + tlvEncode('02', service);

  let payload =
    tlvEncode('00', '01') + tlvEncode('01', dynamic ? '12' : '11') + tlvEncode('38', merchantInfo);
  payload += tlvEncode('53', '704');
  if (amount !== undefined) payload += tlvEncode('54', String(amount));
  payload += tlvEncode('58', 'VN');
  if (note !== undefined) payload += tlvEncode('62', tlvEncode('08', note));
  payload += '6304';
  const crc = crc16CcittFalse(payload);
  payload += crc;

  return { ok: true, payload, bank, account, amount, note, dynamic, crc, warnings };
}
