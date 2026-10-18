import type { Command } from 'commander';

export interface OutputOptions {
  json?: boolean;
  pretty?: boolean;
}

/** Decide whether to print JSON: explicit flag wins, otherwise JSON when stdout is not a TTY (agents). */
export function wantsJson(cmd: Command): boolean {
  const opts = cmd.optsWithGlobals<OutputOptions>();
  if (opts.json === true) return true;
  if (opts.pretty === true) return false;
  return !process.stdout.isTTY;
}

export function printJson(data: unknown): void {
  process.stdout.write(
    JSON.stringify(data, (_k, v: unknown) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n',
  );
}

/** Print a failure (structured error) and exit 1. */
export function failExit(
  cmd: Command,
  error: { code: string; message: string; hint?: string },
): never {
  if (wantsJson(cmd)) printJson({ ok: false, error });
  else {
    process.stderr.write(`Error [${error.code}]: ${error.message}\n`);
    if (error.hint) process.stderr.write(`Hint: ${error.hint}\n`);
  }
  process.exit(1);
}

export function kv(rows: Array<[string, unknown]>): string {
  const w = Math.max(...rows.map(([k]) => k.length));
  return rows
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k.padEnd(w)}  ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    .join('\n');
}
