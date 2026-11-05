import { Command } from 'commander';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const AGENT_DIRS: Record<string, string> = {
  claude: '.claude',
  cursor: '.cursor',
  codex: '.codex',
  agents: '.agents',
  copilot: '.copilot',
};

/** Skills are bundled at <pkg>/skills (published) or <repo>/skills (workspace checkout). */
function skillsSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const p of [resolve(here, '..', 'skills'), resolve(here, '..', '..', '..', 'skills')]) {
    if (existsSync(p) && statSync(p).isDirectory()) return p;
  }
  throw new Error('Bundled skills directory not found');
}

function frontmatterField(text: string, key: string): string | undefined {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
  const m = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(fm);
  if (!m) return undefined;
  return (m[1] ?? '').trim().replace(/^(["'])(.*)\1$/, '$2');
}

/** Limits from the Agent Skills overview docs. */
function checkFrontmatter(skill: string, text: string): void {
  const name = frontmatterField(text, 'name');
  const description = frontmatterField(text, 'description');
  if (!name) throw new Error(`Skill "${skill}": frontmatter field "name" is missing`);
  if (name.length > 64)
    throw new Error(`Skill "${skill}": field "name" is longer than 64 characters`);
  if (!/^[a-z0-9-]+$/.test(name))
    throw new Error(
      `Skill "${skill}": field "name" must use only lowercase letters, digits and hyphens`,
    );
  if (/anthropic|claude/.test(name))
    throw new Error(`Skill "${skill}": field "name" must not contain "anthropic" or "claude"`);
  if (!description)
    throw new Error(`Skill "${skill}": frontmatter field "description" is missing or empty`);
  if (description.length > 1024)
    throw new Error(`Skill "${skill}": field "description" is longer than 1024 characters`);
}

function listFiles(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  )) {
    const rel = prefix + e.name;
    if (e.isDirectory()) out.push(...listFiles(join(dir, e.name), `${rel}/`));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

function buildZip(skill: string, dir: string): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const rel of listFiles(dir)) {
    const data = readFileSync(join(dir, rel));
    const packed = deflateRawSync(data);
    const name = Buffer.from(`${skill}/${rel}`, 'utf8');
    const crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(8, 8);
    h.writeUInt16LE(0, 10);
    h.writeUInt16LE(0x21, 12); // 1980-01-01
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(packed.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(name.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt16LE(0x21, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(packed.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    parts.push(h, name, packed);
    central.push(c, name);
    offset += h.length + name.length + packed.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length / 2, 8);
  end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

export function registerInstall(program: Command): void {
  program
    .command('install <skill>')
    .description('Copy a bundled skill (or "all") into an agent skills directory')
    .option('--agent <agent>', 'claude | cursor | codex | agents | copilot')
    .option('--zip <dir>', 'write one <skill>.zip per skill into <dir> (claude.ai, Claude API)')
    .option('--global', 'install into the home directory instead of the current project')
    .option('--force', 'overwrite existing skill folders')
    .option('--dry-run', 'print actions without writing anything')
    .action(
      (
        skill: string,
        o: { agent?: string; zip?: string; global?: boolean; force?: boolean; dryRun?: boolean },
      ) => {
        const agentDir =
          o.agent !== undefined && Object.hasOwn(AGENT_DIRS, o.agent)
            ? AGENT_DIRS[o.agent]
            : undefined;
        if (!o.zip && !agentDir)
          throw new Error(
            o.agent === undefined
              ? 'Missing --agent <agent> (or --zip <dir>)'
              : `Unknown agent "${o.agent}". Use one of: ${Object.keys(AGENT_DIRS).join(', ')}`,
          );
        const src = skillsSource();
        const available = readdirSync(src)
          .filter((n) => existsSync(join(src, n, 'SKILL.md')))
          .sort();
        const names = skill === 'all' ? available : [skill];
        for (const n of names)
          if (!available.includes(n))
            throw new Error(`Unknown skill "${n}". Available: ${available.join(', ')}, all`);
        if (o.zip) {
          const outDir = resolve(o.zip);
          for (const n of names)
            checkFrontmatter(n, readFileSync(join(src, n, 'SKILL.md'), 'utf8'));
          const clash = names.map((n) => join(outDir, `${n}.zip`)).filter((f) => existsSync(f));
          if (clash.length > 0 && !o.force)
            throw new Error(`Already exists: ${clash.join(', ')}. Use --force to overwrite.`);
          for (const n of names) {
            const file = join(outDir, `${n}.zip`);
            process.stdout.write(`${o.dryRun ? '[dry-run] ' : ''}zip ${n} -> ${file}\n`);
            if (!existsSync(join(src, n, 'scripts')))
              process.stdout.write(
                `warning: ${n} has no scripts/ folder; it needs Node.js and network (npx), so it may not work on the Claude API\n`,
              );
            if (o.dryRun) continue;
            mkdirSync(outDir, { recursive: true });
            writeFileSync(file, buildZip(n, join(src, n)));
          }
          return;
        }
        const dest =
          o.agent === 'copilot' && !o.global
            ? join(process.cwd(), '.github', 'skills')
            : join(o.global ? homedir() : process.cwd(), agentDir ?? '', 'skills');
        const existing = names.filter((n) => existsSync(join(dest, n)));
        if (existing.length > 0 && !o.force)
          throw new Error(
            `Already exists: ${existing.map((n) => join(dest, n)).join(', ')}. Use --force to overwrite.`,
          );
        for (const n of names) {
          const target = join(dest, n);
          process.stdout.write(`${o.dryRun ? '[dry-run] ' : ''}install ${n} -> ${target}\n`);
          if (o.dryRun) continue;
          mkdirSync(dest, { recursive: true });
          rmSync(target, { recursive: true, force: true });
          cpSync(join(src, n), target, { recursive: true });
        }
      },
    );
}
