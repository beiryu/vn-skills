import { Command } from 'commander';
import { initials, slugifyName, sortNames, sortVietnamese, splitName } from '@vn-skills/core';
import { readTextInput } from '../input.js';
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
    .command('sort [items...]')
    .description(
      'Sort full names by tên (default) or whole strings (--text) with Vietnamese collation',
    )
    .option('--text', 'sort whole strings instead of by tên')
    .option('--file <path>', 'read one item per line from a file ("-" = stdin); implies --text')
    .option('--encoding <label>', 'input encoding (utf-8, windows-1258, utf-16le, utf-16be)')
    .action(
      (items: string[], o: { text?: boolean; file?: string; encoding?: string }, c: Command) => {
        let list = items;
        if (o.file !== undefined) {
          list = readTextInput(o.file, o.encoding, c)
            .split(/\r\n|\r|\n/)
            .filter((l) => l.trim() !== '');
        }
        if (list.length === 0)
          failExit(c, { code: 'MISSING_INPUT', message: 'Provide items or --file' });
        const sorted = o.text || o.file !== undefined ? sortVietnamese(list) : sortNames(list);
        if (wantsJson(c)) printJson({ ok: true, names: sorted });
        else process.stdout.write(sorted.join('\n') + '\n');
      },
    );
}
