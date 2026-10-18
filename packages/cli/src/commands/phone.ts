import { Command } from 'commander';
import { parsePhone } from '@vn-skills/core';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerPhone(program: Command): void {
  program
    .command('phone <number>')
    .description(
      'Normalise and classify a Vietnamese phone number (mobile carrier / landline area)',
    )
    .action((number: string, _o, c: Command) => {
      const r = parsePhone(number);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else
        process.stdout.write(
          kv([
            ['Formatted', r.formatted],
            ['E.164', r.e164],
            ['Type', r.type],
            ['Carrier', r.carrier],
            ['Area code', r.areaCode],
            ['Province', r.province],
            ['Province 2025', r.province2025],
            ['Converted from', r.convertedFrom],
          ]) + '\n',
        );
    });
}
