import { type Result } from '../shared/result.js';
import { esc, fold, compact, nextDay, stamp } from '../shared/ics.js';
import { publicHolidays } from './index.js';

export interface HolidaysICS {
  year: number;
  announced: boolean;
  ics: string;
  events: number;
  warnings: string[];
}

export interface HolidaysICSOptions {
  /** Timestamp written to DTSTAMP; defaults to now. Pass a fixed value for deterministic output. */
  dtstamp?: Date;
  /** Add an event for each Saturday that is a working day because of a swap (default true). */
  includeWorkingSaturdays?: boolean;
}

/** Export a year's days off (publicHolidays) as an iCalendar (RFC 5545) file. Pure and offline. */
export function holidaysToICS(year: number, options: HolidaysICSOptions = {}): Result<HolidaysICS> {
  const p = publicHolidays(year);
  if (!p.ok) return p;
  const dtstamp = stamp(options.dtstamp ?? new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//vn-skills//vn-holidays//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(`Ngày nghỉ lễ ${year}`)}`,
  ];
  const event = (uid: string, date: string, summary: string, description?: string): void => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}@vn-skills`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(date)}`,
      `DTEND;VALUE=DATE:${nextDay(date)}`,
      `SUMMARY:${esc(summary)}`,
    );
    if (description) lines.push(`DESCRIPTION:${esc(description)}`);
    lines.push('TRANSP:TRANSPARENT', 'END:VEVENT');
  };
  const sources = p.announced ? p.sources.map((s) => s.url) : [];
  for (const d of p.daysOff) {
    const suffix =
      d.kind === 'compensatory' ? ' (nghỉ bù)' : d.kind === 'swapped' ? ' (hoán đổi)' : '';
    event(
      `${d.date}-${d.holiday}-${d.kind}`,
      d.date,
      `${d.name}${suffix}`,
      [d.nameEn, ...sources].join('\n'),
    );
  }
  let events = p.daysOff.length;
  if (options.includeWorkingSaturdays !== false) {
    for (const s of p.workingSaturdays) {
      event(`${s}-working-saturday`, s, 'Đi làm bù (thứ Bảy)');
      events++;
    }
  }
  lines.push('END:VCALENDAR');
  const warnings = p.pending.map(
    (x) => `${x.name}: date not announced yet, no event exported. ${x.note}`,
  );
  return {
    ok: true,
    year,
    announced: p.announced,
    ics: lines.flatMap(fold).join('\r\n') + '\r\n',
    events,
    warnings,
  };
}
