import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string): string => readFileSync(resolve(ROOT, p), 'utf8');

const server = read('packages/mcp/src/server.ts');
const registered = [...server.matchAll(/registerTool\(\s*'([a-z_]+)'/g)].map((m) => m[1]!);

describe.each(['README.md', 'README.vi.md'])('%s', (file) => {
  const text = read(file);

  it('lists every MCP tool registered in server.ts', () => {
    expect(registered.length).toBeGreaterThan(0);
    const missing = registered.filter((t) => !text.includes('`' + t + '`'));
    expect(missing).toEqual([]);
  });

  it('has a vn-id row in the skills table', () => {
    expect(text).toMatch(/^\|\s*\[`vn-id`\]\(skills\/vn-id\/SKILL\.md\)/m);
    expect(text).toContain('vn-skills id parse');
  });

  it('roadmap blurb only lists work that is not done', () => {
    const section = /^## (?:Roadmap|Lộ trình)\n([\s\S]*?)(?=^## )/m.exec(text)![1]!;
    expect(section).toContain('Python');
    expect(section).not.toContain('`vn-holidays`');
    expect(section).not.toContain('`vn-id`');
    expect(section).not.toContain('`vn-phone`');
    expect(section).not.toContain('vn-skills install');
  });
});

describe('@vn-skills/mcp npm metadata', () => {
  const pkg = JSON.parse(read('packages/mcp/package.json')) as {
    description?: string;
    keywords?: string[];
  };

  it('has a description', () => {
    expect((pkg.description ?? '').length).toBeGreaterThan(20);
  });

  it.each(['mcp', 'vietnam', 'vietqr'])('has the "%s" keyword', (kw) => {
    expect(pkg.keywords ?? []).toContain(kw);
  });
});
