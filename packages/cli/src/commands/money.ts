import { Command } from 'commander';
import { moneyToWords, numberToWords } from '@vn-skills/core';
import { failExit, printJson, wantsJson } from '../output.js';

export function registerMoney(program: Command): void {
  const cmd = program.command('money').description('Read VND amounts in Vietnamese words');
  cmd
    .command('words <amount>')
    .description(
      'Convert an integer amount to words, e.g. 1200000 -> "một triệu hai trăm nghìn đồng"',
    )
    .option('--thousand <word>', '"nghìn" (default) or "ngàn"')
    .option('--odd <word>', '"lẻ" (default) or "linh"')
    .option('-u, --unit <unit>', 'unit word (default "đồng"); use "" for none')
    .option('--no-tu', 'read 4 as "bốn" instead of "tư" in 24, 34, ...')
    .option('-c, --capitalize', 'capitalize the first letter')
    .option('--chan', 'append "chẵn" for round amounts')
    .option('--plain', 'read a plain number without a unit, e.g. 30 -> "ba mươi"')
    .addHelpText(
      'after',
      '\nNegative amounts: vn-skills money words -5 (or, explicitly, vn-skills money words -- -5)',
    )
    .action((amount: string, opts, c: Command) => {
      if (opts.plain && (opts.unit !== undefined || opts.chan)) {
        c.error('error: --plain cannot be combined with --unit or --chan');
      }
      const common = {
        thousand: opts.thousand,
        odd: opts.odd,
        useTu: opts.tu,
        capitalize: opts.capitalize,
      };
      const r = opts.plain
        ? numberToWords(amount, common)
        : moneyToWords(amount, { ...common, unit: opts.unit, chan: opts.chan });
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson({ ok: true, amount: r.amount, words: r.words });
      else process.stdout.write(r.words + '\n');
    });
}
