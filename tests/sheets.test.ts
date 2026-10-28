import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import {
  addWorkingDays,
  convertAddress,
  isWorkingDay,
  lunarInfo,
  moneyToWords,
  numberToWords,
  validateTaxId,
} from '@vn-skills/core';

const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'packages', 'sheets', 'dist');

type Fn = (...args: unknown[]) => unknown;

// No require, no fetch, no process: only what Apps Script would provide.
function load(file: string): Record<string, Fn> {
  const sandbox: Record<string, unknown> = {};
  const ctx = vm.createContext(sandbox);
  vm.runInContext(readFileSync(resolve(DIST, file), 'utf8'), ctx, { filename: file });
  return ctx as unknown as Record<string, Fn>;
}

function toIso(v: unknown): string {
  return v instanceof Date
    ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
    : String(v);
}

describe('packages/sheets bundles', () => {
  let full: Record<string, Fn>;
  let lite: Record<string, Fn>;

  beforeAll(() => {
    execFileSync('pnpm', ['--filter', './packages/sheets', 'build'], { cwd: ROOT, stdio: 'pipe' });
    full = load('vn-skills.gs');
    lite = load('vn-skills-lite.gs');
  }, 120_000);

  it('build produces both bundles and appsscript.json', () => {
    expect(existsSync(resolve(DIST, 'vn-skills.gs'))).toBe(true);
    expect(existsSync(resolve(DIST, 'vn-skills-lite.gs'))).toBe(true);
    const manifest = JSON.parse(readFileSync(resolve(DIST, 'appsscript.json'), 'utf8'));
    expect(manifest.timeZone).toBe('Asia/Ho_Chi_Minh');
  });

  it('VN_TIEN_CHU: single value, thousand option, 2-D range', () => {
    const expected = moneyToWords(1500000);
    expect(expected.ok && full.VN_TIEN_CHU!(1500000)).toBe(expected.ok && expected.words);
    const k = moneyToWords(1500000, { thousand: 'ngàn' });
    expect(k.ok && full.VN_TIEN_CHU!(1500000, 'ngàn')).toBe(k.ok && k.words);
    const r = full.VN_TIEN_CHU!([[1500000], [2000]]) as string[][];
    expect(r).toHaveLength(2);
    expect(r[0]).toHaveLength(1);
    expect(r[0]![0]).toBe(expected.ok && expected.words);
  });

  it('VN_SO_THANH_CHU: single value and range', () => {
    const e = numberToWords(21);
    expect(full.VN_SO_THANH_CHU!(21)).toBe(e.ok && e.words);
    const r = full.VN_SO_THANH_CHU!([[21, 5]]) as string[][];
    expect(r).toHaveLength(1);
    expect(r[0]).toHaveLength(2);
    expect(r[0]![0]).toBe(e.ok && e.words);
  });

  it('VN_MST: TRUE/FALSE, range, bad cell does not throw', () => {
    expect(full.VN_MST!('0100233488')).toBe(validateTaxId('0100233488').ok);
    const r = full.VN_MST!([['0100233488'], ['abc']]) as unknown[][];
    expect(r[0]![0]).toBe(true);
    expect(r[1]![0]).not.toBe(true);
  });

  it('error cell is returned as text, not thrown', () => {
    const bad = validateTaxId('abc');
    expect(bad.ok).toBe(false);
    const out = full.VN_TIEN_CHU!([[1500000], ['not a number'], [2000]]) as unknown[][];
    expect(out).toHaveLength(3);
    expect(typeof out[1]![0]).toBe('string');
    const bad2 = moneyToWords('not a number');
    expect(bad2.ok).toBe(false);
    expect(out[1]![0]).toBe(!bad2.ok && bad2.error.message);
    expect(typeof out[0]![0]).toBe('string');
    expect(typeof out[2]![0]).toBe('string');
  });

  it('VN_AM_LICH: Date, string date and range', () => {
    const e = lunarInfo(28, 1, 2025);
    const text = e.ok ? e.text : undefined;
    expect(text).toBeTruthy();
    expect(full.VN_AM_LICH!(new Date(2025, 0, 28, 12))).toBe(text);
    expect(full.VN_AM_LICH!('28/01/2025')).toBe(text);
    const r = full.VN_AM_LICH!([['28/01/2025'], [new Date(2025, 0, 28, 12)]]) as string[][];
    expect(r).toEqual([[text], [text]]);
  });

  it('VN_NGAY_LAM_VIEC: Date, string and range', () => {
    const e = isWorkingDay(4, 1, 2025);
    const w = e.ok ? e.working : undefined;
    expect(typeof w).toBe('boolean');
    expect(full.VN_NGAY_LAM_VIEC!('04/01/2025')).toBe(w);
    expect(full.VN_NGAY_LAM_VIEC!(new Date(2025, 0, 4, 12))).toBe(w);
    expect(full.VN_NGAY_LAM_VIEC!([['04/01/2025', '06/01/2025']])).toEqual([
      [
        w,
        isWorkingDay(6, 1, 2025).ok && (isWorkingDay(6, 1, 2025) as { working: boolean }).working,
      ],
    ]);
  });

  it('VN_CONG_NGAY_LAM_VIEC: returns a date, accepts ranges', () => {
    const e = addWorkingDays(2, 1, 2025, 1);
    const iso = e.ok ? e.date : '';
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toIso(full.VN_CONG_NGAY_LAM_VIEC!('02/01/2025', 1))).toBe(iso);
    expect(toIso(full.VN_CONG_NGAY_LAM_VIEC!(new Date(2025, 0, 2, 12), 1))).toBe(iso);
    const r = full.VN_CONG_NGAY_LAM_VIEC!([['02/01/2025'], ['02/01/2025']], 1) as unknown[][];
    expect(r).toHaveLength(2);
    expect(toIso(r[1]![0])).toBe(iso);
  });

  it('VN_DIA_CHI_MOI: single value, range, error text', () => {
    const input = '1 Đinh Tiên Hoàng, Phường Đa Kao, Quận 1, TP Hồ Chí Minh';
    const e = convertAddress(input);
    const formatted = e.ok ? e.new.formatted : undefined;
    expect(formatted).toBeTruthy();
    expect(full.VN_DIA_CHI_MOI!(input)).toBe(formatted);
    const r = full.VN_DIA_CHI_MOI!([[input], ['???']]) as string[][];
    expect(r[0]![0]).toBe(formatted);
    expect(typeof r[1]![0]).toBe('string');
  });

  it('lite bundle has the other functions but not VN_DIA_CHI_MOI', () => {
    expect(lite.VN_DIA_CHI_MOI).toBeUndefined();
    for (const name of [
      'VN_TIEN_CHU',
      'VN_SO_THANH_CHU',
      'VN_MST',
      'VN_AM_LICH',
      'VN_NGAY_LAM_VIEC',
      'VN_CONG_NGAY_LAM_VIEC',
    ]) {
      expect(typeof lite[name]).toBe('function');
      expect(typeof full[name]).toBe('function');
    }
    expect(typeof full.VN_DIA_CHI_MOI).toBe('function');
    expect(lite.VN_MST!('0100233488')).toBe(true);
  });
});
