import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import {
  buildVietQR,
  parseVietQR,
  registerBanks,
  renderVietQRCard,
  searchBanks,
  type Bank,
} from '@vn-skills/core';
import { decodeQrPng } from '../decode.js';
import { failExit, kv, printJson, wantsJson } from '../output.js';

function printParsed(payload: string, c: Command, extra: Record<string, unknown> = {}): void {
  const r = parseVietQR(payload);
  if (!r.ok) failExit(c, r.error);
  const result = {
    ok: true,
    ...extra,
    isVietQR: r.isVietQR,
    crcValid: r.crcValid,
    bin: r.bin,
    bank: r.bank
      ? { bin: r.bank.bin, code: r.bank.code, shortName: r.bank.shortName, name: r.bank.name }
      : undefined,
    account: r.account,
    service: r.service,
    amount: r.amount,
    currency: r.currency,
    country: r.country,
    note: r.note,
    additionalData: r.additionalData,
    dynamic: r.dynamic,
    crc: r.crc,
    expectedCrc: r.expectedCrc,
    warnings: r.warnings,
    fields: r.fields,
  };
  if (wantsJson(c)) printJson(result);
  else {
    process.stdout.write(
      kv([
        ['VietQR', r.isVietQR ? 'yes' : 'no'],
        ['CRC', r.crcValid ? `valid (${r.crc})` : `INVALID (${r.crc}, expected ${r.expectedCrc})`],
        ['Bank', r.bank ? `${r.bank.shortName} (${r.bin})` : r.bin],
        ['Account', r.account],
        ['Service', r.service],
        [
          'Amount',
          r.amount !== undefined
            ? `${r.amount.toLocaleString('vi-VN')} ${r.currency === '704' ? 'VND' : (r.currency ?? '')}`
            : '(payer enters)',
        ],
        ['Note', r.note],
        ...Object.entries(r.additionalData ?? {}).map(([k, v]): [string, string] => [
          `Data ${k}`,
          v,
        ]),
        ['Dynamic', r.dynamic ? 'yes' : 'no'],
      ]) + '\n',
    );
    for (const w of r.warnings) process.stderr.write(`warning: ${w}\n`);
  }
}

function collectData(value: string, prev: Record<string, string> = {}): Record<string, string> {
  const i = value.indexOf('=');
  return { ...prev, [i < 0 ? value : value.slice(0, i)]: i < 0 ? '' : value.slice(i + 1) };
}

const BANKS_OPT = '--banks <file>';
const BANKS_DESC = 'JSON array of extra/override banks (not verified by vn-skills)';

function loadBanks(opts: { banks?: string }, c: Command): void {
  if (!opts.banks) return;
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(opts.banks, 'utf8'));
  } catch (e) {
    failExit(c, {
      code: 'READ_ERROR',
      message: `cannot read ${opts.banks}: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
  const r = registerBanks(data as Bank[]);
  if (!r.ok) failExit(c, r.error);
}

const LOGO_MAX_PLATE = 0.22;
const LOGO_PAD_PX = 4;

interface LogoLayout {
  plate: number;
  width: number;
  height: number;
  scale: number;
}

// Sizes in pixels of a render `totalPx` wide; the plate stays <= 22% of the module area.
function layoutLogo(logo: PNG, totalPx: number, size: number): LogoLayout {
  const plate = Math.max(1, Math.floor((LOGO_MAX_PLATE * totalPx * size) / (size + 4)));
  const inner = Math.max(1, plate - 2 * LOGO_PAD_PX);
  const scale = Math.min(1, inner / logo.width, inner / logo.height);
  return {
    plate,
    width: Math.max(1, Math.round(logo.width * scale)),
    height: Math.max(1, Math.round(logo.height * scale)),
    scale,
  };
}

function compositeLogo(qr: PNG, logo: PNG, l: LogoLayout): void {
  const px = (v: number, n: number) => Math.min(n - 1, Math.max(0, v));
  const px0 = Math.floor((qr.width - l.plate) / 2);
  const py0 = Math.floor((qr.height - l.plate) / 2);
  for (let y = 0; y < l.plate; y++)
    for (let x = 0; x < l.plate; x++)
      qr.data.set([255, 255, 255, 255], ((py0 + y) * qr.width + px0 + x) * 4);
  const lx0 = Math.floor((qr.width - l.width) / 2);
  const ly0 = Math.floor((qr.height - l.height) / 2);
  for (let y = 0; y < l.height; y++)
    for (let x = 0; x < l.width; x++) {
      // area-average the source pixels covered by this target pixel
      const sx0 = Math.floor(x / l.scale);
      const sx1 = Math.max(sx0 + 1, Math.floor((x + 1) / l.scale));
      const sy0 = Math.floor(y / l.scale);
      const sy1 = Math.max(sy0 + 1, Math.floor((y + 1) / l.scale));
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        n = 0;
      for (let sy = sy0; sy < sy1; sy++)
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (px(sy, logo.height) * logo.width + px(sx, logo.width)) * 4;
          const al = logo.data[i + 3]!;
          r += logo.data[i]! * al;
          g += logo.data[i + 1]! * al;
          b += logo.data[i + 2]! * al;
          a += al;
          n++;
        }
      if (a === 0) continue;
      const alpha = a / n / 255;
      const o = ((ly0 + y) * qr.width + lx0 + x) * 4;
      qr.data[o] = Math.round((r / a) * alpha + qr.data[o]! * (1 - alpha));
      qr.data[o + 1] = Math.round((g / a) * alpha + qr.data[o + 1]! * (1 - alpha));
      qr.data[o + 2] = Math.round((b / a) * alpha + qr.data[o + 2]! * (1 - alpha));
      qr.data[o + 3] = 255;
    }
}

export function registerVietqr(program: Command): void {
  const cmd = program
    .command('vietqr')
    .description('Build or parse VietQR (NAPAS 247) bank-transfer QR codes');

  cmd
    .command('build')
    .description('Build a VietQR payload (and optionally a PNG/SVG image)')
    .requiredOption('-b, --bank <bank>', 'bank BIN (970436), code (VCB) or name (Vietcombank)')
    .requiredOption('-a, --account <account>', 'beneficiary account number')
    .option('-m, --amount <vnd>', 'amount in VND (integer); omit for a static QR')
    .option('-n, --note <text>', 'transfer note (diacritics are removed, max 25 chars)')
    .option(
      '--data <id=value>',
      'extra tag 62 sub-field, repeatable (e.g. 05=ORDER123)',
      collectData,
    )
    .option('--card', 'account is a card number (QRIBFTTC)')
    .option('--static', 'force static QR (payer enters the amount)')
    .option('-o, --out <file>', 'write image: .png or .svg (also prints payload)')
    .option('--template <name>', 'render a printable card (card|print); needs an .svg --out')
    .option('--account-name <text>', 'account holder shown on the card (display only)')
    .option('--logo <file>', 'PNG logo centred in the QR (needs --out; uses error correction H)')
    .option('--ascii', 'print the QR as ASCII art to the terminal')
    .option('--data-url', 'include a base64 PNG data URL in the JSON output')
    .option(BANKS_OPT, BANKS_DESC)
    .action(async (opts, c: Command) => {
      loadBanks(opts, c);
      const r = buildVietQR({
        bank: opts.bank,
        account: opts.account,
        amount: opts.amount,
        note: opts.note,
        additionalData: opts.data,
        service: opts.card ? 'card' : 'account',
        dynamic: opts.static ? false : undefined,
      });
      if (!r.ok) failExit(c, r.error);
      let out: string | undefined;
      if (opts.template && opts.template !== 'card' && opts.template !== 'print')
        failExit(c, {
          code: 'INVALID_OPTION',
          message: `Unknown template "${opts.template}"`,
          hint: 'Use --template card or --template print',
        });
      if (opts.logo && !opts.out)
        failExit(c, {
          code: 'LOGO_NEEDS_OUT',
          message: '--logo needs --out',
          hint: 'add -o qr.png or -o qr.svg',
        });
      if (opts.logo && opts.template)
        failExit(c, {
          code: 'INVALID_OPTION',
          message: '--logo cannot be combined with --template',
          hint: 'use either --logo or --template',
        });
      if (opts.template && opts.out && !String(opts.out).toLowerCase().endsWith('.svg'))
        failExit(c, {
          code: 'UNSUPPORTED_FORMAT',
          message: '--template only supports .svg output',
          hint: 'use .svg with --template',
        });
      const ecl = opts.logo ? 'H' : 'M';
      let logo: PNG | undefined;
      let logoInfo: { width: number; height: number; scale: number } | undefined;
      if (opts.logo) {
        try {
          logo = PNG.sync.read(readFileSync(String(opts.logo)));
        } catch (e) {
          failExit(c, {
            code: 'LOGO_READ_ERROR',
            message: `cannot read logo ${opts.logo}: ${e instanceof Error ? e.message : String(e)}`,
            hint: 'pass an existing PNG file',
          });
        }
      }
      if (opts.out) {
        const file = String(opts.out);
        if (opts.template) {
          const { modules } = QRCode.create(r.payload, { errorCorrectionLevel: 'M' });
          const rows: boolean[][] = [];
          for (let y = 0; y < modules.size; y++) {
            const row: boolean[] = [];
            for (let x = 0; x < modules.size; x++) row.push(!!modules.get(x, y));
            rows.push(row);
          }
          const card = renderVietQRCard(
            { ...r, modules: rows },
            { template: opts.template, accountName: opts.accountName },
          );
          if (!card.ok) failExit(c, card.error);
          writeFileSync(file, card.svg);
        } else if (file.toLowerCase().endsWith('.svg')) {
          let svg = await QRCode.toString(r.payload, {
            type: 'svg',
            errorCorrectionLevel: ecl,
            margin: 2,
          });
          if (logo) {
            const n = QRCode.create(r.payload, { errorCorrectionLevel: ecl }).modules.size;
            const total = n + 4;
            const l = layoutLogo(logo, 512, n);
            logoInfo = { width: l.width, height: l.height, scale: l.scale };
            const u = total / 512;
            const f = (v: number) => Number((v * u).toFixed(4));
            const href = `data:image/png;base64,${PNG.sync.write(logo).toString('base64')}`;
            svg = svg.replace(
              '</svg>',
              `<rect x="${f(256 - l.plate / 2)}" y="${f(256 - l.plate / 2)}" width="${f(l.plate)}" height="${f(l.plate)}" fill="#ffffff"/>` +
                `<image x="${f(256 - l.width / 2)}" y="${f(256 - l.height / 2)}" width="${f(l.width)}" height="${f(l.height)}" href="${href}"/></svg>`,
            );
          }
          writeFileSync(file, svg);
        } else if (logo) {
          const n = QRCode.create(r.payload, { errorCorrectionLevel: ecl }).modules.size;
          const qr = PNG.sync.read(
            await QRCode.toBuffer(r.payload, {
              type: 'png',
              errorCorrectionLevel: ecl,
              margin: 2,
              width: 512,
            }),
          );
          const l = layoutLogo(logo, qr.width, n);
          logoInfo = { width: l.width, height: l.height, scale: l.scale };
          compositeLogo(qr, logo, l);
          writeFileSync(file, PNG.sync.write(qr));
        } else {
          await QRCode.toFile(file, r.payload, {
            type: 'png',
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 512,
          });
        }
        out = file;
      }
      const dataUrl = opts.dataUrl
        ? await QRCode.toDataURL(r.payload, { errorCorrectionLevel: ecl, margin: 2, width: 512 })
        : undefined;
      const result = {
        ok: true,
        payload: r.payload,
        bank: {
          bin: r.bank.bin,
          code: r.bank.code,
          shortName: r.bank.shortName,
          name: r.bank.name,
        },
        account: r.account,
        amount: r.amount,
        note: r.note,
        dynamic: r.dynamic,
        crc: r.crc,
        file: out,
        dataUrl,
        logo: logoInfo,
        warnings: r.warnings,
      };
      if (wantsJson(c)) printJson(result);
      else {
        process.stdout.write(
          kv([
            ['Bank', `${r.bank.shortName} (${r.bank.bin})`],
            ['Account', r.account],
            [
              'Amount',
              r.amount !== undefined ? `${r.amount.toLocaleString('vi-VN')} VND` : '(payer enters)',
            ],
            ['Note', r.note],
            ['Payload', r.payload],
            ['File', out],
          ]) + '\n',
        );
        for (const w of r.warnings) process.stderr.write(`warning: ${w}\n`);
      }
      if (opts.ascii)
        process.stdout.write(
          (await QRCode.toString(r.payload, { type: 'terminal', small: true })) + '\n',
        );
    });

  cmd
    .command('parse <payload>')
    .description('Decode a VietQR/EMVCo payload and verify its CRC')
    .option(BANKS_OPT, BANKS_DESC)
    .action((payload: string, opts, c: Command) => {
      loadBanks(opts, c);
      printParsed(payload, c);
    });

  cmd
    .command('decode <image>')
    .description('Read the QR code in a PNG image and decode it like `parse`')
    .option(BANKS_OPT, BANKS_DESC)
    .action((image: string, opts, c: Command) => {
      loadBanks(opts, c);
      const d = decodeQrPng(image);
      if (!d.ok) failExit(c, d.error);
      printParsed(d.payload, c, { payload: d.payload });
    });

  cmd
    .command('banks [query]')
    .description('List banks / search by BIN, code, SWIFT/BIC or name')
    .option(BANKS_OPT, BANKS_DESC)
    .action((query: string | undefined, opts, c: Command) => {
      loadBanks(opts, c);
      const list = searchBanks(query ?? '');
      if (wantsJson(c)) printJson({ ok: true, count: list.length, banks: list });
      else {
        for (const b of list)
          process.stdout.write(
            `${b.bin}  ${b.code.padEnd(12)} ${b.shortName.padEnd(18)} ${(b.swift ?? '').padEnd(11)} ${b.name}${b.deprecated ? '  (deprecated)' : ''}\n`,
          );
      }
    });
}
