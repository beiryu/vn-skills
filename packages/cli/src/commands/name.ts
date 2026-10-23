import { Command } from 'commander';
import { initials, slugifyName, sortNames, splitName } from '@vn-skills/core';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerName(program: Command): void {
  const cmd = program
    .command('name')
    .description('Split, sort and slugify Vietnamese full names offline');
  cmd
    .command('split <fullName...>')
    .description('Split into họ / tên đệm / tên (quotes optional)')
    .action((words: string[], _o, c: Command) => {
      const r = splitName(words.join(' '));
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
    .command('slug <fullName...>')
    .description('Unaccented hyphenated slug (quotes optional)')
    .action((words: string[], _o, c: Command) => {
      const slug = slugifyName(words.join(' '));
      if (wantsJson(c)) printJson({ ok: true, slug });
      else process.stdout.write(`${slug}\n`);
    });
  cmd
    .command('initials <fullName...>')
    .description('Initials of each word (quotes optional)')
    .option('--ascii', 'strip diacritics')
    .action((words: string[], o: { ascii?: boolean }, c: Command) => {
      const fullName = words.join(' ');
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
