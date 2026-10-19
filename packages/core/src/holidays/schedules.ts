/**
 * What the Government decided for each year, for cán bộ, công chức, viên chức (Monday-Friday schedule).
 * Hand-curated from the official notices cited in `sources`; never add a year without one.
 *
 * Only the choices the law leaves to the yearly notice are recorded (Labour Code 2019, Art. 112(3)):
 * the 5 days of Tết Âm lịch, the day next to 2 September, and swaps (hoán đổi). Fixed-date holidays and
 * compensatory days (nghỉ bù, Art. 111(3)) are computed, and the result matches each notice.
 */
export interface ScheduleSource {
  /** Document number, e.g. "9441/TB-BNV". */
  id: string;
  /** Issue date, yyyy-mm-dd. */
  date: string;
  /** What it decides. */
  covers: string;
  url: string;
}

export interface AnnouncedSchedule {
  sources: ScheduleSource[];
  /** The 5 statutory Tết days, yyyy-mm-dd (weekend days included; they are compensated). */
  tet?: readonly [string, string, string, string, string];
  /** The second National Day day, adjacent to 2 September. */
  nationalDay?: string;
  /** A weekday given off in exchange for a Saturday worked. */
  swaps?: Array<{ off: string; workOn: string }>;
}

export type HolidayKey =
  'newYear' | 'tet' | 'hungKings' | 'reunification' | 'labourDay' | 'nationalDay' | 'cultureDay';

export const ANNOUNCED: Readonly<Record<number, AnnouncedSchedule>> = {
  2023: {
    sources: [
      {
        id: '5034/TB-LĐTBXH',
        date: '2022-12-07',
        covers: 'Tết Âm lịch and Quốc khánh 2023',
        url: 'https://luatvietnam.vn/lao-dong/thong-bao-5034-tb-ldtbxh-237267-d6.html',
      },
    ],
    tet: ['2023-01-20', '2023-01-21', '2023-01-22', '2023-01-23', '2023-01-24'],
    nationalDay: '2023-09-01',
  },
  2024: {
    sources: [
      {
        id: '5015/TB-LĐTBXH',
        date: '2023-11-22',
        covers: 'Tết Âm lịch and Quốc khánh 2024',
        url: 'https://luatvietnam.vn/lao-dong/thong-bao-5015-tb-ldtbxh-2023-ve-nghi-tet-am-lich-va-nghi-le-quoc-khanh-nam-2024-278160-d6.html',
      },
      {
        id: '1570/TB-LĐTBXH',
        date: '2024-04-12',
        covers: 'swap for 30/4 and 1/5 2024',
        url: 'https://baoquocte.vn/thong-bao-hoan-doi-ngay-lam-viec-dip-nghi-le-304-va-15-nam-2024-267772.html',
      },
    ],
    tet: ['2024-02-08', '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12'],
    nationalDay: '2024-09-03',
    swaps: [{ off: '2024-04-29', workOn: '2024-05-04' }],
  },
  2025: {
    sources: [
      {
        id: '6150/TB-BLĐTBXH',
        date: '2024-12-03',
        covers: 'Tết Âm lịch, 30/4-1/5 and Quốc khánh 2025',
        url: 'https://thoibaotaichinhvietnam.vn/chinh-thuc-thong-bao-lich-nghi-tet-nguyen-dan-at-ty-va-nghi-le-nam-2025-165479.html',
      },
    ],
    tet: ['2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31'],
    nationalDay: '2025-09-01',
    swaps: [{ off: '2025-05-02', workOn: '2025-04-26' }],
  },
  2026: {
    sources: [
      {
        id: '9441/TB-BNV',
        date: '2025-10-16',
        covers: 'Tết Âm lịch and Quốc khánh 2026',
        url: 'https://vov.vn/xa-hoi/chinh-thuc-lich-nghi-tet-nguyen-dan-va-quoc-khanh-nam-2026-post1238570.vov',
      },
      {
        id: '12729/VPCP-KGVX',
        date: '2025-12-25',
        covers: 'swap for Tết Dương lịch 2026',
        url: 'https://lsvn.vn/chot-phuong-an-nghi-tet-duong-lich-2026-lien-tuc-4-ngay-a167589.html',
      },
      {
        id: '10065/VPCP-KGVX',
        date: '2026-10-02',
        covers: 'Ngày Văn hóa Việt Nam 24/11/2026',
        url: 'https://baovanhoa.vn/van-hoa/ngay-van-hoa-viet-nam-nam-2026-chinh-thuc-duoc-nghi-mot-ngay-270980.html',
      },
    ],
    tet: ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20'],
    nationalDay: '2026-09-01',
    swaps: [
      { off: '2026-01-02', workOn: '2026-01-10' },
      { off: '2026-08-31', workOn: '2026-08-22' },
    ],
  },
  2027: {
    sources: [
      {
        id: '11483/TB-BNV',
        date: '2026-10-09',
        covers: 'Tết Âm lịch and Quốc khánh 2027',
        url: 'https://cafef.vn/bo-noi-vu-thong-bao-chi-tiet-lich-nghi-tet-am-lich-quoc-khanh-2027-188261010120450778.chn',
      },
    ],
    tet: ['2027-02-04', '2027-02-05', '2027-02-06', '2027-02-07', '2027-02-08'],
    nationalDay: '2027-09-03',
  },
};
