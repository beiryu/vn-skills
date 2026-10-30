import {
  VN_AM_LICH,
  VN_CONG_NGAY_LAM_VIEC,
  VN_MST,
  VN_NGAY_LAM_VIEC,
  VN_SDT,
  VN_SO_THANH_CHU,
  VN_TACH_TEN,
  VN_TIEN_CHU,
} from '../../sheets/src/functions.js';
import { VN_CCCD, VN_DIA_CHI_MOI } from '../../sheets/src/address.js';
import { mapRange } from '../../sheets/src/shared.js';

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

/** Excel passes ranges as 2-D arrays, so a scalar option arrives as [[x]]. */
function scalar(v: unknown): unknown {
  return Array.isArray(v) && v.length === 1 && Array.isArray(v[0]) && v[0].length === 1
    ? (v[0] as unknown[])[0]
    : v;
}

/** Excel dates are serial days since 1899-12-30; turn them into dd/mm/yyyy text. */
function serialToText(cell: unknown): unknown {
  if (typeof cell !== 'number' || !Number.isFinite(cell)) return cell;
  const dt = new Date(EXCEL_EPOCH_MS + Math.floor(cell) * DAY_MS);
  const p = (n: number, w: number) => String(n).padStart(w, '0');
  return `${p(dt.getUTCDate(), 2)}/${p(dt.getUTCMonth() + 1, 2)}/${p(dt.getUTCFullYear(), 4)}`;
}

export const TIEN_CHU = (amount: unknown, thousand?: unknown): unknown =>
  VN_TIEN_CHU(amount, scalar(thousand));
export const SO_THANH_CHU = (number: unknown): unknown => VN_SO_THANH_CHU(number);
export const MST = (taxId: unknown): unknown => VN_MST(taxId);
export const AM_LICH = (date: unknown): unknown => VN_AM_LICH(mapRange(date, serialToText));
export const NGAY_LAM_VIEC = (date: unknown): unknown =>
  VN_NGAY_LAM_VIEC(mapRange(date, serialToText));
export const CONG_NGAY_LAM_VIEC = (date: unknown, n: unknown): unknown =>
  VN_CONG_NGAY_LAM_VIEC(mapRange(date, serialToText), scalar(n));
export const DIA_CHI_MOI = (address: unknown): unknown => VN_DIA_CHI_MOI(address);
export const SDT = (phone: unknown, format?: unknown): unknown => VN_SDT(phone, scalar(format));
export const TACH_TEN = (name: unknown, part: unknown): unknown => VN_TACH_TEN(name, scalar(part));
export const CCCD = (id: unknown, field?: unknown): unknown => VN_CCCD(id, scalar(field));
