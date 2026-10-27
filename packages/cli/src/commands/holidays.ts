import { Command } from 'commander';
import {
  addWorkingDays,
  countWorkingDays,
  isWorkingDay,
  parseDateInput,
  publicHolidays,
} from '@vn-skills/core';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerHolidays(program: Command): void {
  const cmd = program
    .command('holidays')
    .description(
      'Official days off (nghỉ lễ, Tết, nghỉ bù) and working-day arithmetic for Vietnam',
    );

  cmd
    .command('year <year>')
    .description(
      'Days off of a year: the announced schedule, or the statutory days if not announced',
    )
    .action((year: string, _o, c: Command) => {
      const r = publicHolidays(Number(year));
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) return printJson(r);
      process.stdout.write(
        `${r.year}: ${r.announced ? 'announced' : 'NOT announced yet (statutory days only)'}\n`,
      );
      for (const d of r.daysOff)
        process.stdout.write(`${d.date}  ${d.name}${d.kind === 'holiday' ? '' : ` (${d.kind})`}\n`);
      for (const s of r.workingSaturdays) process.stdout.write(`${s}  working Saturday (swap)\n`);
      for (const p of r.pending) process.stdout.write(`pending: ${p.name}: ${p.note}\n`);
      for (const s of r.sources) process.stdout.write(`source: ${s.id} (${s.date}) ${s.url}\n`);
    });

  cmd
    .command('check <date>')
    .description('Is this date a working day? (dd/mm/yyyy or yyyy-mm-dd)')
    .action((date: string, _o, c: Command) => {
      const d = parseDateInput(date);
      if (!d.ok) failExit(c, d.error);
      const r = isWorkingDay(d.day, d.month, d.year);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) return printJson(r);
      process.stdout.write(
        kv([
          ['Date', r.date],
          ['Working day', r.working ? 'yes' : 'no'],
          ['Certain', r.certain ? 'yes' : 'no'],
          ['Reason', r.reason],
        ]) + '\n',
      );
    });

  cmd
    .command('add <date> <n>')
    .description('The date n working days after (or before, if n < 0) the given date')
    .action((date: string, n: string, _o, c: Command) => {
      const d = parseDateInput(date);
      if (!d.ok) failExit(c, d.error);
      const r = addWorkingDays(d.day, d.month, d.year, Number(n));
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) return printJson(r);
      process.stdout.write(
        `${r.date}${r.certain ? '' : '  (uncertain: crosses days not announced yet)'}\n`,
      );
    });

  cmd
    .command('count <from> <to>')
    .description('Working days in (from, to]: the start date is not counted, the end date is')
    .action((from: string, to: string, _o, c: Command) => {
      const a = parseDateInput(from);
      if (!a.ok) failExit(c, a.error);
      const b = parseDateInput(to);
      if (!b.ok) failExit(c, b.error);
      const r = countWorkingDays(a.day, a.month, a.year, b.day, b.month, b.year);
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) return printJson(r);
      process.stdout.write(
        `${r.workingDays} working days (${r.from} → ${r.to})${r.certain ? '' : '  (uncertain: crosses days not announced yet)'}\n`,
      );
    });
}
