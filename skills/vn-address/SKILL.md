---
name: vn-address
description: Parse, normalise and convert Vietnamese addresses using the post-01/07/2025 administrative structure (34 provinces, 3,321 wards, no districts) with fuzzy matching for missing diacritics and abbreviations (TP.HCM, Q.1, P. Bến Nghé). Converts old addresses (63 tỉnh, quận/huyện) to the new 2-level structure via the official old→new ward mapping. Use for "địa chỉ mới sau sáp nhập", "chuyển đổi địa chỉ", "đổi địa chỉ cũ sang mới", "tỉnh nào sau sáp nhập", address validation, shipping/e-commerce forms, or when the user mentions phường/xã/tỉnh.
license: MIT
compatibility: Requires Node.js 22+ (runs npx -y @vn-skills/cli). Data is bundled; no network.
metadata:
  author: vn-skills
  version: '0.1.0'
---

# Vietnamese addresses (34 provinces, 2025+)

Since **01/07/2025** Vietnam has 34 provinces/cities and a two-level structure: `street, ward (phường/xã/đặc khu), province`.
Districts (quận/huyện/thị xã) no longer exist. Models trained before 2025 still produce 63 provinces and districts;
this skill fixes that with bundled data and an old→new mapping. See [references/address-rules.md](references/address-rules.md).

## When to use

- "Địa chỉ này giờ thuộc tỉnh nào / phường nào?" or "convert this address to the new format".
- Normalising user-typed addresses (no diacritics, abbreviations, missing commas) for forms, shipping, invoices.
- Listing provinces/wards, checking that a ward exists, getting postal codes.

## How to do it

Inside this repo use `pnpm vn-skills` instead of `npx -y @vn-skills/cli`. Output is JSON when piped.

1. **Convert an old address** (most common request):

   ```bash
   npx -y @vn-skills/cli address convert "12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM"
   ```

   ```json
   {
     "ok": true,
     "mappingType": "merged",
     "old": {
       "province": "Thành phố Hồ Chí Minh",
       "district": "Quận 1",
       "ward": "Phường Bến Nghé",
       "street": "12 Nguyễn Huệ"
     },
     "new": {
       "province": { "code": "79", "fullName": "Thành phố Hồ Chí Minh" },
       "ward": { "code": "26740", "fullName": "Phường Sài Gòn", "postalCode": "..." },
       "formatted": "12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh"
     },
     "candidates": [{ "fullName": "Phường Sài Gòn", "isDefault": true }],
     "confidence": 0.98,
     "warnings": []
   }
   ```

   `mappingType` is one of `unchanged`, `merged`, `divided`, `province-only`, `already-new`.
   When it is **`divided`**, the old ward was split: show all `candidates` and ask the user which one (street/house number decides). Never silently pick.

2. **Parse / normalise** a current address:

   ```bash
   npx -y @vn-skills/cli address parse "12 nguyen hue, phuong sai gon, hcm"
   ```

   Returns `province`, `ward`, `street`, `formatted`, `confidence`, `matches` (how each part matched: exact / alias / fuzzy / abbreviation).
   Add `--legacy` to parse with the pre-2025 catalogue (province/district/ward) or `--new` to force the current one.

3. **Look things up**: `address provinces`, `address province "Gia Lai"`, `address wards "Tân Thành" -p "Tây Ninh"`.

Library: `parseAddress`, `convertAddress`, `findProvince`, `searchWards`, `PROVINCES` from `@vn-skills/core`.

## Rules and gotchas

- Always write results as `street, ward, province` with full unit names (`Phường Sài Gòn, Thành phố Hồ Chí Minh`). Do not add a district.
- Confidence < 0.8 or any `warnings` → show the user what was matched and ask to confirm.
- Fuzzy matching is diacritics-insensitive, but some wards differ only by tone marks (Xã Văn Lang / Xã Văn Lăng). If the user typed diacritics, they are used to disambiguate; if not, mention the ambiguity.
- Legacy district names (e.g. "Quận 1") are **not** part of a new address; the tool warns when it sees one.
- Data provenance: see `packages/core/data/SOURCES.md` (MIT-licensed datasets derived from the National Statistics Office). Not an official government service.

## Common mistakes to avoid

- Guessing the new province from memory ("Bình Dương" and "Bà Rịa – Vũng Tàu" are now part of Thành phố Hồ Chí Minh; Bình Định is in Gia Lai; Thừa Thiên Huế is Thành phố Huế).
- Keeping the district when converting, or "converting" by just dropping it (ward names changed too).
- Assuming one old ward maps to one new ward; 471 old wards were split.
