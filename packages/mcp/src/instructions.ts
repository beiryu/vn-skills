export const SERVER_INSTRUCTIONS = `vn-skills: offline Vietnamese data tools. It builds and validates data only. It does not collect payments, confirm transfers or call bank, NAPAS or government systems.

Rules
- Amounts are integer VND, no decimals. Turn "500k", "1tr2", "1,5 tỷ" into an integer with vn_number_format (parse) before vietqr_build.
- Addresses use the 34-province, 2-level layout (province + ward) effective 01/07/2025. Use vn_address_convert for old 63-province/district addresses.
- A valid CCCD, tax ID (MST) or phone format does not prove the person, company or line exists. Never send IDs to third parties.

Which tool
- VietQR / "tạo mã QR chuyển khoản": vietqr_build, vietqr_parse, vietqr_banks
- Address / "đổi địa chỉ mới": vn_address_convert, vn_address_parse
- Tax ID / "kiểm tra mã số thuế": vn_tax_id_validate
- CCCD / "đọc căn cước": vn_id_parse
- Phone / "số điện thoại": vn_phone
- Holidays / "ngày nghỉ lễ", "ngày làm việc": vn_holidays_year, vn_holidays_is_working_day
- Money in words / "số tiền bằng chữ": vn_money_to_words
- Lunar / "âm lịch", "dương lịch": vn_lunar_from_solar, vn_lunar_to_solar
- E-invoice / "hóa đơn điện tử": vn_einvoice_validate, vn_einvoice_totals
- Names / "tên người Việt": vn_name
- Number formatting / "định dạng số tiền": vn_number_format`;
