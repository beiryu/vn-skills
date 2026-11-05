import { Command } from 'commander';
import { parseCitizenId } from '@vn-skills/core';
import { runBulkFile, type BulkOpts } from '../bulk.js';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerId(program: Command): void {
  const cmd = program
    .command('id')
    .description('Decode Vietnamese citizen IDs (CCCD/CMND) offline');
  cmd
    .command('parse <id>')
    .description('Validate format and decode a 12-digit CCCD or 9-digit CMND')
    .action((id: string, _o, c: Command) => {
      const r = parseCitizenId(id);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else if (r.kind === 'cmnd')
        process.stdout.write(
          kv([
            ['ID', r.normalized],
            ['Kind', 'cmnd'],
          ]) + '\n',
        );
      else
        process.stdout.write(
          kv([
            ['ID', r.normalized],
            ['Kind', r.kind],
            ['Province code', r.provinceCode],
            ['Province', r.province?.fullName ?? 'unknown'],
            ['Province (2025)', r.newProvince?.fullName ?? 'unknown'],
            ['Sex', r.sex],
            ['Birth year', r.birthYear],
          ]) + '\n',
        );
      if (!wantsJson(c)) for (const w of r.warnings) process.stderr.write(`warning: ${w}\n`);
    });
  cmd
    .command('parse-file <file>')
    .description(
      'Parse many CCCD/CMND numbers from a file ("-" = stdin): one per line (NDJSON out) or a CSV column (CSV out with valid, province, birthYear appended)',
    )
    .option('--csv', 'input is CSV with a header row; output is CSV with result columns appended')
    .option('--column <name>', 'CSV column holding the ID number (required with --csv)')
    .action((file: string, opts: BulkOpts, c: Command) => {
      runBulkFile(c, file, opts, ['province', 'birthYear'], (v) => {
        const r = parseCitizenId(v);
        const cells =
          r.ok && r.kind !== 'cmnd' ? [r.province?.fullName ?? '', String(r.birthYear)] : ['', ''];
        return { result: r, cells };
      });
    });
}
