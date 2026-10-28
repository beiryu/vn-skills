import { addWorkingDays, isWorkingDay } from '../../core/src/holidays/index.js';
import { lunarInfo } from '../../core/src/lunar/index.js';
import { moneyToWords, numberToWords } from '../../core/src/money/index.js';
import { validateTaxId } from '../../core/src/taxid/index.js';
import { asText, mapRange, parseDate, unwrap } from './shared.js';

/**
 * Đọc số tiền thành chữ (đồng).
 * @param amount Số tiền, một ô hoặc một vùng.
 * @param thousand Tuỳ chọn: "nghìn" (mặc định) hoặc "ngàn".
 * @customfunction
 */
export function VN_TIEN_CHU(amount: unknown, thousand?: unknown): unknown {
  const opts = asText(thousand) === 'ngàn' ? { thousand: 'ngàn' as const } : {};
  return mapRange(amount, (c) => unwrap(moneyToWords(c as number | string, opts), (v) => v.words));
}

/**
 * Đọc một số thành chữ.
 * @param number Số, một ô hoặc một vùng.
 * @customfunction
 */
export function VN_SO_THANH_CHU(number: unknown): unknown {
  return mapRange(number, (c) => unwrap(numberToWords(c as number | string), (v) => v.words));
}

/**
 * Kiểm tra mã số thuế: TRUE/FALSE.
 * @param taxId Mã số thuế, một ô hoặc một vùng.
 * @customfunction
 */
export function VN_MST(taxId: unknown): unknown {
  return mapRange(taxId, (c) => validateTaxId(asText(c)).ok);
}

/**
 * Ngày âm lịch dạng chữ.
 * @param date Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.
 * @customfunction
 */
export function VN_AM_LICH(date: unknown): unknown {
  return mapRange(date, (c) => {
    const p = parseDate(c);
    return typeof p === 'string' ? p : unwrap(lunarInfo(p.d, p.m, p.y), (v) => v.text);
  });
}

/**
 * TRUE nếu là ngày làm việc (không phải cuối tuần hoặc ngày nghỉ lễ).
 * @param date Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.
 * @customfunction
 */
export function VN_NGAY_LAM_VIEC(date: unknown): unknown {
  return mapRange(date, (c) => {
    const p = parseDate(c);
    return typeof p === 'string' ? p : unwrap(isWorkingDay(p.d, p.m, p.y), (v) => v.working);
  });
}

/**
 * Cộng n ngày làm việc vào một ngày.
 * @param date Ngày (ô ngày hoặc dd/mm/yyyy), một ô hoặc một vùng.
 * @param n Số ngày làm việc cần cộng (âm để trừ).
 * @customfunction
 */
export function VN_CONG_NGAY_LAM_VIEC(date: unknown, n: unknown): unknown {
  return mapRange(date, (c) => {
    const p = parseDate(c);
    if (typeof p === 'string') return p;
    return unwrap(addWorkingDays(p.d, p.m, p.y, Number(n)), (v) => v.date);
  });
}
