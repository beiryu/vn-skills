# Vietnamese administrative units after 01/07/2025

**Legal basis:** Resolution 202/2025/QH15 (provincial mergers) and the Standing Committee resolutions on commune-level
rearrangement (effective 01/07/2025), plus later adjustments (the bundled dataset notes the latest decree it reflects).

## Structure

| Level    | Before 01/07/2025                               | After                           |
| -------- | ----------------------------------------------- | ------------------------------- |
| Province | 63 (tỉnh, thành phố trực thuộc TW)              | **34**                          |
| District | 696 (quận, huyện, thị xã, thành phố thuộc tỉnh) | **abolished**                   |
| Commune  | 10,035 (phường, xã, thị trấn)                   | **3,321** (phường, xã, đặc khu) |

Address format: `<số nhà, đường/thôn/ấp>, <Phường/Xã/Đặc khu X>, <Tỉnh/Thành phố Y>`.

## The 34 provinces (new name ← merged units)

Hà Nội · Hồ Chí Minh (← Bình Dương, Bà Rịa–Vũng Tàu) · Hải Phòng (← Hải Dương) · Đà Nẵng (← Quảng Nam) · Cần Thơ (← Hậu Giang, Sóc Trăng) · Huế ·
Tuyên Quang (← Hà Giang) · Cao Bằng · Lai Châu · Điện Biên · Sơn La · Lạng Sơn · Quảng Ninh · Lào Cai (← Yên Bái) · Thái Nguyên (← Bắc Kạn) ·
Phú Thọ (← Vĩnh Phúc, Hòa Bình) · Bắc Ninh (← Bắc Giang) · Hưng Yên (← Thái Bình) · Ninh Bình (← Hà Nam, Nam Định) · Thanh Hóa · Nghệ An · Hà Tĩnh ·
Quảng Trị (← Quảng Bình) · Quảng Ngãi (← Kon Tum) · Gia Lai (← Bình Định) · Khánh Hòa (← Ninh Thuận) · Lâm Đồng (← Bình Thuận, Đắk Nông) ·
Đắk Lắk (← Phú Yên) · Đồng Nai (← Bình Phước) · Tây Ninh (← Long An) · Đồng Tháp (← Tiền Giang) · Vĩnh Long (← Bến Tre, Trà Vinh) ·
An Giang (← Kiên Giang) · Cà Mau (← Bạc Liêu).

(Bắc Ninh, Quảng Ninh and Đồng Nai later became centrally-run cities; the dataset carries the current type.)

## Matching rules used by the parser

1. Split on `,` `;` or `-`. Scan from the right: province → (district, legacy only) → ward. Remainder = street.
2. Each token is lower-cased, diacritics stripped, unit prefixes removed (`tp`, `tỉnh`, `q`, `quận`, `h`, `huyện`, `tx`, `tt`, `p`, `phường`, `x`, `xã`, `đặc khu`).
3. Match order: exact key → alias/keyword (hn, hcm, saigon, …) → Dice bigram similarity ≥ 0.82 (fuzzy, reported in `matches`).
4. Names that collide without diacritics get accented keys; the accented input decides.
5. No separators at all → longest-suffix match of province then ward on the compacted string (minimum 4 characters to avoid matching "Huế" inside "Nguyễn Huệ").

## Conversion rules

- Old ward code → list of new ward codes (`mapping-old-new.json`). Exactly one candidate is flagged default; `divided` means several.
- Old district-level units without wards (huyện đảo Hoàng Sa, Trường Sa, Côn Đảo, Bạch Long Vĩ, Cồn Cỏ) map to the new đặc khu.
- Old province → new province key (`provinces` map). If the ward cannot be matched, only the province is converted (`province-only`).
