import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const FILES = {
  marketplace: join(ROOT, '.claude-plugin', 'marketplace.json'),
  plugin: join(ROOT, '.claude-plugin', 'plugin.json'),
  mcp: join(ROOT, '.mcp.json'),
};

function read(path: string): string {
  return readFileSync(path, 'utf8');
}
function json(path: string): any {
  return JSON.parse(read(path));
}

describe('Claude Code plugin marketplace', () => {
  for (const [name, path] of Object.entries(FILES)) {
    it(`${name} file exists, is valid JSON and ends with a newline`, () => {
      expect(existsSync(path)).toBe(true);
      const text = read(path);
      expect(text.endsWith('\n')).toBe(true);
      expect(() => JSON.parse(text)).not.toThrow();
    });
  }

  it('marketplace lists the vn-skills plugin at the repo root', () => {
    const m = json(FILES.marketplace);
    expect(m.name).toBe('vn-skills');
    expect(m.owner.name).toBe('beiryu');
    const entry = m.plugins.find((p: { name: string }) => p.name === 'vn-skills');
    expect(entry).toBeDefined();
    expect(resolve(ROOT, entry.source)).toBe(ROOT);
    expect(typeof entry.description).toBe('string');
    expect(entry.description.length).toBeGreaterThan(0);
  });

  it('plugin.json has metadata and no version', () => {
    const p = json(FILES.plugin);
    expect(p.name).toBe('vn-skills');
    expect(p.description).toBeTruthy();
    expect(p.author).toBeTruthy();
    expect(p.license).toBe('MIT');
    expect(p.homepage).toBe('https://github.com/beiryu/vn-skills');
    expect(p.repository).toBe('https://github.com/beiryu/vn-skills');
    expect(p).not.toHaveProperty('version');
  });

  it('every folder in skills/ has a SKILL.md', () => {
    const dir = join(ROOT, 'skills');
    const dirs = readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory());
    expect(dirs.length).toBeGreaterThan(0);
    for (const d of dirs) expect(existsSync(join(dir, d, 'SKILL.md'))).toBe(true);
  });

  it('.mcp.json runs npx -y @vn-skills/mcp', () => {
    const s = json(FILES.mcp).mcpServers['vn-skills'];
    expect(s.command).toBe('npx');
    expect(s.args).toEqual(['-y', '@vn-skills/mcp']);
  });

  for (const readme of ['README.md', 'README.vi.md']) {
    it(`${readme} documents the plugin install commands`, () => {
      const text = read(join(ROOT, readme));
      expect(text).toContain('/plugin marketplace add beiryu/vn-skills');
      expect(text).toContain('/plugin install vn-skills@vn-skills');
    });
  }
});
