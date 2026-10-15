import { jdFromDate } from './astro.js';

export const CAN = [
  'Giáp',
  'Ất',
  'Bính',
  'Đinh',
  'Mậu',
  'Kỷ',
  'Canh',
  'Tân',
  'Nhâm',
  'Quý',
] as const;
export const CHI = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
] as const;
export const CHI_ANIMALS_EN = [
  'Rat',
  'Ox',
  'Tiger',
  'Cat',
  'Dragon',
  'Snake',
  'Horse',
  'Goat',
  'Monkey',
  'Rooster',
  'Dog',
  'Pig',
] as const;

export const SOLAR_TERMS = [
  'Xuân phân',
  'Thanh minh',
  'Cốc vũ',
  'Lập hạ',
  'Tiểu mãn',
  'Mang chủng',
  'Hạ chí',
  'Tiểu thử',
  'Đại thử',
  'Lập thu',
  'Xử thử',
  'Bạch lộ',
  'Thu phân',
  'Hàn lộ',
  'Sương giáng',
  'Lập đông',
  'Tiểu tuyết',
  'Đại tuyết',
  'Đông chí',
  'Tiểu hàn',
  'Đại hàn',
  'Lập xuân',
  'Vũ thủy',
  'Kinh trập',
] as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Can Chi of a lunar year, e.g. 2024 -> "Giáp Thìn". */
export function yearCanChi(lunarYear: number): string {
  return `${CAN[mod(lunarYear + 6, 10)]} ${CHI[mod(lunarYear + 8, 12)]}`;
}

/** Can Chi of a lunar month. Leap months share the month's Can Chi (with "(nhuận)" appended). */
export function monthCanChi(lunarMonth: number, lunarYear: number, leap = false): string {
  const can = CAN[mod(lunarYear * 12 + lunarMonth + 3, 10)];
  const chi = CHI[mod(lunarMonth + 1, 12)];
  return `${can} ${chi}${leap ? ' (nhuận)' : ''}`;
}

/** Can Chi of a solar day (cycle of 60 anchored to JDN). */
export function dayCanChi(dd: number, mm: number, yy: number): string {
  const jd = jdFromDate(dd, mm, yy);
  return `${CAN[mod(jd + 9, 10)]} ${CHI[mod(jd + 1, 12)]}`;
}

/** Can Chi of the Tý hour (23:00-01:00) of a day; other hours follow in sequence. */
export function hourCanChi(dd: number, mm: number, yy: number, hour = 0): string {
  const jd = jdFromDate(dd, mm, yy);
  const dayCan = mod(jd + 9, 10);
  const hourIndex = Math.floor(((hour + 1) % 24) / 2); // 23-1 -> 0 (Tý), 1-3 -> 1 (Sửu) ...
  const can = CAN[mod(dayCan * 2 + hourIndex, 10)];
  return `${can} ${CHI[hourIndex]}`;
}

/** Vietnamese name of a lunar month (tháng Giêng, Hai, ..., Chạp). */
export function lunarMonthName(month: number): string {
  const names = [
    'Giêng',
    'Hai',
    'Ba',
    'Tư',
    'Năm',
    'Sáu',
    'Bảy',
    'Tám',
    'Chín',
    'Mười',
    'Một',
    'Chạp',
  ];
  return names[month - 1] ?? String(month);
}
