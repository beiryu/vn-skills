import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import jsqrModule from 'jsqr';
import { PNG } from 'pngjs';
import QRCode from 'qrcode';
import { buildVietQR, parseVietQR, searchBanks } from '@vn-skills/core';
import { failExit, kv, printJson, wantsJson } from '../output.js';

// jsqr ships CommonJS; depending on the loader the function is the module itself or its `default`.
type JsQR = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;
const jsQR: JsQR = (
  typeof jsqrModule === 'function' ? jsqrModule : (jsqrModule as { default: unknown }).default
) as JsQR;

/** Read the QR payload from a PNG file. Returns an error message instead of throwing. */
export function decodeQrPng(
  file: string,
):
  | { ok: true; payload: string }
  | { ok: false; error: { code: string; message: string; hint?: string } } {
  let png: PNG;
  try {
    png = PNG.sync.read(readFileSync(file));
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'READ_ERROR',
        message: `cannot read ${file} as PNG: ${(e as Error).message}`,
        hint: 'Only PNG images are supported; convert screenshots or JPEGs to PNG first.',
      },
    };
  }
  const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!qr || !qr.data)
    return {
      ok: false,
      error: {
        code: 'NO_QR',
        message: `no QR code found in ${file}`,
        hint: 'Use a sharp, uncropped image with the whole QR code and its white border.',
      },
    };
  return { ok: true, payload: qr.data };
}

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
        ['Dynamic', r.dynamic ? 'yes' : 'no'],
      ]) + '\n',
    );
    for (const w of r.warnings) process.stderr.write(`warning: ${w}\n`);
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
    .option('--card', 'account is a card number (QRIBFTTC)')
    .option('--static', 'force static QR (payer enters the amount)')
    .option('-o, --out <file>', 'write image: .png or .svg (also prints payload)')
    .option('--ascii', 'print the QR as ASCII art to the terminal')
    .option('--data-url', 'include a base64 PNG data URL in the JSON output')
    .action(async (opts, c: Command) => {
      const r = buildVietQR({
        bank: opts.bank,
        account: opts.account,
        amount: opts.amount,
        note: opts.note,
        service: opts.card ? 'card' : 'account',
        dynamic: opts.static ? false : undefined,
      });
      if (!r.ok) failExit(c, r.error);
      let out: string | undefined;
      if (opts.out) {
        const file = String(opts.out);
        if (file.toLowerCase().endsWith('.svg')) {
          writeFileSync(
            file,
            await QRCode.toString(r.payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 }),
          );
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
        ? await QRCode.toDataURL(r.payload, { errorCorrectionLevel: 'M', margin: 2, width: 512 })
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
    .action((payload: string, _o, c: Command) => printParsed(payload, c));

  cmd
    .command('decode <image>')
    .description('Read the QR code in a PNG image and decode it like `parse`')
    .action((image: string, _o, c: Command) => {
      const d = decodeQrPng(image);
      if (!d.ok) failExit(c, d.error);
      printParsed(d.payload, c, { payload: d.payload });
    });

  cmd
    .command('banks [query]')
    .description('List banks / search by BIN, code or name')
    .action((query: string | undefined, _o, c: Command) => {
      const list = searchBanks(query ?? '');
      if (wantsJson(c)) printJson({ ok: true, count: list.length, banks: list });
      else {
        for (const b of list)
          process.stdout.write(
            `${b.bin}  ${b.code.padEnd(12)} ${b.shortName.padEnd(18)} ${b.name}${b.deprecated ? '  (deprecated)' : ''}\n`,
          );
      }
    });
}
