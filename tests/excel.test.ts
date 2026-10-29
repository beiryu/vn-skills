import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import {
  addWorkingDays,
  convertAddress,
  isWorkingDay,
  lunarInfo,
  moneyToWords,
  numberToWords,
  parseCitizenId,
  parsePhone,
  splitName,
  validateTaxId,
} from '@vn-skills/core';

const ROOT = resolve(__dirname, '..');
const PKG = resolve(ROOT, 'packages', 'excel');
const DIST = resolve(PKG, 'dist');

type Fn = (...args: unknown[]) => unknown;

// Only what Excel provides: the CustomFunctions global. No require, fetch or process.
function load(file: string): Record<string, Fn> {
  const registered: Record<string, Fn> = {};
  const sandbox: Record<string, unknown> = {
    CustomFunctions: { associate: (id: string, fn: Fn) => (registered[id] = fn) },
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(readFileSync(resolve(DIST, file), 'utf8'), ctx, { filename: file });
  return registered;
}

// Excel serial days since 1899-12-30.
function serial(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

function toIso(v: unknown): string {
  if (typeof v === 'number') {
    const dt = new Date(Date.UTC(1899, 11, 30) + v * 86_400_000);
    return dt.toISOString().slice(0, 10);
  }
  const o = v as { getFullYear?: () => number; getMonth: () => number; getDate: () => number };
  if (o && typeof o === 'object' && typeof o.getFullYear === 'function') {
    return `${o.getFullYear()}-${String(o.getMonth() + 1).padStart(2, '0')}-${String(o.getDate()).padStart(2, '0')}`;
  }
  return String(v);
}

describe('packages/excel add-in', () => {
  let fns: Record<string, Fn>;
  let meta: {
    functions: { id: string; name: string; description?: string; parameters: { name: string }[] }[];
  };

  beforeAll(() => {
    execFileSync('pnpm', ['--filter', './packages/excel', 'build'], { cwd: ROOT, stdio: 'pipe' });
    fns = load('functions.js');
    meta = JSON.parse(readFileSync(resolve(DIST, 'functions.json'), 'utf8'));
  }, 180_000);

  it('is a private package and build writes the four files', () => {
    const pkg = JSON.parse(readFileSync(resolve(PKG, 'package.json'), 'utf8'));
    expect(pkg.private).toBe(true);
    for (const f of ['functions.js', 'functions.json', 'functions.html', 'manifest.xml']) {
      expect(existsSync(resolve(DIST, f))).toBe(true);
    }
    expect(readFileSync(resolve(DIST, 'manifest.xml'), 'utf8')).toContain('https://localhost:3000');
  });

  it('functions.json lists exactly the registered functions, with Vietnamese metadata', () => {
    const ids = meta.functions.map((f) => f.id).sort();
    expect(ids).toEqual(Object.keys(fns).sort());
    for (const required of [
      'TIEN_CHU',
      'SO_THANH_CHU',
      'MST',
      'AM_LICH',
      'NGAY_LAM_VIEC',
      'CONG_NGAY_LAM_VIEC',
    ]) {
      expect(ids).toContain(required);
    }
    for (const f of meta.functions) {
      expect(f.description?.length).toBeGreaterThan(0);
      expect(f.parameters.length).toBeGreaterThan(0);
      for (const p of f.parameters) expect(p.name).toMatch(/\S/);
    }
    expect(readFileSync(resolve(DIST, 'manifest.xml'), 'utf8')).toContain('VN');
  });

  it('wrappers are imported from packages/sheets, not copied', () => {
    const src = resolve(PKG, 'src');
    const text = readdirSync(src)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(resolve(src, f), 'utf8'))
      .join('\n');
    expect(text).toMatch(/from ['"][^'"]*sheets[^'"]*['"]/);
    expect(text).not.toMatch(/moneyToWords\(|validateTaxId\(|lunarInfo\(/);
  });

  it('TIEN_CHU: single value, thousand option, 2-D range', () => {
    const e = moneyToWords(1500000);
    const k = moneyToWords(1500000, { thousand: 'ngàn' });
    expect(fns.TIEN_CHU!(1500000)).toBe(e.ok && e.words);
    expect(fns.TIEN_CHU!(1500000, 'ngàn')).toBe(k.ok && k.words);
    expect(fns.TIEN_CHU!([[1500000], [2000]])).toEqual([
      [e.ok && e.words],
      [(moneyToWords(2000) as { words: string }).words],
    ]);
  });

  it('TIEN_CHU: thousand passed as a 1x1 range is honoured', () => {
    const k = moneyToWords(1500000, { thousand: 'ngàn' });
    expect(k.ok).toBe(true);
    expect(fns.TIEN_CHU!(1500000, [['ngàn']])).toBe(k.ok && k.words);
    expect(fns.TIEN_CHU!([[1500000], [1500000]], [['ngàn']])).toEqual([
      [k.ok && k.words],
      [k.ok && k.words],
    ]);
  });

  it('SO_THANH_CHU: single value and range', () => {
    const e = numberToWords(21);
    expect(fns.SO_THANH_CHU!(21)).toBe(e.ok && e.words);
    const r = fns.SO_THANH_CHU!([[21, 5]]) as string[][];
    expect(r).toHaveLength(1);
    expect(r[0]).toHaveLength(2);
    expect(r[0]![0]).toBe(e.ok && e.words);
  });

  it('MST: TRUE/FALSE, range, bad cell does not throw', () => {
    expect(fns.MST!('0100233488')).toBe(validateTaxId('0100233488').ok);
    const r = fns.MST!([['0100233488'], ['abc']]) as unknown[][];
    expect(r[0]![0]).toBe(true);
    expect(r[1]![0]).not.toBe(true);
  });

  it('bad cell returns the error text in a range', () => {
    const bad = moneyToWords('not a number');
    expect(bad.ok).toBe(false);
    const out = fns.TIEN_CHU!([[1500000], ['not a number'], [2000]]) as unknown[][];
    expect(out).toHaveLength(3);
    expect(out[1]![0]).toBe(!bad.ok && bad.error.message);
    expect(typeof out[0]![0]).toBe('string');
  });

  it('AM_LICH: serial number for 2026-02-17, dd/mm/yyyy text and range agree', () => {
    const e = lunarInfo(17, 2, 2026);
    const text = e.ok ? e.text : undefined;
    expect(text).toBeTruthy();
    expect(fns.AM_LICH!(serial(2026, 2, 17))).toBe(text);
    expect(fns.AM_LICH!('17/02/2026')).toBe(text);
    expect(fns.AM_LICH!([[serial(2026, 2, 17)], ['17/02/2026']])).toEqual([[text], [text]]);
  });

  it('AM_LICH: serial with fractional time of day is the same day', () => {
    const e = lunarInfo(17, 2, 2026);
    expect(fns.AM_LICH!(serial(2026, 2, 17) + 0.75)).toBe(e.ok && e.text);
  });

  it('AM_LICH: bad text returns error text', () => {
    expect(typeof fns.AM_LICH!('not a date')).toBe('string');
    const r = fns.AM_LICH!([['not a date']]) as unknown[][];
    expect(typeof r[0]![0]).toBe('string');
  });

  it('NGAY_LAM_VIEC: serial, text, range', () => {
    const w = (isWorkingDay(4, 1, 2025) as { working: boolean }).working;
    const w6 = (isWorkingDay(6, 1, 2025) as { working: boolean }).working;
    expect(typeof w).toBe('boolean');
    expect(fns.NGAY_LAM_VIEC!(serial(2025, 1, 4))).toBe(w);
    expect(fns.NGAY_LAM_VIEC!('04/01/2025')).toBe(w);
    expect(fns.NGAY_LAM_VIEC!([[serial(2025, 1, 4), '06/01/2025']])).toEqual([[w, w6]]);
  });

  it('CONG_NGAY_LAM_VIEC: result equals core addWorkingDays for serial and text', () => {
    const e = addWorkingDays(2, 1, 2025, 3);
    expect(e.ok).toBe(true);
    const iso = e.ok ? e.date : '';
    expect(toIso(fns.CONG_NGAY_LAM_VIEC!(serial(2025, 1, 2), 3))).toBe(iso);
    expect(toIso(fns.CONG_NGAY_LAM_VIEC!('02/01/2025', 3))).toBe(iso);
    const r = fns.CONG_NGAY_LAM_VIEC!([[serial(2025, 1, 2)], ['02/01/2025']], 3) as unknown[][];
    expect(r).toHaveLength(2);
    expect(toIso(r[0]![0])).toBe(iso);
    expect(toIso(r[1]![0])).toBe(iso);
  });

  it('CONG_NGAY_LAM_VIEC: n passed as a 1x1 range and negative n', () => {
    const e = addWorkingDays(2, 1, 2025, 3);
    const back = addWorkingDays(2, 1, 2025, -2);
    expect(toIso(fns.CONG_NGAY_LAM_VIEC!('02/01/2025', [[3]]))).toBe(e.ok ? e.date : '');
    expect(toIso(fns.CONG_NGAY_LAM_VIEC!('02/01/2025', -2))).toBe(back.ok ? back.date : '');
  });

  it('CONG_NGAY_LAM_VIEC: bad date returns error text', () => {
    expect(typeof fns.CONG_NGAY_LAM_VIEC!('xx', 1)).toBe('string');
  });

  it('DIA_CHI_MOI (when shipped): value, range, error text, and documented', () => {
    if (!meta.functions.some((f) => f.id === 'DIA_CHI_MOI')) return;
    const input = '1 Đinh Tiên Hoàng, Phường Đa Kao, Quận 1, TP Hồ Chí Minh';
    const e = convertAddress(input);
    const formatted = e.ok ? e.new.formatted : undefined;
    expect(formatted).toBeTruthy();
    expect(fns.DIA_CHI_MOI!(input)).toBe(formatted);
    const r = fns.DIA_CHI_MOI!([[input], ['???']]) as string[][];
    expect(r[0]![0]).toBe(formatted);
    expect(typeof r[1]![0]).toBe('string');
    expect(readFileSync(resolve(ROOT, 'README.md'), 'utf8')).toContain('DIA_CHI_MOI');
  });

  it('SDT, TACH_TEN and CCCD are in functions.json with description and optional params', () => {
    for (const id of ['SDT', 'TACH_TEN', 'CCCD']) {
      const f = meta.functions.find((x) => x.id === id);
      expect(f, id).toBeTruthy();
      expect(f!.description?.length).toBeGreaterThan(0);
      expect(typeof fns[id]).toBe('function');
    }
    const opt = (id: string) =>
      meta.functions
        .find((x) => x.id === id)!
        .parameters.some((p) => (p as { optional?: boolean }).optional === true);
    expect(opt('SDT')).toBe(true);
    expect(opt('CCCD')).toBe(true);
  });

  it('SDT: formats, range and error cell match core', () => {
    const p = parsePhone('0912345678');
    if (!p.ok) throw new Error('fixture');
    expect(fns.SDT!('0912345678')).toBe(p.formatted);
    expect(fns.SDT!('0912345678', 'e164')).toBe(p.e164);
    expect(fns.SDT!('0912345678', [['carrier']])).toBe(p.carrier ?? '');
    const r = fns.SDT!([['0912345678'], ['abc']]) as string[][];
    expect(r[0]![0]).toBe(p.formatted);
    expect(typeof r[1]![0]).toBe('string');
    expect(r[1]![0]).not.toBe('');
  });

  it('TACH_TEN: ho, dem, ten, range, invalid part', () => {
    const n = splitName('Nguyễn Văn An');
    if (!n.ok) throw new Error('fixture');
    expect(fns.TACH_TEN!('Nguyễn Văn An', 'ho')).toBe(n.family);
    expect(fns.TACH_TEN!('Nguyễn Văn An', 'dem')).toBe(n.middle);
    expect(fns.TACH_TEN!('Nguyễn Văn An', [['ten']])).toBe(n.given);
    const r = fns.TACH_TEN!([['Nguyễn Văn An'], ['']], 'ten') as string[][];
    expect(r[0]![0]).toBe(n.given);
    expect(typeof r[1]![0]).toBe('string');
    expect(fns.TACH_TEN!('Nguyễn Văn An', 'xyz')).toContain('ten');
  });

  it('CCCD: fields, range, error cell match core', () => {
    const id = '048090123456';
    const c = parseCitizenId(id);
    if (!c.ok || c.kind !== 'cccd') throw new Error('fixture');
    expect(fns.CCCD!(id)).toBe(true);
    expect(fns.CCCD!(id, 'tinh')).toBe(c.province!.fullName);
    expect(fns.CCCD!(id, 'tinh_moi')).toBe(c.newProvince?.fullName ?? '');
    expect(fns.CCCD!(id, [['gioi_tinh']])).toBe(c.sex === 'male' ? 'Nam' : 'Nữ');
    expect(fns.CCCD!(id, 'nam_sinh')).toBe(c.birthYear);
    const r = fns.CCCD!([[id], ['abc']], 'nam_sinh') as unknown[][];
    expect(r[0]![0]).toBe(c.birthYear);
    expect(typeof r[1]![0]).toBe('string');
    expect(fns.CCCD!('abc')).toBe(false);
  });
});
