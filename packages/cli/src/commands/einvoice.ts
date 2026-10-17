import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import {
  validateInvoice,
  computeTotals,
  exampleInvoice,
  createProvider,
  PROVIDER_NAMES,
  type ProviderName,
} from '@vn-skills/core';
import { failExit, printJson, wantsJson } from '../output.js';

function readInvoice(file: string, c: Command): unknown {
  try {
    const text = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
    return JSON.parse(text);
  } catch (e) {
    return failExit(c, {
      code: 'READ_ERROR',
      message: `Cannot read invoice JSON from ${file}: ${(e as Error).message}`,
    });
  }
}

export function registerEinvoice(program: Command): void {
  const cmd = program
    .command('einvoice')
    .description('E-invoice (hóa đơn điện tử) schema validation, totals and mock issuing');

  cmd
    .command('validate <file>')
    .description('Validate an invoice JSON file (use - for stdin)')
    .action((file: string, _o, c: Command) => {
      const v = validateInvoice(readInvoice(file, c));
      if (wantsJson(c)) printJson({ ok: v.ok, errors: v.errors, warnings: v.warnings });
      else {
        for (const e of v.errors) process.stdout.write(`error    ${e.path}: ${e.message}\n`);
        for (const w of v.warnings) process.stdout.write(`warning  ${w.path}: ${w.message}\n`);
        process.stdout.write(
          v.ok ? 'Invoice is valid.\n' : `Invoice has ${v.errors.length} error(s).\n`,
        );
      }
      if (!v.ok) process.exit(1);
    });

  cmd
    .command('totals <file>')
    .description('Compute line amounts, VAT breakdown, grand total and amount in words')
    .option('--thousand <word>', '"nghìn" (default) or "ngàn"')
    .action((file: string, opts, c: Command) => {
      const v = validateInvoice(readInvoice(file, c));
      if (!v.ok)
        failExit(c, {
          code: 'INVALID_INVOICE',
          message: v.errors.map((e) => `${e.path}: ${e.message}`).join('; '),
        });
      const t = computeTotals(v.invoice!, { thousand: opts.thousand });
      if (wantsJson(c)) printJson({ ok: true, ...t, warnings: v.warnings });
      else {
        for (const l of t.lines)
          process.stdout.write(
            `${String(l.no).padStart(2)}  ${l.name.padEnd(30)} ${String(l.quantity).padStart(6)} x ${String(l.unitPrice).padStart(12)} = ${String(l.amount).padStart(14)}  VAT ${String(l.vatRate).padEnd(5)} ${String(l.vatAmount).padStart(12)}\n`,
          );
        process.stdout.write(
          `Subtotal: ${t.subtotal.toLocaleString('vi-VN')}\nVAT: ${t.vatTotal.toLocaleString('vi-VN')}\nTotal: ${t.grandTotal.toLocaleString('vi-VN')}\nIn words: ${t.totalInWords}\n`,
        );
      }
    });

  cmd
    .command('create <file>')
    .description('Issue an invoice through a provider (only "mock" works in this version)')
    .option('-p, --provider <name>', `provider: ${PROVIDER_NAMES.join(' | ')}`, 'mock')
    .action(async (file: string, opts, c: Command) => {
      const v = validateInvoice(readInvoice(file, c));
      if (!v.ok)
        failExit(c, {
          code: 'INVALID_INVOICE',
          message: v.errors.map((e) => `${e.path}: ${e.message}`).join('; '),
        });
      try {
        const provider = createProvider(opts.provider as ProviderName);
        const issued = await provider.createInvoice(v.invoice!);
        if (wantsJson(c)) printJson({ ok: true, ...issued });
        else
          process.stdout.write(
            `Issued ${issued.series}-${issued.number} via ${issued.provider}: ${issued.totals.grandTotal.toLocaleString('vi-VN')} VND (${issued.status})\n`,
          );
      } catch (e) {
        failExit(c, {
          code: (e as Error).name === 'ConfigError' ? 'CONFIG_ERROR' : 'PROVIDER_ERROR',
          message: (e as Error).message,
        });
      }
    });

  cmd
    .command('example')
    .description('Print an example invoice JSON to start from')
    .action(() => {
      printJson(exampleInvoice());
    });
}
