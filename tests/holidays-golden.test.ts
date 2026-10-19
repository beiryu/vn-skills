import { describe, expect, it } from 'vitest';
import { addWorkingDays, isWorkingDay, publicHolidays } from '@vn-skills/core';
import { loadGolden, title } from './golden.js';

type Dmy = [day: number, month: number, year: number];

const golden = loadGolden<{
  daysOff: Array<{ name?: string; input: number; expected: string[] }>;
  publicHolidays: Array<{ name?: string; input: number; expected: Record<string, unknown> }>;
  isWorkingDay: Array<{ name?: string; input: Dmy; expected: Record<string, unknown> }>;
  addWorkingDays: Array<{
    name?: string;
    input: [...Dmy, n: number];
    expected: Record<string, unknown>;
  }>;
}>('vn-holidays');

describe('vn-holidays golden', () => {
  describe("days off match each year's notice", () => {
    for (const c of golden.daysOff)
      it(title(c), () => {
        const r = publicHolidays(c.input);
        expect(r.ok && r.daysOff.map((d) => d.date)).toEqual(c.expected);
      });
  });
  describe('publicHolidays', () => {
    for (const c of golden.publicHolidays)
      it(title(c), () => expect(publicHolidays(c.input)).toMatchObject(c.expected));
  });
  describe('isWorkingDay', () => {
    for (const c of golden.isWorkingDay)
      it(title(c), () => expect(isWorkingDay(...c.input)).toMatchObject(c.expected));
  });
  describe('addWorkingDays', () => {
    for (const c of golden.addWorkingDays)
      it(title(c), () => expect(addWorkingDays(...c.input)).toMatchObject(c.expected));
  });
});
