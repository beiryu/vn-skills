import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import jsqrModule from 'jsqr';
import { parseVietQR, VERSION } from '@vn-skills/core';

const CLI = resolve(__dirname, '..', 'packages', 'cli', 'dist', 'index.js');

// jsqr ships CommonJS; depending on the loader the function is the module itself or its `default`.
type JsQR = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
const jsQR: JsQR = (
  typeof jsqrModule === 'function' ? jsqrModule : (jsqrModule as { default: unknown }).default
) as JsQR;

function run(args: string[], input?: string) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input });
  return {
    code: r.status,
    out: r.stdout,
    err: r.stderr,
    json: () => JSON.parse(r.stdout) as Record<string, unknown>,
  };
}

describe('vn-skills CLI', () => {
  it('is built', () => expect(existsSync(CLI)).toBe(true));
  it('--version is the released package version', () => {
    const pkg = (name: string) =>
      (
        JSON.parse(
          readFileSync(resolve(__dirname, '..', 'packages', name, 'package.json'), 'utf8'),
        ) as { version: string }
      ).version;
    expect(run(['--version']).out.trim()).toBe(pkg('cli'));
    expect(VERSION).toBe(pkg('core'));
  });
  it('--help lists commands', () => {
    const r = run(['--help']);
    for (const c of ['vietqr', 'address', 'taxid', 'id', 'money', 'lunar', 'einvoice'])
      expect(r.out).toContain(c);
  });

  it('vietqr build writes a scannable PNG whose payload parses back', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const file = join(dir, 'qr.png');
    const r = run([
      'vietqr',
      'build',
      '--bank',
      'VCB',
      '--account',
      '0011001234567',
      '--amount',
      '500000',
      '--note',
      'thanh toan',
      '--out',
      file,
      '--json',
    ]);
    expect(r.code).toBe(0);
    const j = r.json();
    expect(j.ok).toBe(true);
    expect(existsSync(file)).toBe(true);
    const png = PNG.sync.read(readFileSync(file));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(j.payload);
    const parsed = parseVietQR(decoded!.data);
    expect(parsed.ok && parsed.crcValid).toBe(true);
    expect(parsed.ok && parsed.bin).toBe('970436');
    expect(parsed.ok && parsed.amount).toBe(500000);
  });
  it('vietqr decode reads back the fields of a PNG written by build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const file = join(dir, 'qr.png');
    const built = run([
      'vietqr',
      'build',
      '--bank',
      'MB',
      '--account',
      '0123456789',
      '--amount',
      '150000',
      '--note',
      'don hang 42',
      '--out',
      file,
      '--json',
    ]).json();
    const r = run(['vietqr', 'decode', file, '--json']);
    expect(r.code).toBe(0);
    const j = r.json();
    expect(j.payload).toBe(built.payload);
    expect(j.crcValid).toBe(true);
    expect(j.isVietQR).toBe(true);
    expect(j.bin).toBe('970422');
    expect(j.account).toBe('0123456789');
    expect(j.amount).toBe(150000);
    expect(j.note).toBe(built.note);
  });
  it('vietqr decode fails clearly for an image without a QR', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const file = join(dir, 'blank.png');
    const png = new PNG({ width: 64, height: 64 });
    png.data.fill(255);
    writeFileSync(file, PNG.sync.write(png));
    const r = run(['vietqr', 'decode', file, '--json']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/no QR code found/);
  });
  it('vietqr decode fails clearly for a file that is not a PNG', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const file = join(dir, 'qr.jpg');
    writeFileSync(file, 'not an image');
    const r = run(['vietqr', 'decode', file]);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/cannot read .* as PNG/);
  });
  it('holidays year/check/add', () => {
    const y = run(['holidays', 'year', '2026', '--json']).json();
    expect(y.announced).toBe(true);
    expect((y.daysOff as Array<{ date: string }>).map((d) => d.date)).toContain('2026-11-24');
    expect(run(['holidays', 'check', '2026-02-16', '--json']).json()).toMatchObject({
      working: false,
      certain: true,
    });
    expect(run(['holidays', 'add', '12/02/2026', '3', '--json']).json()).toMatchObject({
      date: '2026-02-24',
    });
    const bad = run(['holidays', 'year', '1999', '--json']);
    expect(bad.code).not.toBe(0);
    expect(bad.json()).toMatchObject({ ok: false, error: { code: 'OUT_OF_RANGE' } });
  });
  it('vietqr build writes SVG', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const file = join(dir, 'qr.svg');
    const r = run(['vietqr', 'build', '--bank', '970422', '--account', '123', '--out', file]);
    expect(r.code).toBe(0);
    expect(readFileSync(file, 'utf8')).toContain('<svg');
  });
  it('vietqr build fails with JSON error for unknown bank', () => {
    const r = run(['vietqr', 'build', '--bank', 'nope', '--account', '1']);
    expect(r.code).toBe(1);
    expect((r.json().error as { code: string }).code).toBe('BANK_NOT_FOUND');
  });
  it('vietqr parse', () => {
    const r = run([
      'vietqr',
      'parse',
      '00020101021238530010A000000727012300069704230109mynamebvh0208QRIBFTTA53037045405500005802VN62080804test6304AB76',
    ]);
    expect(r.code).toBe(0);
    expect(r.json().crcValid).toBe(true);
    expect(r.json().bin).toBe('970423');
  });
  it('vietqr banks', () => {
    const r = run(['vietqr', 'banks', 'vietcom']);
    expect((r.json().banks as unknown[]).length).toBeGreaterThan(0);
  });

  it('taxid validate ok', () => {
    const r = run(['taxid', 'validate', '0100233488-001']);
    expect(r.code).toBe(0);
    expect(r.json().kind).toBe('branch');
  });
  it('taxid validate bad', () => {
    const r = run(['taxid', 'validate', '0100233480']);
    expect(r.code).toBe(1);
    expect((r.json().error as { code: string }).code).toBe('INVALID_CHECKSUM');
  });

  it('money words', () => {
    const r = run(['money', 'words', '1200000']);
    expect(r.json().words).toBe('một triệu hai trăm nghìn đồng');
  });
  it('money words --pretty prints plain text', () => {
    expect(run(['money', 'words', '15', '--pretty']).out.trim()).toBe('mười lăm đồng');
  });

  it('lunar from-solar', () => {
    const r = run(['lunar', 'from-solar', '29/01/2025']);
    expect(r.json().text).toBe('Mùng 1 tháng Giêng năm Ất Tỵ');
  });
  it('lunar to-solar', () => {
    const r = run(['lunar', 'to-solar', '1/1/2026']);
    expect((r.json().solar as { date: string }).date).toBe('2026-02-17');
  });
  it('lunar holidays --public', () => {
    const r = run(['lunar', 'holidays', '2025', '--public']);
    expect(
      (r.json().holidays as Array<{ name: string }>).some((h) => h.name.includes('Giỗ Tổ')),
    ).toBe(true);
  });

  it('address convert', () => {
    const r = run(['address', 'convert', '12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM']);
    expect(r.code).toBe(0);
    expect((r.json().new as { ward: { fullName: string } }).ward.fullName).toBe('Phường Sài Gòn');
  });
  it('address parse', () => {
    const r = run(['address', 'parse', 'Phường Hoàn Kiếm, Hà Nội']);
    expect((r.json().ward as { fullName: string }).fullName).toBe('Phường Hoàn Kiếm');
  });
  it('name split accepts unquoted multi-word text', () => {
    const quoted = run(['name', 'split', 'Tôn Thất Tùng']);
    const bare = run(['name', 'split', 'Tôn', 'Thất', 'Tùng']);
    expect(bare.code).toBe(0);
    expect(bare.json()).toEqual(quoted.json());
  });
  it('address convert accepts unquoted multi-word text', () => {
    const quoted = run(['address', 'convert', 'P. Bến Nghé, Q.1, TP.HCM']);
    const bare = run(['address', 'convert', 'P.', 'Bến', 'Nghé,', 'Q.1,', 'TP.HCM']);
    expect(bare.code).toBe(0);
    expect(bare.json()).toEqual(quoted.json());
  });
  it('address provinces lists 34', () => {
    expect(run(['address', 'provinces']).json().count).toBe(34);
  });

  it('einvoice example | validate | totals | create', () => {
    const ex = run(['einvoice', 'example']);
    expect(ex.code).toBe(0);
    const dir = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const file = join(dir, 'inv.json');
    writeFileSync(file, ex.out);
    expect(run(['einvoice', 'validate', file]).code).toBe(0);
    const t = run(['einvoice', 'totals', file]).json();
    expect(t.grandTotal).toBe(7_660_000);
    const c = run(['einvoice', 'create', file, '--provider', 'mock']).json();
    expect(c.status).toBe('issued');
    expect(c.number).toBe('00000001');
  });
  it('einvoice validate from stdin fails on bad data', () => {
    const r = run(['einvoice', 'validate', '-'], JSON.stringify({ series: 'x' }));
    expect(r.code).toBe(1);
    expect((r.json().errors as unknown[]).length).toBeGreaterThan(0);
  });
  it('einvoice create with misa reports missing config', () => {
    const ex = run(['einvoice', 'example']);
    const dir = mkdtempSync(join(tmpdir(), 'vn-skills-'));
    const file = join(dir, 'inv.json');
    writeFileSync(file, ex.out);
    const r = run(['einvoice', 'create', file, '--provider', 'misa']);
    expect(r.code).toBe(1);
    expect((r.json().error as { code: string }).code).toBe('CONFIG_ERROR');
  });
});

describe('vn-skills install', () => {
  function install(args: string[], cwd: string, home: string) {
    const r = spawnSync(process.execPath, [CLI, 'install', ...args], {
      encoding: 'utf8',
      cwd,
      env: { ...process.env, HOME: home, USERPROFILE: home },
    });
    return { code: r.status, out: r.stdout, err: r.stderr };
  }
  const tmp = () => mkdtempSync(join(tmpdir(), 'vn-skills-'));

  it('--agent claude installs one skill into .claude/skills/<name> (project)', () => {
    const cwd = tmp();
    const r = install(['vietqr', '--agent', 'claude'], cwd, tmp());
    expect(r.code).toBe(0);
    expect(existsSync(join(cwd, '.claude', 'skills', 'vietqr', 'SKILL.md'))).toBe(true);
  });
  it('--global installs into ~/.claude/skills/<name>', () => {
    const cwd = tmp();
    const home = tmp();
    const r = install(['vn-lunar', '--agent', 'claude', '--global'], cwd, home);
    expect(r.code).toBe(0);
    expect(existsSync(join(home, '.claude', 'skills', 'vn-lunar', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(cwd, '.claude'))).toBe(false);
  });
  it('--agent cursor and codex use .cursor/skills and .codex/skills', () => {
    const cwd = tmp();
    expect(install(['vn-tax-id', '--agent', 'cursor'], cwd, tmp()).code).toBe(0);
    expect(install(['vn-tax-id', '--agent', 'codex'], cwd, tmp()).code).toBe(0);
    expect(existsSync(join(cwd, '.cursor', 'skills', 'vn-tax-id', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(cwd, '.codex', 'skills', 'vn-tax-id', 'SKILL.md'))).toBe(true);
  });
  it('"all" installs every bundled skill', () => {
    const cwd = tmp();
    const r = install(['all', '--agent', 'claude'], cwd, tmp());
    expect(r.code).toBe(0);
    const expected = readdirSync(join(__dirname, '..', 'skills')).sort();
    expect(readdirSync(join(cwd, '.claude', 'skills')).sort()).toEqual(expected);
  });
  it('refuses to overwrite without --force, overwrites with it', () => {
    const cwd = tmp();
    const home = tmp();
    install(['vietqr', '--agent', 'claude'], cwd, home);
    const file = join(cwd, '.claude', 'skills', 'vietqr', 'SKILL.md');
    writeFileSync(file, 'local edit');
    const r = install(['vietqr', '--agent', 'claude'], cwd, home);
    expect(r.code).not.toBe(0);
    expect(readFileSync(file, 'utf8')).toBe('local edit');
    const f = install(['vietqr', '--agent', 'claude', '--force'], cwd, home);
    expect(f.code).toBe(0);
    expect(readFileSync(file, 'utf8')).not.toBe('local edit');
  });
  it('--dry-run prints actions and writes nothing', () => {
    const cwd = tmp();
    const r = install(['vietqr', '--agent', 'claude', '--dry-run'], cwd, tmp());
    expect(r.code).toBe(0);
    expect(r.out).toContain('vietqr');
    expect(existsSync(join(cwd, '.claude'))).toBe(false);
  });
  it('rejects unknown skills', () => {
    const cwd = tmp();
    const r = install(['nope', '--agent', 'claude'], cwd, tmp());
    expect(r.code).not.toBe(0);
    expect(existsSync(join(cwd, '.claude'))).toBe(false);
  });
});
