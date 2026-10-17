import { Command } from 'commander';
import { initials, slugifyName, sortNames, splitName } from '@vn-skills/core';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerName(program: Command): void {
  const cmd = program
    .command('name')
    .description('Split, sort and slugify Vietnamese full names offline');
  cmd
    .command('split <fullName>')
    .description('Split into họ / tên đệm / tên')
    .action((fullName: string, _o, c: Command) => {
      const r = splitName(fullName);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else
        process.stdout.write(
          kv([
            ['Family', r.family],
            ['Middle', r.middle],
            ['Given', r.given],
          ]) + '\n',
        );
    });
  cmd
    .command('slug <fullName>')
    .description('Unaccented hyphenated slug')
    .action((fullName: string, _o, c: Command) => {
      const slug = slugifyName(fullName);
      if (wantsJson(c)) printJson({ ok: true, slug });
      else process.stdout.write(`${slug}\n`);
    });
  cmd
    .command('initials <fullName>')
    .description('Initials of each word')
    .option('--ascii', 'strip diacritics')
    .action((fullName: string, o: { ascii?: boolean }, c: Command) => {
      const value = initials(fullName, { ascii: o.ascii });
      if (wantsJson(c)) printJson({ ok: true, initials: value });
      else process.stdout.write(`${value}\n`);
    });
  cmd
    .command('sort <names...>')
    .description('Sort full names by tên with Vietnamese collation')
    .action((names: string[], _o, c: Command) => {
      const sorted = sortNames(names);
      if (wantsJson(c)) printJson({ ok: true, names: sorted });
      else process.stdout.write(sorted.join('\n') + '\n');
    });
}
