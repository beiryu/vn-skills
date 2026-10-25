import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string): string => readFileSync(resolve(ROOT, p), 'utf8');

describe('Dockerfile', () => {
  it('exists at the repo root and ends with a newline', () => {
    expect(existsSync(resolve(ROOT, 'Dockerfile'))).toBe(true);
    expect(read('Dockerfile').endsWith('\n')).toBe(true);
  });

  it('uses a Node 22 base image', () => {
    expect(read('Dockerfile')).toMatch(/^FROM node:22/m);
  });

  it('builds the workspace with corepack, a frozen lockfile and pnpm build', () => {
    const text = read('Dockerfile');
    expect(text).toContain('corepack enable');
    expect(text).toContain('pnpm install --frozen-lockfile');
    expect(text).toMatch(/pnpm (run )?build/);
  });

  it('has a separate runtime stage', () => {
    const froms = read('Dockerfile').match(/^FROM /gm) ?? [];
    expect(froms.length).toBeGreaterThanOrEqual(2);
  });

  it('runs as a non-root user', () => {
    const users = [...read('Dockerfile').matchAll(/^USER\s+(\S+)/gm)].map((m) => m[1]);
    expect(users.length).toBeGreaterThan(0);
    expect(['root', '0']).not.toContain(users[users.length - 1]);
  });

  it('has the stdio MCP server as entrypoint and exposes no ports', () => {
    const text = read('Dockerfile');
    expect(text).toMatch(/^ENTRYPOINT \["node", "packages\/mcp\/dist\/index\.js"\]/m);
    expect(text).not.toMatch(/^EXPOSE/m);
  });
});

describe('.dockerignore', () => {
  it('exists, excludes node_modules, .git and dist, and ends with a newline', () => {
    expect(existsSync(resolve(ROOT, '.dockerignore'))).toBe(true);
    const text = read('.dockerignore');
    expect(text.endsWith('\n')).toBe(true);
    const lines = text.split('\n').map((l) => l.trim());
    expect(lines.some((l) => /^\**\/?node_modules\/?$/.test(l))).toBe(true);
    expect(lines.some((l) => /^\.git\/?$/.test(l))).toBe(true);
    expect(lines.some((l) => /^\**\/?dist\/?$/.test(l))).toBe(true);
  });
});

describe.each(['README.md', 'README.vi.md'])('%s Docker section', (file) => {
  const text = read(file);

  it('documents docker build and docker run under MCP client setup', () => {
    expect(text).toContain('docker build -t vn-skills-mcp .');
    expect(text).toContain('docker run -i --rm vn-skills-mcp');
    expect(text).toMatch(/^#{3,4} Docker\s*$/m);
  });
});
