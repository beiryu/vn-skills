import { lunarToSolar } from './convert.js';

export interface Holiday {
  name: string;
  nameEn: string;
  /** 'solar' = fixed Gregorian date; 'lunar' = fixed lunar date. */
  calendar: 'solar' | 'lunar';
  day: number;
  month: number;
  year: number;
  /** Lunar day/month for lunar holidays. */
  lunar?: { day: number; month: number };
  /** Official public holiday (ngày nghỉ lễ theo Bộ luật Lao động). */
  publicHoliday: boolean;
  /** ISO date yyyy-mm-dd */
  date: string;
}

const iso = (d: number, m: number, y: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const SOLAR_HOLIDAYS: Array<{
  day: number;
  month: number;
  name: string;
  nameEn: string;
  publicHoliday: boolean;
}> = [
  { day: 1, month: 1, name: 'Tết Dương lịch', nameEn: "New Year's Day", publicHoliday: true },
  { day: 14, month: 2, name: 'Lễ tình nhân', nameEn: "Valentine's Day", publicHoliday: false },
  {
    day: 27,
    month: 2,
    name: 'Ngày Thầy thuốc Việt Nam',
    nameEn: "Vietnamese Doctors' Day",
    publicHoliday: false,
  },
  {
    day: 8,
    month: 3,
    name: 'Quốc tế Phụ nữ',
    nameEn: "International Women's Day",
    publicHoliday: false,
  },
  {
    day: 26,
    month: 3,
    name: 'Ngày thành lập Đoàn TNCS HCM',
    nameEn: 'Youth Union Day',
    publicHoliday: false,
  },
  {
    day: 30,
    month: 4,
    name: 'Ngày Giải phóng miền Nam',
    nameEn: 'Reunification Day',
    publicHoliday: true,
  },
  {
    day: 1,
    month: 5,
    name: 'Quốc tế Lao động',
    nameEn: 'International Labour Day',
    publicHoliday: true,
  },
  {
    day: 19,
    month: 5,
    name: 'Ngày sinh Chủ tịch Hồ Chí Minh',
    nameEn: "Ho Chi Minh's Birthday",
    publicHoliday: false,
  },
  {
    day: 1,
    month: 6,
    name: 'Quốc tế Thiếu nhi',
    nameEn: "International Children's Day",
    publicHoliday: false,
  },
  {
    day: 28,
    month: 6,
    name: 'Ngày Gia đình Việt Nam',
    nameEn: 'Vietnamese Family Day',
    publicHoliday: false,
  },
  {
    day: 27,
    month: 7,
    name: 'Ngày Thương binh Liệt sĩ',
    nameEn: 'War Invalids and Martyrs Day',
    publicHoliday: false,
  },
  {
    day: 19,
    month: 8,
    name: 'Ngày Cách mạng tháng Tám',
    nameEn: 'August Revolution Day',
    publicHoliday: false,
  },
  { day: 2, month: 9, name: 'Quốc khánh', nameEn: 'National Day', publicHoliday: true },
  {
    day: 10,
    month: 10,
    name: 'Ngày Giải phóng Thủ đô',
    nameEn: 'Capital Liberation Day',
    publicHoliday: false,
  },
  {
    day: 13,
    month: 10,
    name: 'Ngày Doanh nhân Việt Nam',
    nameEn: 'Vietnamese Entrepreneurs Day',
    publicHoliday: false,
  },
  {
    day: 20,
    month: 10,
    name: 'Ngày Phụ nữ Việt Nam',
    nameEn: "Vietnamese Women's Day",
    publicHoliday: false,
  },
  {
    day: 20,
    month: 11,
    name: 'Ngày Nhà giáo Việt Nam',
    nameEn: "Vietnamese Teachers' Day",
    publicHoliday: false,
  },
  {
    day: 22,
    month: 12,
    name: 'Ngày thành lập QĐND Việt Nam',
    nameEn: "People's Army Day",
    publicHoliday: false,
  },
  { day: 24, month: 12, name: 'Lễ Giáng sinh', nameEn: 'Christmas Eve', publicHoliday: false },
];

const LUNAR_HOLIDAYS: Array<{
  day: number;
  month: number;
  name: string;
  nameEn: string;
  publicHoliday: boolean;
}> = [
  {
    day: 1,
    month: 1,
    name: 'Tết Nguyên Đán (mùng 1)',
    nameEn: 'Lunar New Year (Tết)',
    publicHoliday: true,
  },
  { day: 2, month: 1, name: 'Tết Nguyên Đán (mùng 2)', nameEn: 'Tết, day 2', publicHoliday: true },
  { day: 3, month: 1, name: 'Tết Nguyên Đán (mùng 3)', nameEn: 'Tết, day 3', publicHoliday: true },
  {
    day: 15,
    month: 1,
    name: 'Rằm tháng Giêng (Tết Nguyên Tiêu)',
    nameEn: 'Lantern Festival',
    publicHoliday: false,
  },
  { day: 3, month: 3, name: 'Tết Hàn Thực', nameEn: 'Cold Food Festival', publicHoliday: false },
  {
    day: 10,
    month: 3,
    name: 'Giỗ Tổ Hùng Vương',
    nameEn: 'Hung Kings Commemoration',
    publicHoliday: true,
  },
  { day: 15, month: 4, name: 'Lễ Phật Đản', nameEn: "Buddha's Birthday", publicHoliday: false },
  { day: 5, month: 5, name: 'Tết Đoan Ngọ', nameEn: 'Duanwu Festival', publicHoliday: false },
  {
    day: 15,
    month: 7,
    name: 'Lễ Vu Lan (Rằm tháng Bảy)',
    nameEn: 'Vu Lan / Ghost Festival',
    publicHoliday: false,
  },
  { day: 15, month: 8, name: 'Tết Trung Thu', nameEn: 'Mid-Autumn Festival', publicHoliday: false },
  {
    day: 23,
    month: 12,
    name: 'Ông Táo chầu trời',
    nameEn: 'Kitchen Guardians Day',
    publicHoliday: false,
  },
];

/**
 * Holidays that fall in the given solar year. Lunar holidays are resolved to their solar dates.
 * Tết Nguyên Đán's eve (30 or 29 Tết) is also included.
 */
export function holidays(year: number, options: { publicOnly?: boolean } = {}): Holiday[] {
  const out: Holiday[] = [];
  for (const h of SOLAR_HOLIDAYS) {
    out.push({ ...h, calendar: 'solar', year, date: iso(h.day, h.month, year) });
  }
  // Lunar holidays may fall in this solar year from lunar year `year` (months 1-11) or `year-1` (month 12).
  for (const ly of [year - 1, year]) {
    for (const h of LUNAR_HOLIDAYS) {
      const s = lunarToSolar(h.day, h.month, ly, false);
      if (!s.ok || s.year !== year) continue;
      out.push({
        name: h.name,
        nameEn: h.nameEn,
        calendar: 'lunar',
        day: s.day,
        month: s.month,
        year: s.year,
        lunar: { day: h.day, month: h.month },
        publicHoliday: h.publicHoliday,
        date: iso(s.day, s.month, s.year),
      });
    }
    // Giao thừa: last day of lunar month 12 of year ly
    const tet = lunarToSolar(1, 1, ly + 1, false);
    if (tet.ok && tet.year === year) {
      const eveJd = tet.jd - 1;
      const d30 = lunarToSolar(30, 12, ly, false);
      const eveLunarDay = d30.ok ? 30 : 29;
      const eve = lunarToSolar(eveLunarDay, 12, ly, false);
      if (eve.ok && eve.jd === eveJd) {
        out.push({
          name: 'Giao thừa (Tất niên)',
          nameEn: "Lunar New Year's Eve",
          calendar: 'lunar',
          day: eve.day,
          month: eve.month,
          year: eve.year,
          lunar: { day: eveLunarDay, month: 12 },
          publicHoliday: true,
          date: iso(eve.day, eve.month, eve.year),
        });
      }
    }
  }
  const filtered = options.publicOnly ? out.filter((h) => h.publicHoliday) : out;
  return filtered.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
