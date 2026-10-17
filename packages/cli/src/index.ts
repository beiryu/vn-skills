import { Command } from 'commander';
import { VERSION } from '@vn-skills/core';
import { registerVietqr } from './commands/vietqr.js';
import { registerAddress } from './commands/address.js';
import { registerTaxid } from './commands/taxid.js';
import { registerMoney } from './commands/money.js';
import { registerNumfmt } from './commands/numfmt.js';
import { registerLunar } from './commands/lunar.js';
import { registerEinvoice } from './commands/einvoice.js';
import { registerInstall } from './commands/install.js';

const program = new Command();
program
  .name('vn-skills')
  .description(
    'Vietnam-specific helpers for coding agents: VietQR, addresses (34 provinces), tax IDs, money in words, lunar calendar, e-invoices.\nOutput is JSON when stdout is not a terminal (or with --json).',
  )
  .version(VERSION)
  .option('--json', 'always print JSON')
  .option('--pretty', 'always print human-readable text')
  .showHelpAfterError();

registerVietqr(program);
registerAddress(program);
registerTaxid(program);
registerMoney(program);
registerNumfmt(program);
registerLunar(program);
registerEinvoice(program);
registerInstall(program);

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
