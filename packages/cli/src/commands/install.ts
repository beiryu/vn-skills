import { Command } from 'commander';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function registerInstall(program: Command): void {
  program
    .command('install <skill>')
    .description('Copy a bundled skill (or "all") into an agent skills directory')
    .requiredOption('--agent <agent>', 'claude | cursor | codex | agents | copilot')
    .option('--global', 'install into the home directory instead of the current project')
    .option('--force', 'overwrite existing skill folders')
    .option('--dry-run', 'print actions without writing anything')
    .action(
      (
        skill: string,
        o: { agent: string; global?: boolean; force?: boolean; dryRun?: boolean },
      ) => {
        const agentDir = AGENT_DIRS[o.agent];
        if (!agentDir)
          throw new Error(
            `Unknown agent "${o.agent}". Use one of: ${Object.keys(AGENT_DIRS).join(', ')}`,
          );
        const src = skillsSource();
        const available = readdirSync(src)
          .filter((n) => existsSync(join(src, n, 'SKILL.md')))
          .sort();
        const names = skill === 'all' ? available : [skill];
        for (const n of names)
          if (!available.includes(n))
            throw new Error(`Unknown skill "${n}". Available: ${available.join(', ')}, all`);
        const dest =
          o.agent === 'copilot' && !o.global
            ? join(process.cwd(), '.github', 'skills')
            : join(o.global ? homedir() : process.cwd(), agentDir, 'skills');
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
