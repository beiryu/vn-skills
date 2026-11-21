import { type Result } from '../shared/result.js';
import { esc, fold, compact, nextDay, stamp } from '../shared/ics.js';
import {
  lunarObservanceDates,
  type LunarObservanceOptions,
  type LunarObservanceRow,
} from './index.js';

export interface LunarObservancesICSOptions extends LunarObservanceOptions {
  /** Timestamp written to DTSTAMP; defaults to now. Pass a fixed value for deterministic output. */
  dtstamp?: Date;
}

/** Export mùng 1 / rằm (or other lunar days) as an iCalendar (RFC 5545) file. Pure and offline. */
export function lunarObservancesToICS(
  options: LunarObservancesICSOptions = {},
): Result<{ ics: string; events: number; rows: LunarObservanceRow[]; warnings: string[] }> {
  const r = lunarObservanceDates(options);
  if (!r.ok) return r;
  const dtstamp = stamp(options.dtstamp ?? new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//vn-skills//vn-lunar//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc('Lịch âm: mùng 1 và rằm')}`,
  ];
  for (const { solar, lunar, text } of r.rows) {
    const uid = `lunar-${lunar.year}-${String(lunar.month).padStart(2, '0')}${lunar.leap ? '-leap' : ''}-${String(lunar.day).padStart(2, '0')}@vn-skills`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(solar)}`,
      `DTEND;VALUE=DATE:${nextDay(solar)}`,
      `SUMMARY:${esc(text)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return {
    ok: true,
    ics: lines.flatMap(fold).join('\r\n') + '\r\n',
    events: r.rows.length,
    rows: r.rows,
    warnings: r.warnings,
  };
}
