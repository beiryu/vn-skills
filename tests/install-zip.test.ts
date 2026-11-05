import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const ROOT = resolve(__dirname, '..');
const CLI = join(ROOT, 'packages', 'cli', 'dist', 'index.js');
const SKILLS = join(ROOT, 'skills');
const tmp = () => mkdtempSync(join(tmpdir(), 'vn-skills-zip-'));

function runCli(cli: string, args: string[], cwd: string) {
  const r = spawnSync(process.execPath, [cli, 'install', ...args], { encoding: 'utf8', cwd });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const install = (args: string[], cwd: string) => runCli(CLI, args, cwd);

/** Minimal zip reader (central directory; stored or deflated entries). */
function readZip(file: string): Map<string, Buffer> {
  const buf = readFileSync(file);
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8');
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const raw = buf.subarray(start, start + csize);
    if (!name.endsWith('/')) out.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nlen + elen + clen;
  }
  return out;
}

describe('vn-skills install --zip', () => {
  it('writes <dir>/vietqr.zip with the skill folder and identical bytes', () => {
    const cwd = tmp();
    const r = install(['vietqr', '--zip', 'out'], cwd);
    expect(r.err).toBe('');
    expect(r.code).toBe(0);
    const zip = join(cwd, 'out', 'vietqr.zip');
    expect(existsSync(zip)).toBe(true);
    const entries = readZip(zip);
    expect(
      entries.get('vietqr/SKILL.md')?.equals(readFileSync(join(SKILLS, 'vietqr', 'SKILL.md'))),
    ).toBe(true);
    expect(
      entries
        .get('vietqr/scripts/vietqr.py')
        ?.equals(readFileSync(join(SKILLS, 'vietqr', 'scripts', 'vietqr.py'))),
    ).toBe(true);
  });

  it('"all" writes one zip per skill and every bundled skill passes the frontmatter check', () => {
    const cwd = tmp();
    const r = install(['all', '--zip', 'out'], cwd);
    expect(r.err).not.toMatch(/name|description/i);
    expect(r.code).toBe(0);
    const expected = readdirSync(SKILLS)
      .filter((n) => existsSync(join(SKILLS, n, 'SKILL.md')))
      .map((n) => `${n}.zip`)
      .sort();
    expect(readdirSync(join(cwd, 'out')).sort()).toEqual(expected);
  });

  it('refuses an existing zip without --force, overwrites with it', () => {
    const cwd = tmp();
    mkdirSync(join(cwd, 'out'));
    const zip = join(cwd, 'out', 'vietqr.zip');
    writeFileSync(zip, 'old');
    const r = install(['vietqr', '--zip', 'out'], cwd);
    expect(r.code).not.toBe(0);
    expect(readFileSync(zip, 'utf8')).toBe('old');
    const f = install(['vietqr', '--zip', 'out', '--force'], cwd);
    expect(f.code).toBe(0);
    expect(readZip(zip).has('vietqr/SKILL.md')).toBe(true);
  });

  it('--dry-run writes nothing', () => {
    const cwd = tmp();
    const r = install(['vietqr', '--zip', 'out', '--dry-run'], cwd);
    expect(r.code).toBe(0);
    expect(r.out).toContain('vietqr');
    expect(existsSync(join(cwd, 'out'))).toBe(false);
  });

  it('fails on a too-long description, naming the skill and field', () => {
    const pkg = tmp();
    cpSync(join(ROOT, 'packages', 'cli', 'dist'), join(pkg, 'dist'), { recursive: true });
    symlinkSync(join(ROOT, 'packages', 'cli', 'node_modules'), join(pkg, 'node_modules'));
    writeFileSync(join(pkg, 'package.json'), '{"type":"module"}\n');
    const dir = join(pkg, 'skills', 'bad-skill');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'SKILL.md'),
      `---\nname: bad-skill\ndescription: ${'x'.repeat(1025)}\n---\n\n# Bad\n`,
    );
    const cwd = tmp();
    const r = runCli(join(pkg, 'dist', 'index.js'), ['bad-skill', '--zip', 'out'], cwd);
    expect(r.code).not.toBe(0);
    expect(r.err).toContain('bad-skill');
    expect(r.err).toContain('description');
    expect(existsSync(join(cwd, 'out', 'bad-skill.zip'))).toBe(false);
  });
});
