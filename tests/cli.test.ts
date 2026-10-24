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
  it('taxid validate empty', () => {
    const r = run(['taxid', 'validate', '']);
    expect(r.code).toBe(1);
    expect((r.json().error as { code: string }).code).toBe('EMPTY');
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

  it('money words -- -5 works with the separator', () => {
    const r = run(['--json', 'money', 'words', '--', '-5']);
    expect(r.code).toBe(0);
    expect(r.json().words).toBe('âm năm đồng');
  });
  it('money words -5 works or tells the user to use --', () => {
    const r = run(['--json', 'money', 'words', '-5']);
    if (r.code === 0) expect(r.json().words).toBe('âm năm đồng');
    else expect(r.out + r.err).toContain('money words -- -5');
  });
  it('money words -1200000 --thousand ngàn works or hints at --', () => {
    const r = run(['--json', 'money', 'words', '-1200000', '--thousand', 'ngàn']);
    if (r.code === 0) expect(r.json().words).toBe('âm một triệu hai trăm ngàn đồng');
    else expect(r.out + r.err).toContain('--');
    expect(r.out + r.err).not.toMatch(/unknown option '-1200000'$/m);
  });
  it('money words still rejects a real unknown option', () => {
    const r = run(['money', 'words', '5', '--foo']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toContain('--foo');
  });
  it('money words --help explains negative amounts', () => {
    expect(run(['money', 'words', '--help']).out).toContain('-- -');
  });

  it('lunar from-solar', () => {
    const r = run(['lunar', 'from-solar', '29/01/2025']);
    expect(r.json().text).toBe('Mùng 1 tháng Giêng năm Ất Tỵ');
  });
  it('lunar to-solar', () => {
    const r = run(['lunar', 'to-solar', '1/1/2026']);
    expect((r.json().solar as { date: string }).date).toBe('2026-02-17');
  });
  it('lunar to-solar accepts lunar day 30 of month 2 (Gregorian-invalid)', () => {
    const r = run(['lunar', 'to-solar', '30/2/2023']);
    expect(r.json().ok).toBe(true);
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
  describe('address convert-file', () => {
    const OLD = 'P. Bến Nghé, Q.1, TP.HCM';
    const tmpFile = (name: string, content: string) => {
      const file = join(mkdtempSync(join(tmpdir(), 'vn-skills-')), name);
      writeFileSync(file, content);
      return file;
    };
    const ndjson = (out: string) =>
      out
        .split('\n')
        .filter((l) => l.trim() !== '')
        .map((l) => JSON.parse(l) as Record<string, unknown>);
    // Minimal RFC 4180 reader for asserting on the CSV output.
    const parseCsv = (text: string) => {
      const rows: string[][] = [];
      let row: string[] = [];
      let cell = '';
      let quoted = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
          if (ch === '"' && text[i + 1] === '"') {
            cell += '"';
            i++;
          } else if (ch === '"') quoted = false;
          else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') {
          row.push(cell);
          cell = '';
        } else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && text[i + 1] === '\n') i++;
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
        } else cell += ch;
      }
      if (cell !== '' || row.length > 0) {
        row.push(cell);
        rows.push(row);
      }
      return rows;
    };

    it('is listed in address --help', () => {
      expect(run(['address', '--help']).out).toContain('convert-file');
    });

    it('converts lines, skips blanks, keeps 1-based line numbers, exits 2 on failures', () => {
      const file = tmpFile('addr.txt', `${OLD}\n\nasdf qwerty 123\n`);
      const r = run(['address', 'convert-file', file]);
      expect(r.code).toBe(2);
      expect(r.err).toContain('converted 1, failed 1');
      const rows = ndjson(r.out);
      expect(rows).toHaveLength(2);
      const first = rows[0]!;
      const second = rows[1]!;
      expect(first.ok).toBe(true);
      expect(first.line).toBe(1);
      expect(first.input).toBe(OLD);
      expect((first.new as { ward: { fullName: string } }).ward.fullName).toBe('Phường Sài Gòn');
      expect(second.ok).toBe(false);
      expect(second.line).toBe(3);
      expect(second.input).toBe('asdf qwerty 123');
      expect(second.error).toBeDefined();
    });

    it('exits 0 when every line converts', () => {
      const file = tmpFile('ok.txt', `${OLD}\n${OLD}\n`);
      const r = run(['address', 'convert-file', file]);
      expect(r.code).toBe(0);
      expect(ndjson(r.out).map((o) => o.line)).toEqual([1, 2]);
    });

    it('reads stdin with "-"', () => {
      const r = run(['address', 'convert-file', '-'], `${OLD}\n`);
      expect(r.code).toBe(0);
      const rows = ndjson(r.out);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.ok).toBe(true);
      expect(rows[0]!.line).toBe(1);
    });

    it('--csv --column appends result columns in order and handles quoted commas', () => {
      const file = tmpFile(
        'in.csv',
        `id,name,address\n1,"Nguyễn, Văn A","${OLD}"\n2,B,asdf qwerty 123\n`,
      );
      const r = run(['address', 'convert-file', file, '--csv', '--column', 'address']);
      expect(r.code).toBe(2);
      expect(r.err).toContain('converted 1, failed 1');
      const rows = parseCsv(r.out);
      expect(rows[0]).toEqual([
        'id',
        'name',
        'address',
        'new_address',
        'new_ward_code',
        'new_province_code',
        'mapping_type',
        'confidence',
        'warnings',
      ]);
      expect(rows).toHaveLength(3);
      const ok = rows[1]!;
      expect(ok.slice(0, 3)).toEqual(['1', 'Nguyễn, Văn A', OLD]);
      expect(ok[3]).toBe('Phường Sài Gòn, Thành phố Hồ Chí Minh');
      expect(ok[4]).toBe('26740');
      expect(ok[5]).toBe('79');
    });

    it('--csv supports newlines inside quoted fields', () => {
      const file = tmpFile('nl.csv', `id,address\n1,"${OLD}\nghi chú"\n`);
      const r = run(['address', 'convert-file', file, '--csv', '--column', 'address']);
      const rows = parseCsv(r.out);
      expect(rows).toHaveLength(2);
      expect(rows[1]!.slice(0, 1)).toEqual(['1']);
    });

    it('--csv with an unknown column fails with a clear error', () => {
      const file = tmpFile('bad.csv', `id,address\n1,"${OLD}"\n`);
      const r = run(['address', 'convert-file', file, '--csv', '--column', 'nope']);
      expect(r.code).not.toBe(0);
      expect(r.code).not.toBe(2);
      expect(`${r.out}${r.err}`).toContain('nope');
    });

    it('--csv without --column fails', () => {
      const file = tmpFile('nocol.csv', `id,address\n1,"${OLD}"\n`);
      const r = run(['address', 'convert-file', file, '--csv']);
      expect(r.code).not.toBe(0);
      expect(r.err).toContain('column');
    });
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
  it('--agent agents installs into .agents/skills/<name> (project)', () => {
    const cwd = tmp();
    const r = install(['vietqr', '--agent', 'agents'], cwd, tmp());
    expect(r.code).toBe(0);
    expect(existsSync(join(cwd, '.agents', 'skills', 'vietqr', 'SKILL.md'))).toBe(true);
  });
  it('--agent agents --global installs into ~/.agents/skills/<name>', () => {
    const cwd = tmp();
    const home = tmp();
    const r = install(['vn-lunar', '--agent', 'agents', '--global'], cwd, home);
    expect(r.code).toBe(0);
    expect(existsSync(join(home, '.agents', 'skills', 'vn-lunar', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(cwd, '.agents'))).toBe(false);
  });
  it('--agent agents --dry-run prints the .agents target and writes nothing', () => {
    const cwd = tmp();
    const r = install(['vietqr', '--agent', 'agents', '--dry-run'], cwd, tmp());
    expect(r.code).toBe(0);
    expect(r.out).toContain('[dry-run]');
    expect(r.out).toContain(join('.agents', 'skills', 'vietqr'));
    expect(existsSync(join(cwd, '.agents'))).toBe(false);
  });
  it('--agent agents refuses to overwrite without --force', () => {
    const cwd = tmp();
    const home = tmp();
    install(['vietqr', '--agent', 'agents'], cwd, home);
    const file = join(cwd, '.agents', 'skills', 'vietqr', 'SKILL.md');
    writeFileSync(file, 'local edit');
    expect(install(['vietqr', '--agent', 'agents'], cwd, home).code).not.toBe(0);
    expect(readFileSync(file, 'utf8')).toBe('local edit');
    expect(install(['vietqr', '--agent', 'agents', '--force'], cwd, home).code).toBe(0);
    expect(readFileSync(file, 'utf8')).not.toBe('local edit');
  });
  it('unknown-agent error lists agents', () => {
    const r = install(['vietqr', '--agent', 'nope'], tmp(), tmp());
    expect(r.code).not.toBe(0);
    expect(r.err).toContain('agents');
  });
  it('rejects unknown skills', () => {
    const cwd = tmp();
    const r = install(['nope', '--agent', 'claude'], cwd, tmp());
    expect(r.code).not.toBe(0);
    expect(existsSync(join(cwd, '.claude'))).toBe(false);
  });
});
