import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const triggers = JSON.parse(
  readFileSync(resolve(__dirname, 'golden', 'triggers.json'), 'utf8'),
) as Record<string, { vi: string[]; en: string[] }>;

function description(skill: string): string {
  const text = readFileSync(resolve(__dirname, '..', 'skills', skill, 'SKILL.md'), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const d = /^description:\s*(.*)$/m.exec(m![1]!);
  return d![1]!.replace(/^"(.*)"$/, '$1');
}

describe('SKILL.md descriptions keep their trigger keywords', () => {
  for (const [skill, kw] of Object.entries(triggers)) {
    describe(skill, () => {
      it('lists >= 5 keywords in both languages', () => {
        expect(kw.vi.length + kw.en.length).toBeGreaterThanOrEqual(5);
        expect(kw.vi.length).toBeGreaterThan(0);
        expect(kw.en.length).toBeGreaterThan(0);
      });
      for (const lang of ['vi', 'en'] as const) {
        for (const word of kw[lang]) {
          it(`description contains ${lang} keyword "${word}"`, () => {
            const ok = description(skill).toLowerCase().includes(word.toLowerCase());
            expect(
              ok,
              `skills/${skill}/SKILL.md description is missing ${lang} keyword "${word}"`,
            ).toBe(true);
          });
        }
      }
    });
  }
});
