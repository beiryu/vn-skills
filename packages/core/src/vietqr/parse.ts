import { tlvDecode, tlvFind, type TlvNode } from '../shared/tlv.js';
import { fail, type Result } from '../shared/result.js';
import { crc16CcittFalse } from './crc16.js';
import { findBank, type Bank } from './banks.js';
import { VIETQR_GUID } from './build.js';

export interface ParsedVietQR {
  payload: string;
  bin?: string;
  bank?: Bank;
  account?: string;
  service?: string;
  amount?: number;
  currency?: string;
  country?: string;
  note?: string;
  dynamic: boolean;
  crc: string;
  expectedCrc: string;
  crcValid: boolean;
  isVietQR: boolean;
  warnings: string[];
  /** Raw TLV tree for anything not mapped above. */
  fields: TlvNode[];
}

const TEMPLATE_TAGS = new Set(['38', '62', '64']);

export function parseVietQR(input: string): Result<ParsedVietQR> {
  const payload = String(input ?? '').trim();
  if (payload.length < 8) return fail('INVALID_PAYLOAD', 'Payload too short to be an EMVCo QR');
  const decoded = tlvDecode(payload, TEMPLATE_TAGS);
  if (!decoded.ok)
    return fail(
      'INVALID_TLV',
      decoded.error ?? 'Malformed TLV',
      'Check that the string was copied completely.',
    );
  const fields = decoded.nodes;
  const warnings: string[] = [];

  const crcNode = tlvFind(fields, '63');
  const crc = crcNode?.value ?? '';
  const crcIndex = payload.lastIndexOf('6304');
  const expectedCrc = crcIndex >= 0 ? crc16CcittFalse(payload.slice(0, crcIndex + 4)) : '';
  const crcValid = crc.length === 4 && crc.toUpperCase() === expectedCrc;
  if (!crcNode) warnings.push('Missing CRC (tag 63).');
  else if (!crcValid) warnings.push(`CRC mismatch: payload has ${crc}, expected ${expectedCrc}.`);
  if (fields[fields.length - 1]?.tag !== '63') warnings.push('CRC tag 63 is not the last field.');

  const fmt = tlvFind(fields, '00')?.value;
  if (fmt !== '01')
    warnings.push(`Unexpected payload format indicator "${fmt ?? ''}" (expected 01).`);
  const poi = tlvFind(fields, '01')?.value;
  const dynamic = poi === '12';

  const merchant = tlvFind(fields, '38');
  const guid = tlvFind(merchant?.children, '00')?.value;
  const isVietQR = guid === VIETQR_GUID;
  if (merchant && !isVietQR)
    warnings.push(`Tag 38 GUID is "${guid ?? ''}", not NAPAS ${VIETQR_GUID}.`);
  if (!merchant) warnings.push('Missing merchant account information (tag 38).');

  const beneficiaryRaw = tlvFind(merchant?.children, '01')?.value;
  let bin: string | undefined;
  let account: string | undefined;
  if (beneficiaryRaw !== undefined) {
    const b = tlvDecode(beneficiaryRaw);
    if (b.ok) {
      bin = tlvFind(b.nodes, '00')?.value;
      account = tlvFind(b.nodes, '01')?.value;
    } else warnings.push(`Malformed beneficiary template: ${b.error}`);
  }
  const service = tlvFind(merchant?.children, '02')?.value;
  const bank = bin ? findBank(bin) : undefined;
  if (bin && !bank) warnings.push(`BIN ${bin} not found in bank list.`);

  const amountRaw = tlvFind(fields, '54')?.value;
  const amount =
    amountRaw !== undefined && /^\d+(\.\d+)?$/.test(amountRaw) ? Number(amountRaw) : undefined;
  if (amountRaw !== undefined && amount === undefined)
    warnings.push(`Amount "${amountRaw}" is not numeric.`);
  const currency = tlvFind(fields, '53')?.value;
  if (currency && currency !== '704') warnings.push(`Currency ${currency} is not VND (704).`);
  const country = tlvFind(fields, '58')?.value;
  const note = tlvFind(tlvFind(fields, '62')?.children, '08')?.value;

  return {
    ok: true,
    payload,
    bin,
    bank,
    account,
    service,
    amount,
    currency,
    country,
    note,
    dynamic,
    crc,
    expectedCrc,
    crcValid,
    isVietQR,
    warnings,
    fields,
  };
}
