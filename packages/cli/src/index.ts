import { Command } from 'commander';
import { VERSION } from '@vn-skills/core';
import { registerVietqr } from './commands/vietqr.js';
import { registerAddress } from './commands/address.js';
import { registerTaxid } from './commands/taxid.js';
import { registerId } from './commands/id.js';
import { registerName } from './commands/name.js';
import { registerMoney } from './commands/money.js';
import { registerNumfmt } from './commands/numfmt.js';
import { registerLunar } from './commands/lunar.js';
import { registerEinvoice } from './commands/einvoice.js';
import { registerPhone } from './commands/phone.js';
import { registerHolidays } from './commands/holidays.js';
import { registerInstall } from './commands/install.js';

const program = new Command();
program
  .name('vn-skills')
  .description(
    'Vietnam-specific helpers for coding agents: VietQR, addresses (34 provinces), tax IDs, money in words, lunar calendar, e-invoices, citizen IDs, phone numbers, names, number formatting, public holidays and working days.\nOutput is JSON when stdout is not a terminal (or with --json).',
  )
  .version(VERSION)
  .option('--json', 'always print JSON')
  .option('--pretty', 'always print human-readable text')
  .showHelpAfterError();

registerVietqr(program);
registerAddress(program);
registerTaxid(program);
registerId(program);
registerName(program);
registerMoney(program);
registerNumfmt(program);
registerLunar(program);
registerEinvoice(program);
registerPhone(program);
registerHolidays(program);
registerInstall(program);

// Commander reads "-5" as an option; move a negative `money words` amount behind `--`.
function moveNegativeMoneyAmount(argv: string[]): string[] {
  const i = argv.findIndex((a, k) => a === 'money' && argv[k + 1] === 'words');
  if (i < 0 || argv.includes('--', i)) return argv;
  const j = argv.findIndex((a, k) => k > i + 1 && /^-\d+$/.test(a));
  if (j < 0) return argv;
  return [...argv.slice(0, j), ...argv.slice(j + 1), '--', argv[j] as string];
}

program.parseAsync(moveNegativeMoneyAmount(process.argv)).catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
