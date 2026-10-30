import { Command } from 'commander';
import {
  lunarInfo,
  hourInfo,
  lunarMonthCalendar,
  lunarToSolar,
  parseDateInput,
  parseVietnameseDate,
  holidays,
  tetInfo,
  canChiOfYear,
} from '@vn-skills/core';
import { failExit, kv, printJson, wantsJson } from '../output.js';

export function registerLunar(program: Command): void {
  const cmd = program
    .command('lunar')
    .description('Vietnamese lunar calendar (âm lịch): conversions, can chi, holidays');

  cmd
    .command('from-solar <date>')
    .description('Solar (dd/mm/yyyy or yyyy-mm-dd) -> lunar date with can chi')
    .option('--hour <0-23>', 'birth hour: adds hourCanChi, hourBranch, hourRange')
    .action((date: string, opts, c: Command) => {
      const d = parseDateInput(date);
      if (!d.ok) failExit(c, d.error);
      const r = lunarInfo(d.day, d.month, d.year);
      if (!r.ok) failExit(c, r.error);
      let hour: { hourCanChi: string; hourBranch: string; hourRange: string } | undefined;
      if (opts.hour !== undefined) {
        const h = /^-?\d+$/.test(String(opts.hour).trim()) ? Number(opts.hour) : NaN;
        const hi = hourInfo(d.day, d.month, d.year, h);
        if (!hi.ok) failExit(c, { ...hi.error, message: `Invalid hour "${opts.hour}"` });
        else hour = { hourCanChi: hi.canChi, hourBranch: hi.branch, hourRange: hi.range };
      }
      const { ok: _ok, ...base } = r;
      const rest = { ...base, ...hour };
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
            ...(hour
              ? ([['Hour', `${hour.hourCanChi} (${hour.hourRange})`]] as [string, string][])
              : []),
          ]) + '\n',
        );
    });

  cmd
    .command('parse <text>')
    .description('Vietnamese date phrase (e.g. "rằm tháng Giêng năm sau") -> solar date')
    .option('--ref <date>', 'reference date yyyy-mm-dd (default: today, UTC+7)')
    .action((text: string, opts, c: Command) => {
      const r = parseVietnameseDate(text, { ref: opts.ref });
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else process.stdout.write(`${r.solar}\n`);
    });

  cmd
    .command('month <month>')
    .description('Month calendar (mm/yyyy or yyyy-mm): lunar dates, can chi, solar terms, holidays')
    .action((arg: string, _o, c: Command) => {
      const m = /^(\d{1,2})[/-](\d{4})$/.exec(arg.trim()) ?? /^(\d{4})-(\d{1,2})$/.exec(arg.trim());
      if (!m)
        failExit(c, {
          code: 'INVALID_DATE',
          message: `Cannot parse month "${arg}"`,
          hint: 'Use mm/yyyy or yyyy-mm.',
        });
      const iso = /^\d{4}/.test(m[1]!);
      const r = lunarMonthCalendar(Number(iso ? m[2] : m[1]), Number(iso ? m[1] : m[2]));
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else
        for (const d of r.days) {
          const l = `${d.lunar.day}/${d.lunar.month}${d.lunar.leap ? 'n' : ''}`;
          const extra = [d.solarTerm, ...d.holidays].filter(Boolean).join('; ');
          process.stdout.write(
            `${d.date}  ${d.weekday.padEnd(9)}  ${l.padEnd(6)}  ${d.dayCanChi.padEnd(9)}${extra ? `  ${extra}` : ''}\n`,
          );
        }
    });

  cmd
    .command('to-solar <date>')
    .description('Lunar dd/mm/yyyy -> solar date')
    .option('--leap', 'the month is the leap (nhuận) month')
    .action((date: string, opts, c: Command) => {
      const d = parseDateInput(date, { lunar: true });
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
      const r = tetInfo(Number(year));
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else process.stdout.write(`${r.date}  ${r.canChi} (${r.zodiacEn})\n`);
    });

  cmd
    .command('canchi <year>')
    .description('Can chi of a lunar year')
    .action((year: string, _o, c: Command) => {
      const r = canChiOfYear(Number(year));
      if (!r.ok) failExit(c, r.error);
      if (wantsJson(c)) printJson(r);
      else process.stdout.write(`${r.canChi}\n`);
    });
}
