/**
 * CRC-16/CCITT-FALSE as required by EMVCo QR (poly 0x1021, init 0xFFFF, no reflection, no xorout).
 * Input is treated as UTF-8 bytes. Returns 4 uppercase hex digits.
 */
export function crc16CcittFalse(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
