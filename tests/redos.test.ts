import { describe, expect, it } from 'vitest';
import { buildVietQR, exampleInvoice, splitAddress, validateInvoice } from '@vn-skills/core';

// Inputs reach these functions from agents and MCP clients. Each regex must stay linear:
// a quadratic one turns a long run of spaces into seconds of CPU (CodeQL js/polynomial-redos).
const LONG = 100_000;
const fast = (f: () => unknown): number => {
  const start = performance.now();
  f();
  return performance.now() - start;
};

describe('regexes stay linear on hostile input', () => {
  it('splitAddress', () => {
    expect(splitAddress('12 Nguyễn Huệ, P. Bến Nghé ;Q.1 - TP.HCM')).toEqual([
      '12 Nguyễn Huệ',
      'P. Bến Nghé',
      'Q.1',
      'TP.HCM',
    ]);
    expect(splitAddress('Hà Nội-Việt Nam')).toEqual(['Hà Nội-Việt Nam']);
    expect(fast(() => splitAddress('a' + ' '.repeat(LONG) + 'b'))).toBeLessThan(200);
  });

  it('VietQR amount with a currency suffix', () => {
    const qr = (amount: string) => buildVietQR({ bank: 'VCB', account: '0011001234567', amount });
    const r = qr('1.500.000 đ');
    expect(r.ok && r.amount).toBe(1500000);
    expect(fast(() => qr('1' + ' '.repeat(LONG) + 'x'))).toBeLessThan(200);
  });

  it('e-invoice party email', () => {
    const withEmail = (email: string) => {
      const inv = exampleInvoice() as { seller: { email?: string } };
      inv.seller.email = email;
      return validateInvoice(inv).warnings.some((w) => w.path.endsWith('.email'));
    };
    expect(withEmail('ketoan@congty.vn')).toBe(false);
    expect(withEmail('a.b@mail.congty.com.vn')).toBe(false);
    expect(withEmail('ketoan@congty')).toBe(true);
    expect(withEmail('ketoan@congty..vn')).toBe(true);
    expect(fast(() => withEmail('!@!.' + '!.'.repeat(LONG)))).toBeLessThan(200);
  });
});
