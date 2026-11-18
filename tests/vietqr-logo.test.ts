import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import jsqrModule from 'jsqr';

const CLI = resolve(__dirname, '..', 'packages', 'cli', 'dist', 'index.js');
type JsQR = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
const jsQR: JsQR = (
  typeof jsqrModule === 'function' ? jsqrModule : (jsqrModule as { default: unknown }).default
) as JsQR;

function run(args: string[]) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const dir = mkdtempSync(join(tmpdir(), 'vn-skills-logo-'));
function logoFile(name: string, w: number, h: number): string {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) png.data.set([255, 0, 0, 255], i * 4);
  const f = join(dir, name);
  writeFileSync(f, PNG.sync.write(png));
  return f;
}
const base = [
  'vietqr',
  'build',
  '--bank',
  'VCB',
  '--account',
  '0011001234567',
  '--amount',
  '500000',
];

function roundTrip(logo: string, name: string) {
  const out = join(dir, name);
  const r = run([...base, '--logo', logo, '-o', out, '--json']);
  expect(r.code).toBe(0);
  const j = JSON.parse(r.out) as {
    payload: string;
    logo: { width: number; height: number; scale: number };
  };
  const png = PNG.sync.read(readFileSync(out));
  expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(j.payload);
  return { j, png };
}
function errOf(r: { out: string; err: string; code: number | null }) {
  expect(r.code).not.toBe(0);
  return (
    JSON.parse(r.out) as { ok: boolean; error: { code: string; message: string; hint: string } }
  ).error;
}

describe('vietqr build --logo', () => {
  it('round-trips with a square logo and reports logo info', () => {
    const { j } = roundTrip(logoFile('sq.png', 200, 200), 'sq-out.png');
    expect(j.logo.width).toBeGreaterThan(0);
    expect(j.logo.height).toBeGreaterThan(0);
    expect(j.logo.scale).toBeGreaterThan(0);
    expect(j.logo.scale).toBeLessThanOrEqual(1);
  });
  it('round-trips with a non-square logo', () => {
    const { j } = roundTrip(logoFile('wide.png', 300, 60), 'wide-out.png');
    expect(j.logo.width / j.logo.height).toBeCloseTo(5, 0);
  });
  it('round-trips with a logo larger than the QR (scaled down)', () => {
    const { j, png } = roundTrip(logoFile('big.png', 2000, 2000), 'big-out.png');
    expect(j.logo.scale).toBeLessThan(1);
    expect(j.logo.width).toBeLessThan(png.width);
  });
  it('keeps the logo within 22% of the module area side', () => {
    const { png } = roundTrip(logoFile('plate.png', 2000, 2000), 'plate-out.png');
    let rMin = Infinity,
      rMax = -1,
      dMin = Infinity,
      dMax = -1;
    for (let y = 0; y < png.height; y++)
      for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4;
        const [r, g, b] = [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!];
        if (r > 200 && g < 60 && b < 60) {
          rMin = Math.min(rMin, x);
          rMax = Math.max(rMax, x);
        } else if (r < 128 && g < 128 && b < 128) {
          dMin = Math.min(dMin, x);
          dMax = Math.max(dMax, x);
        }
      }
    expect(rMax).toBeGreaterThan(rMin);
    const moduleSide = dMax - dMin + 1;
    expect(rMax - rMin + 1).toBeLessThanOrEqual(0.22 * moduleSide);
  });
  it('svg output has exactly one centred png <image> and stays well-formed', () => {
    const out = join(dir, 'qr.svg');
    const r = run([...base, '--logo', logoFile('s.png', 100, 100), '-o', out, '--json']);
    expect(r.code).toBe(0);
    const svg = readFileSync(out, 'utf8');
    expect(svg.match(/<image\b/g)?.length).toBe(1);
    expect(svg).toContain('data:image/png;base64,');
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg)!;
    const img = /<image\b[^>]*>/.exec(svg)![0];
    const num = (k: string) => Number(new RegExp(`\\b${k}="([\\d.]+)"`).exec(img)![1]);
    expect(num('x') + num('width') / 2).toBeCloseTo(Number(vb[1]) / 2, 0);
    expect(num('y') + num('height') / 2).toBeCloseTo(Number(vb[2]) / 2, 0);
  });
  it('without --out returns LOGO_NEEDS_OUT', () => {
    const e = errOf(run([...base, '--logo', logoFile('n.png', 10, 10), '--json']));
    expect(e.code).toBe('LOGO_NEEDS_OUT');
    expect(e.hint).toBeTruthy();
  });
  it('--data-url carries the same logo image as the PNG file', () => {
    const out = join(dir, 'du-out.png');
    const r = run([
      ...base,
      '--logo',
      logoFile('du.png', 200, 200),
      '-o',
      out,
      '--data-url',
      '--json',
    ]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { payload: string; dataUrl: string };
    const fromUrl = PNG.sync.read(
      Buffer.from(j.dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'),
    );
    const file = PNG.sync.read(readFileSync(out));
    expect(fromUrl.width).toBe(file.width);
    expect(Buffer.compare(fromUrl.data, file.data)).toBe(0);
    // the centre pixel is the red logo, and the QR still decodes
    const c = (fromUrl.height / 2) * fromUrl.width * 4 + (fromUrl.width / 2) * 4;
    expect([...fromUrl.data.subarray(c, c + 3)]).toEqual([255, 0, 0]);
    expect(jsQR(new Uint8ClampedArray(fromUrl.data), fromUrl.width, fromUrl.height)?.data).toBe(
      j.payload,
    );
  });
  it('svg logo has xlink:href for SVG 1.1 renderers, with the namespace declared', () => {
    const out = join(dir, 'xl.svg');
    expect(run([...base, '--logo', logoFile('xl.png', 100, 100), '-o', out]).code).toBe(0);
    const svg = readFileSync(out, 'utf8');
    expect(svg).toMatch(/<svg [^>]*xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/);
    expect(/<image\b[^>]*>/.exec(svg)![0]).toContain('xlink:href="data:image/png;base64,');
  });
  it('missing or non-PNG logo returns LOGO_READ_ERROR', () => {
    const out = join(dir, 'x.png');
    const e1 = errOf(run([...base, '--logo', join(dir, 'nope.png'), '-o', out, '--json']));
    expect(e1.code).toBe('LOGO_READ_ERROR');
    expect(e1.hint).toBeTruthy();
    const bad = join(dir, 'bad.png');
    writeFileSync(bad, 'not a png');
    const e2 = errOf(run([...base, '--logo', bad, '-o', out, '--json']));
    expect(e2.code).toBe('LOGO_READ_ERROR');
    expect(existsSync(out)).toBe(false);
  });
  it('--logo with --template returns INVALID_OPTION', () => {
    const out = join(dir, 't.svg');
    const e = errOf(
      run([
        ...base,
        '--logo',
        logoFile('t.png', 10, 10),
        '--template',
        'card',
        '-o',
        out,
        '--json',
      ]),
    );
    expect(e.code).toBe('INVALID_OPTION');
    expect(e.hint).toBeTruthy();
  });
});

describe('vietqr build --logo with --template', () => {
  it('returns INVALID_OPTION for a .png output too', () => {
    const r = run([
      ...base,
      '--logo',
      logoFile('t.png', 20, 20),
      '--template',
      'card',
      '-o',
      join(dir, 'x.png'),
      '--json',
    ]);
    expect(errOf(r).code).toBe('INVALID_OPTION');
  });
});
