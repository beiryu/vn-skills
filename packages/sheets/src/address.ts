import { convertAddress } from '../../core/src/address/convert.js';
import { asText, mapRange, unwrap } from './shared.js';

/**
 * Chuyển địa chỉ cũ (3 cấp) sang địa chỉ mới (2 cấp, sau sáp nhập).
 * @param address Địa chỉ, một ô hoặc một vùng.
 * @customfunction
 */
export function VN_DIA_CHI_MOI(address: unknown): unknown {
  return mapRange(address, (c) => unwrap(convertAddress(asText(c)), (v) => v.new.formatted));
}
