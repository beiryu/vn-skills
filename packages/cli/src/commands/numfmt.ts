import { Command } from 'commander';
import {
  formatCompactVnd,
  formatDate,
  formatNumber,
  formatVnd,
  parseAmount,
} from '@vn-skills/core';
import { failExit, printJson, wantsJson } from '../output.js';

export function registerNumfmt(program: Command): void {
  const cmd = program
    .command('numfmt')
    .description('Format and parse Vietnamese numbers, VND amounts and dates');
  cmd
    .command('format <value>')
    .description('Format a number: 1234567.89 -> "1.234.567,89"')
    .option('--vnd', 'append the ₫ sign: "1.200.000 ₫"')
    .option('--compact', 'short form: "1,2 triệu"')
    .action((value: string, opts, c: Command) => {
      const n = Number(value);
      const r = opts.compact ? formatCompactVnd(n) : opts.vnd ? formatVnd(n) : formatNumber(n);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson({ ok: true, text: r.text });
      else process.stdout.write(r.text + '\n');
    });
  cmd
    .command('parse <text>')
    .description('Parse a typed amount: "1tr2", "500k", "1,5 tỷ", "1.234.567,89"')
    .action((text: string, _opts, c: Command) => {
      const r = parseAmount(text);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson({ ok: true, value: r.value });
      else process.stdout.write(String(r.value) + '\n');
    });
  cmd
    .command('date <date>')
    .description('Format yyyy-mm-dd as dd/MM/yyyy')
    .action((date: string, _opts, c: Command) => {
      const r = formatDate(date);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson({ ok: true, text: r.text });
      else process.stdout.write(r.text + '\n');
    });
}
