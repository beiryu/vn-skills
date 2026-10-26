import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import {
  convertAddress,
  convertAddresses,
  lookupProvince,
  provincesList,
  parseAddress,
  searchWards,
} from '@vn-skills/core';
import { parseCsv, toCsv } from '../csv.js';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerAddress(program: Command): void {
  const cmd = program
    .command('address')
    .description(
      'Parse, normalise and convert Vietnamese addresses (34 provinces since 01/07/2025)',
    );

  cmd
    .command('parse <text...>')
    .description('Parse free-text address into province / ward / street (quotes optional)')
    .option('--legacy', 'use the pre-2025 catalogue (63 provinces, districts)')
    .option('--new', 'use only the current catalogue (34 provinces)')
    .action((words: string[], opts, c: Command) => {
      const r = parseAddress(words.join(' '), {
        mode: opts.legacy ? 'legacy' : opts.new ? 'from2025' : 'auto',
      });
      if (!r.ok) failExit(c, r.error);
      const result =
        r.mode === 'from2025'
          ? {
              ok: true,
              mode: r.mode,
              province: r.province && {
                code: r.province.code,
                name: r.province.name,
                fullName: r.province.fullName,
              },
              ward: r.ward && {
                code: r.ward.code,
                name: r.ward.name,
                fullName: r.ward.fullName,
                type: r.ward.type,
                postalCode: r.ward.postalCode,
              },
              street: r.street,
              formatted: r.formatted,
              confidence: r.confidence,
              matches: r.matches,
              warnings: r.warnings,
            }
          : {
              ok: true,
              mode: r.mode,
              province: r.province && {
                code: r.province.code,
                name: r.province.name,
                fullName: r.province.fullName,
              },
              district: r.district && {
                code: r.district.code,
                name: r.district.name,
                fullName: r.district.fullName,
              },
              ward: r.ward && {
                code: r.ward.code,
                name: r.ward.name,
                fullName: r.ward.fullName,
                type: r.ward.type,
              },
              street: r.street,
              formatted: r.formatted,
              confidence: r.confidence,
              matches: r.matches,
              warnings: r.warnings,
            };
      if (wantsJson(c)) printJson(result);
      else {
        process.stdout.write(
          kv([
            ['Mode', r.mode],
            ['Formatted', r.formatted],
            ['Confidence', r.confidence.toFixed(2)],
          ]) + '\n',
        );
        for (const w of r.warnings) process.stderr.write(`warning: ${w}\n`);
      }
    });

  cmd
    .command('convert <text...>')
    .description(
      'Convert a pre-2025 address (province/district/ward) to the new 2-level structure (quotes optional)',
    )
    .action((words: string[], _o, c: Command) => {
      const r = convertAddress(words.join(' '));
      if (!r.ok) failExit(c, r.error);
      const result = {
        ok: true,
        input: r.input,
        mappingType: r.mappingType,
        old: {
          province: r.old.province?.fullName,
          district: r.old.district?.fullName,
          ward: r.old.ward?.fullName,
          street: r.old.street,
          formatted: r.old.formatted,
        },
        new: {
          province: { code: r.new.province.code, fullName: r.new.province.fullName },
          ward: r.new.ward && {
            code: r.new.ward.code,
            fullName: r.new.ward.fullName,
            postalCode: r.new.ward.postalCode,
          },
          street: r.new.street,
          formatted: r.new.formatted,
        },
        candidates: r.candidates.map((x) => ({
          code: x.ward.code,
          fullName: x.ward.fullName,
          province: x.province.fullName,
          isDefault: x.isDefault,
        })),
        confidence: r.confidence,
        warnings: r.warnings,
      };
      if (wantsJson(c)) printJson(result);
      else {
        process.stdout.write(
          kv([
            ['Old', r.old.formatted],
            ['New', r.new.formatted],
            ['Type', r.mappingType],
            ['Confidence', r.confidence.toFixed(2)],
          ]) + '\n',
        );
        if (r.candidates.length > 1)
          process.stdout.write(
            'Candidates: ' +
              r.candidates
                .map((x) => `${x.ward.fullName}${x.isDefault ? ' (default)' : ''}`)
                .join(' | ') +
              '\n',
          );
        for (const w of r.warnings) process.stderr.write(`warning: ${w}\n`);
      }
    });

  cmd
    .command('convert-file <file>')
    .description(
      'Convert many pre-2025 addresses from a file ("-" = stdin): one per line (NDJSON out) or a CSV column',
    )
    .option('--csv', 'input is CSV with a header row; output is CSV with result columns appended')
    .option('--column <name>', 'CSV column holding the address (required with --csv)')
    .action((file: string, opts: { csv?: boolean; column?: string }, c: Command) => {
      if (opts.csv && !opts.column)
        failExit(c, {
          code: 'MISSING_COLUMN',
          message: '--csv requires --column <name> (the address column)',
          hint: 'Pass --column <name> with the CSV header of the address column.',
        });
      let text: string;
      try {
        text = file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
      } catch (e) {
        return failExit(c, {
          code: 'READ_ERROR',
          message: `cannot read ${file}: ${(e as Error).message}`,
          hint: 'Check the path and permissions, or pass "-" to read stdin.',
        });
      }
      let ok = 0;
      let failed = 0;
      if (opts.csv) {
        const rows = parseCsv(text);
        const header = rows[0] ?? [];
        const idx = header.indexOf(opts.column as string);
        if (idx < 0)
          failExit(c, {
            code: 'COLUMN_NOT_FOUND',
            message: `column "${opts.column}" not found in CSV header`,
            hint: `Available columns: ${header.join(', ')}`,
          });
        const out: string[][] = [
          [
            ...header,
            'new_address',
            'new_ward_code',
            'new_province_code',
            'mapping_type',
            'confidence',
            'warnings',
          ],
        ];
        for (const row of rows.slice(1)) {
          const r = convertAddress(row[idx] ?? '');
          if (r.ok) {
            ok++;
            out.push([
              ...row,
              r.new.formatted,
              r.new.ward?.code ?? '',
              r.new.province.code,
              r.mappingType,
              String(r.confidence),
              r.warnings.join('; '),
            ]);
          } else {
            failed++;
            out.push([...row, '', '', '', '', '', `error: ${r.error.message}`]);
          }
        }
        process.stdout.write(toCsv(out));
      } else {
        text.split(/\r?\n/).forEach((raw, i) => {
          const input = raw.trim();
          if (input === '') return;
          const line = i + 1;
          const res = convertAddresses([input]);
          const row = res.ok ? res.results[0] : undefined;
          if (!row || !row.ok) {
            failed++;
            const error = row ? row.error : !res.ok ? res.error : undefined;
            process.stdout.write(JSON.stringify({ ok: false, line, input, error }) + '\n');
            return;
          }
          ok++;
          const { index: _i, input: _in, ok: _ok, ...fields } = row;
          process.stdout.write(
            JSON.stringify({ ok: true, line, input: row.input, ...fields }) + '\n',
          );
        });
      }
      if (failed > 0) {
        process.stderr.write(`converted ${ok}, failed ${failed}\n`);
        process.exitCode = 2;
      }
    });

  cmd
    .command('provinces')
    .description('List the 34 current provinces')
    .action((_o, c: Command) => {
      const r = provincesList();
      if (wantsJson(c)) printJson(r);
      else
        for (const p of r.provinces)
          process.stdout.write(
            `${p.code}  ${p.fullName.padEnd(32)} ${String(p.wards).padStart(4)} wards\n`,
          );
    });

  cmd
    .command('wards <query...>')
    .description('Search current wards by name, optionally within a province (quotes optional)')
    .option('-p, --province <province>', 'restrict to a province')
    .option('-l, --limit <n>', 'max results', '10')
    .action((words: string[], opts, c: Command) => {
      const list = searchWards(words.join(' '), opts.province, Number(opts.limit));
      const rows = list.map((x) => ({
        code: x.ward.code,
        fullName: x.ward.fullName,
        province: x.province.fullName,
        postalCode: x.ward.postalCode,
        score: x.score,
      }));
      if (wantsJson(c)) printJson({ ok: true, count: rows.length, wards: rows });
      else
        for (const r of rows)
          process.stdout.write(
            `${r.code}  ${r.fullName.padEnd(32)} ${r.province}  (${r.score.toFixed(2)})\n`,
          );
    });

  cmd
    .command('province <query...>')
    .description('Look up one current province by name/alias/code (quotes optional)')
    .action((words: string[], _o, c: Command) => {
      const result = lookupProvince(words.join(' '));
      if (!result.ok) failExit(c, result.error);
      if (wantsJson(c)) printJson(result);
      else process.stdout.write(kv(Object.entries(result).filter(([k]) => k !== 'ok')) + '\n');
    });
}
