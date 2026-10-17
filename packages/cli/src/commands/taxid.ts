import { Command } from 'commander';
import { validateTaxId, taxIdCheckDigitResult } from '@vn-skills/core';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerTaxid(program: Command): void {
  const cmd = program
    .command('taxid')
    .description('Validate Vietnamese tax IDs (mã số thuế) offline');
  cmd
    .command('validate <mst>')
    .description('Check format and check digit of a 10/13-digit tax ID')
    .action((mst: string, _o, c: Command) => {
      const r = validateTaxId(mst);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson({ ...r, ok: true, valid: true });
      else
        process.stdout.write(
          kv([
            ['Tax ID', r.formatted],
            ['Kind', r.kind],
            ['Root', r.root],
            ['Branch', r.branch],
            ['Checksum', r.checksumValid === null ? 'n/a' : 'valid'],
          ]) + '\n',
        );
      for (const w of r.warnings) process.stderr.write(`warning: ${w}\n`);
    });
  cmd
    .command('check-digit <first9>')
    .description('Compute the 10th digit for the first 9 digits')
    .action((first9: string, _o, c: Command) => {
      const r = taxIdCheckDigitResult(first9);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else
        process.stdout.write(
          r.taxId === null ? 'No valid check digit exists for this sequence\n' : `${r.taxId}\n`,
        );
    });
}
