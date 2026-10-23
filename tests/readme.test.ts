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

describe.each([
  ['README.md', 'docs/quickstart.md'],
  ['README.vi.md', 'docs/quickstart.vi.md'],
])('%s quickstart', (readme, quickstart) => {
  it('links to the quickstart near the top', () => {
    const top = read(readme).split('\n').slice(0, 30).join('\n');
    expect(top).toContain(quickstart);
  });

  it('covers the CLI, MCP and library paths and the install command', () => {
    const text = read(quickstart);
    expect(text).toContain('npx -y @vn-skills/cli');
    expect(text).toContain('claude mcp add');
    expect(text).toContain('npm i @vn-skills/core');
    expect(text).toContain('vn-skills install all --agent');
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

describe.each(['README.md', 'README.vi.md'])('%s einvoice example and in-repo CLI note', (file) => {
  const text = read(file);

  it('creates invoice.json with `einvoice example` before running totals', () => {
    expect(text).toContain(
      'vn-skills einvoice example > invoice.json && vn-skills einvoice totals invoice.json',
    );
  });

  it('recommends running the built CLI with node for clean JSON', () => {
    expect(text).toContain('node packages/cli/dist/index.js');
    expect(text).not.toContain('before the packages are published');
    expect(text).not.toContain('chưa publish npm');
  });
});

describe('@vn-skills/mcp MCP Registry metadata', () => {
  const pkg = JSON.parse(read('packages/mcp/package.json')) as {
    mcpName?: string;
    version: string;
  };
  const srv = JSON.parse(read('packages/mcp/server.json')) as {
    name: string;
    description: string;
    version: string;
    packages: { identifier: string; version: string }[];
  };

  it('server.json name equals package.json mcpName', () => {
    expect(pkg.mcpName).toBe('io.github.beiryu/vn-skills');
    expect(srv.name).toBe(pkg.mcpName);
  });

  it('server.json versions equal the package version', () => {
    expect(srv.version).toBe(pkg.version);
    expect(srv.packages.map((p) => [p.identifier, p.version])).toEqual([
      ['@vn-skills/mcp', pkg.version],
    ]);
  });

  it('description fits the registry limit of 100 characters', () => {
    expect(srv.description.length).toBeLessThanOrEqual(100);
  });
});

describe('offline toolkit, not a payment gateway', () => {
  const top = (p: string): string => read(p).split('\n').slice(0, 40).join('\n');

  it('README.md says near the top what it is and is not', () => {
    const text = top('README.md');
    expect(text).toMatch(/payment gateway/i);
    expect(text).toMatch(/offline/i);
    expect(text).toMatch(/API keys?/i);
    expect(text).toMatch(/does not collect/i);
    expect(text).toMatch(/confirm/i);
  });

  it('README.vi.md says the same in Vietnamese', () => {
    const text = top('README.vi.md');
    expect(text).toMatch(/cổng thanh toán/i);
    expect(text).toMatch(/offline/i);
    expect(text).toMatch(/API key/i);
  });

  it('vietqr SKILL.md warns agents not to promise payment confirmation', () => {
    const text = read('skills/vietqr/SKILL.md');
    expect(text).toMatch(/cổng thanh toán/i);
    expect(text).toMatch(/xác nhận/i);
  });

  it.each(['README.md', 'README.vi.md', 'skills/vietqr/SKILL.md'])(
    '%s does not name competitors',
    (file) => {
      expect(read(file)).not.toMatch(/AgentPay/i);
    },
  );
});

describe.each([
  ['README.md', 'docs/quickstart.md'],
  ['README.vi.md', 'docs/quickstart.vi.md'],
])('%s MCP client setup', (readme, quickstart) => {
  const text = read(readme);

  it.each([
    '.cursor/mcp.json',
    '.vscode/mcp.json',
    'claude_desktop_config.json',
    '~/.codex/config.toml',
    '[mcp_servers.vn-skills]',
    'claude mcp add vn-skills -- npx -y @vn-skills/mcp',
  ])('shows %s', (needle) => {
    expect(text).toContain(needle);
  });

  it('uses the VS Code "servers" shape with type stdio', () => {
    expect(text).toMatch(/"servers":\s*\{\s*"vn-skills":\s*\{\s*"type":\s*"stdio"/);
  });

  it('keeps the generic mcpServers block and mentions Node.js 22', () => {
    expect(text).toContain('"mcpServers"');
    expect(text).toMatch(/Node(\.js)? 22/);
  });

  it('links to each client’s MCP docs', () => {
    const section =
      /^#{2,3} (?:MCP client setup|Cài đặt MCP theo client)[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(
        text,
      );
    expect(section).not.toBeNull();
    const body = section![1]!;
    for (const c of ['Claude Code', 'Claude Desktop', 'Cursor', 'VS Code', 'Codex']) {
      expect(body).toMatch(new RegExp(`\\[[^\\]]*${c}[^\\]]*\\]\\(https://[^)]+\\)`));
    }
  });

  it('quickstart links to the README section instead of duplicating it', () => {
    const q = read(quickstart);
    expect(q).toMatch(new RegExp(`${readme.replace('.', '\\.')}#`));
    expect(q).not.toContain('[mcp_servers.vn-skills]');
    expect(q).not.toContain('.vscode/mcp.json');
  });
});

describe.each(['README.md', 'README.vi.md'])('%s MCP tools grouped by skill', (file) => {
  const text = read(file);
  const section = /^## MCP server[^\n]*\n([\s\S]*?)(?=^### |^## )/m.exec(text)![1]!;
  const skillOf: [string, string][] = [
    ['vietqr_', 'vietqr'],
    ['vn_address_', 'vn-address'],
    ['vn_tax_id_', 'vn-tax-id'],
    ['vn_id_', 'vn-id'],
    ['vn_phone', 'vn-phone'],
    ['vn_holidays_', 'vn-holidays'],
    ['vn_money_to_words', 'vn-money-words'],
    ['vn_lunar_', 'vn-lunar'],
    ['vn_einvoice_', 'vn-einvoice'],
    ['vn_name', 'vn-name'],
    ['vn_number_format', 'vn-number-format'],
  ];

  it('states the total tool count in the MCP server section', () => {
    expect(section).toContain(String(registered.length));
  });

  it('lists every registered tool exactly once in the MCP server section', () => {
    for (const t of registered) {
      expect(section.split('`' + t + '`').length - 1, t).toBe(1);
    }
  });

  it('puts each tool on a line that names its skill', () => {
    const lines = section.split('\n');
    for (const t of registered) {
      const skill = skillOf.find(([prefix]) => t.startsWith(prefix))?.[1];
      expect(skill, t).toBeDefined();
      const line = lines.find((l) => l.includes('`' + t + '`'))!;
      expect(line, t).toContain('`' + skill! + '`');
    }
  });
});
