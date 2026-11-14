import type { Command } from 'commander';
import { parseCsv, toCsv } from './csv.js';
import { readTextInput } from './input.js';
import { failExit, wantsJson } from './output.js';

export interface BulkOpts {
  csv?: boolean;
  column?: string;
  encoding?: string;
}

export interface BulkCheck {
  /** The core result, written as-is into NDJSON rows. */
  result: { ok: boolean };
  /** Cell values for the extra CSV columns, in order. */
  cells: string[];
}

/** Shared "one value per line or one CSV column" driver for the bulk validate/parse commands. */
export function runBulkFile(
  c: Command,
  file: string,
  opts: BulkOpts,
  extraColumns: string[],
  check: (value: string) => BulkCheck,
): void {
  if (opts.csv && !opts.column)
    failExit(c, {
      code: 'MISSING_COLUMN',
      message: '--csv requires --column <name>',
      hint: 'Pass --column <name> with the CSV header of the column to check.',
    });
  const text = readTextInput(file, opts.encoding, c);
  let valid = 0;
  let invalid = 0;
  if (opts.csv) {
    const rows = parseCsv(text);
    const header = rows[0] ?? [];
    const idx = header.indexOf(opts.column!);
    if (idx < 0)
      failExit(c, {
        code: 'COLUMN_NOT_FOUND',
        message: `column "${opts.column}" not found in CSV header`,
        hint: `Available columns: ${header.join(', ')}`,
      });
    const out: string[][] = [[...header, 'valid', ...extraColumns]];
    for (const row of rows.slice(1)) {
      const r = check((row[idx] ?? '').trim());
      if (r.result.ok) valid++;
      else invalid++;
      out.push([...row, String(r.result.ok), ...r.cells]);
    }
    process.stdout.write(toCsv(out));
  } else {
    text.split(/\r?\n/).forEach((raw, i) => {
      const input = raw.trim();
      if (input === '') return;
      const r = check(input);
      if (r.result.ok) valid++;
      else invalid++;
      process.stdout.write(JSON.stringify({ line: i + 1, input, ...r.result }) + '\n');
    });
  }
  if (wantsJson(c))
    process.stderr.write(JSON.stringify({ total: valid + invalid, valid, invalid }) + '\n');
  else if (invalid > 0) process.stderr.write(`valid ${valid}, invalid ${invalid}\n`);
  if (invalid > 0) process.exitCode = 2;
}
