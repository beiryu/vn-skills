import { Command } from 'commander';
import { parsePhone } from '@vn-skills/core';
import { runBulkFile, type BulkOpts } from '../bulk.js';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerPhone(program: Command): void {
  const cmd = program.command('phone').description('Normalise and classify phone numbers');
  cmd
    .command('parse-file <file>')
    .description(
      'Parse many phone numbers from a file ("-" = stdin): one per line (NDJSON out) or a CSV column (CSV out with valid, e164, carrier appended)',
    )
    .option('--csv', 'input is CSV with a header row; output is CSV with result columns appended')
    .option('--column <name>', 'CSV column holding the phone number (required with --csv)')
    .action((file: string, opts: BulkOpts, c: Command) => {
      runBulkFile(c, file, opts, ['e164', 'carrier'], (v) => {
        const r = parsePhone(v);
        return { result: r, cells: r.ok ? [r.e164, r.carrier ?? ''] : ['', ''] };
      });
    });
  cmd
    .command('number <number>', { isDefault: true, hidden: true })
    .description(
      'Normalise and classify a Vietnamese phone number (mobile carrier / landline area)',
    )
    .action((number: string, _o, c: Command) => {
      const r = parsePhone(number);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else
        process.stdout.write(
          kv([
            ['Formatted', r.formatted],
            ['E.164', r.e164],
            ['Type', r.type],
            ['Carrier', r.carrier],
            ['Area code', r.areaCode],
            ['Province', r.province],
            ['Province 2025', r.province2025],
            ['Converted from', r.convertedFrom],
            ['Warnings', r.warnings],
          ]) + '\n',
        );
    });
}
