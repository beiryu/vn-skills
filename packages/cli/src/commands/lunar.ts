import { Command } from 'commander';
import {
  lunarInfo,
  lunarToSolar,
  parseDateInput,
  holidays,
  tetDate,
  yearCanChi,
  leapMonthOf,
} from '@vn-skills/core';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerLunar(program: Command): void {
  const cmd = program
    .command('lunar')
    .description('Vietnamese lunar calendar (âm lịch): conversions, can chi, holidays');

  cmd
    .command('from-solar <date>')
    .description('Solar (dd/mm/yyyy or yyyy-mm-dd) -> lunar date with can chi')
    .action((date: string, _o, c: Command) => {
      const d = parseDateInput(date);
      if (!d.ok) failExit(c, d.error);
      const r = lunarInfo(d.day, d.month, d.year);
      if (!r.ok) failExit(c, r.error);
      const { ok: _ok, ...rest } = r;
      if (wantsJson(c)) printJson({ ok: true, ...rest });
      else
        process.stdout.write(
          kv([
            ['Solar', `${r.solar.date} (${r.solar.weekday})`],
            ['Lunar', `${r.day}/${r.month}${r.leap ? ' (nhuận)' : ''}/${r.year}`],
            ['Text', r.text],
            ['Year', `${r.yearCanChi} (${r.zodiacEn})`],
            ['Month', r.monthCanChi],
            ['Day', r.dayCanChi],
            ['Solar term', r.solarTerm],
          ]) + '\n',
        );
    });

  cmd
    .command('to-solar <date>')
    .description('Lunar dd/mm/yyyy -> solar date')
    .option('--leap', 'the month is the leap (nhuận) month')
    .action((date: string, opts, c: Command) => {
      const d = parseDateInput(date);
      if (!d.ok) failExit(c, d.error);
      const r = lunarToSolar(d.day, d.month, d.year, Boolean(opts.leap));
      if (!r.ok) failExit(c, r.error);
      const iso = `${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`;
      if (wantsJson(c))
        printJson({
          ok: true,
          lunar: { day: d.day, month: d.month, year: d.year, leap: Boolean(opts.leap) },
          solar: { day: r.day, month: r.month, year: r.year, date: iso },
        });
      else process.stdout.write(`${iso}\n`);
    });

  cmd
    .command('holidays <year>')
    .description('Vietnamese holidays in a solar year (lunar ones resolved to solar dates)')
    .option('--public', 'public holidays only')
    .action((year: string, opts, c: Command) => {
      const y = Number(year);
      if (!Number.isInteger(y))
        failExit(c, { code: 'INVALID_YEAR', message: `Invalid year "${year}"` });
      const list = holidays(y, { publicOnly: Boolean(opts.public) });
      if (wantsJson(c)) printJson({ ok: true, year: y, count: list.length, holidays: list });
      else
        for (const h of list)
          process.stdout.write(
            `${h.date}  ${h.publicHoliday ? '*' : ' '} ${h.name}${h.lunar ? `  (${h.lunar.day}/${h.lunar.month} âm lịch)` : ''}\n`,
          );
    });

  cmd
    .command('tet <year>')
    .description('Date of Tết (lunar new year) for a year')
    .action((year: string, _o, c: Command) => {
      const r = tetDate(Number(year));
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson({ ...r, ok: true, leapMonth: leapMonthOf(Number(year)) });
      else process.stdout.write(`${r.date}  ${r.canChi} (${r.zodiacEn})\n`);
    });

  cmd
    .command('canchi <year>')
    .description('Can chi of a lunar year')
    .action((year: string, _o, c: Command) => {
      const y = Number(year);
      if (wantsJson(c))
        printJson({ ok: true, year: y, canChi: yearCanChi(y), leapMonth: leapMonthOf(y) });
      else process.stdout.write(`${yearCanChi(y)}\n`);
    });
}
