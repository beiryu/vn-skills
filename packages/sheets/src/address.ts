import { convertAddress } from '../../core/src/address/convert.js';
import { parseCitizenId } from '../../core/src/id/index.js';
import { asText, mapRange, unwrap } from './shared.js';

/**
 * Chuyển địa chỉ cũ (3 cấp) sang địa chỉ mới (2 cấp, sau sáp nhập).
 * @param address Địa chỉ, một ô hoặc một vùng.
 * @customfunction
 */
export function VN_DIA_CHI_MOI(address: unknown): unknown {
  return mapRange(address, (c) => unwrap(convertAddress(asText(c)), (v) => v.new.formatted));
}

const CCCD_FIELDS = ['hop_le', 'tinh', 'tinh_moi', 'gioi_tinh', 'nam_sinh'];

/**
 * Kiểm tra và đọc thông tin từ số CCCD (12 số) hoặc CMND (9 số).
 * @param id Số CCCD/CMND, một ô hoặc một vùng.
 * @param field Tuỳ chọn: "hop_le" (mặc định, TRUE/FALSE), "tinh", "tinh_moi", "gioi_tinh" hoặc "nam_sinh".
 * @customfunction
 */
export function VN_CCCD(id: unknown, field?: unknown): unknown {
  const f = asText(field) || 'hop_le';
  if (!CCCD_FIELDS.includes(f))
    return `Invalid field: use ${CCCD_FIELDS.map((x) => `"${x}"`).join(', ')}`;
  return mapRange(id, (c) => {
    const r = parseCitizenId(asText(c));
    if (f === 'hop_le') return r.ok;
    return unwrap(r, (v) => {
      if (v.kind !== 'cccd') return '';
      if (f === 'tinh') return v.province?.fullName ?? '';
      if (f === 'tinh_moi') return v.newProvince?.fullName ?? '';
      if (f === 'gioi_tinh') return v.sex === 'male' ? 'Nam' : 'Nữ';
      return v.birthYear;
    });
  });
}
