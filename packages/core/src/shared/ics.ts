/** RFC 5545 §3.3.11 TEXT escaping. */
export const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** UTF-8 octet length of one code point; core also runs where `Buffer` doesn't exist (Sheets, Workers). */
const utf8Len = (ch: string): number => {
  const cp = ch.codePointAt(0)!;
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
};

/** RFC 5545 §3.1: fold at 75 octets without splitting a UTF-8 sequence. */
export function fold(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = utf8Len(ch);
    if (bytes + n > 75) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out;
}

export const compact = (isoDate: string): string => isoDate.replace(/-/g, '');
export const nextDay = (isoDate: string): string => {
  const t = new Date(`${isoDate}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return compact(t.toISOString().slice(0, 10));
};
export const stamp = (d: Date): string =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
