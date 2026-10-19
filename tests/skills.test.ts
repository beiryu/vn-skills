import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadGolden } from './golden.js';

const SKILLS_DIR = resolve(__dirname, '..', 'skills');
const dirs = readdirSync(SKILLS_DIR).filter((d) => statSync(join(SKILLS_DIR, d)).isDirectory());

function frontmatter(text: string): { fields: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error('missing frontmatter');
  const fields: Record<string, string> = {};
  let current: string | undefined;
  for (const line of m[1]!.split('\n')) {
    const kv = /^([a-zA-Z-]+):\s*(.*)$/.exec(line);
    if (kv && !line.startsWith(' ')) {
      current = kv[1]!;
      fields[current] = kv[2]!.replace(/^"(.*)"$/, '$1');
    } else if (current && line.startsWith(' ')) {
      fields[current] = (fields[current] ?? '') + '\n' + line.trim();
    }
  }
  return { fields, body: m[2]! };
}

describe('skills/ follow the Agent Skills spec', () => {
  it('has the expected skills', () => {
    expect(dirs.sort()).toEqual([
      'vietqr',
      'vn-address',
      'vn-einvoice',
      'vn-holidays',
      'vn-id',
      'vn-lunar',
      'vn-money-words',
      'vn-name',
      'vn-number-format',
      'vn-phone',
      'vn-tax-id',
    ]);
  });
  for (const dir of dirs) {
    describe(dir, () => {
      const path = join(SKILLS_DIR, dir, 'SKILL.md');
      it('has SKILL.md with valid frontmatter', () => {
        expect(existsSync(path)).toBe(true);
        const { fields } = frontmatter(readFileSync(path, 'utf8'));
        expect(fields.name).toBe(dir);
        expect(fields.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(fields.name!.length).toBeLessThanOrEqual(64);
        expect(fields.description!.length).toBeGreaterThan(20);
        expect(fields.description!.length).toBeLessThanOrEqual(1024);
        expect(fields.license).toBe('MIT');
      });
      it('body is under 500 lines and mentions the CLI', () => {
        const { body } = frontmatter(readFileSync(path, 'utf8'));
        expect(body.split('\n').length).toBeLessThan(500);
        expect(body).toContain('npx -y @vn-skills/cli');
      });
      it('referenced files exist', () => {
        const text = readFileSync(path, 'utf8');
        for (const m of text.matchAll(/\]\((references\/[^)]+)\)/g)) {
          expect(existsSync(join(SKILLS_DIR, dir, m[1]!)), m[1]).toBe(true);
        }
      });
      it('has golden fixtures with at least 20 cases', () => {
        const groups = Object.values(loadGolden<Record<string, unknown>>(dir));
        const count = groups.reduce<number>((n, g) => n + (Array.isArray(g) ? g.length : 0), 0);
        expect(count).toBeGreaterThanOrEqual(20);
      });
    });
  }
});

describe('PR lint', () => {
  it('accepts every skill name as a scope', () => {
    const lint = readFileSync(
      resolve(__dirname, '..', '.github', 'workflows', 'pr-lint.yml'),
      'utf8',
    );
    const block = /scopes: \|\n((?:\s+[\w-]+\n)+)/.exec(lint);
    const scopes = new Set(
      (block?.[1] ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    expect(dirs.filter((d) => !scopes.has(d))).toEqual([]);
  });
});
