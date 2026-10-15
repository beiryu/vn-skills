import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Golden fixtures live in `tests/golden/<skill>.json` so that ports in other languages can share them.
 *
 * File shape: `{ "skill": "<name>", "cases": { "<group>": [case, ...], ... } }`. Each group documents its own case
 * shape; `expected` objects are matched as subsets (`toMatchObject`) and `null` stands for `undefined`.
 */
export interface GoldenFile<T> {
  skill: string;
  cases: T;
}

export const GOLDEN_DIR = resolve(__dirname, 'golden');

export function loadGolden<T>(skill: string): T {
  const file = JSON.parse(
    readFileSync(resolve(GOLDEN_DIR, `${skill}.json`), 'utf8'),
  ) as GoldenFile<T>;
  if (file.skill !== skill) throw new Error(`golden/${skill}.json declares skill "${file.skill}"`);
  return file.cases;
}

/** Title for `it(...)`: the case `name`, or the JSON of its input. */
export function title(c: { name?: string; input?: unknown }): string {
  return c.name ?? JSON.stringify(c.input);
}

/** RFC 7396 JSON Merge Patch: objects merge recursively, `null` deletes, anything else replaces. */
export function mergePatch(target: unknown, patch: unknown): unknown {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out: Record<string, unknown> =
    target !== null && typeof target === 'object' && !Array.isArray(target)
      ? { ...(target as Record<string, unknown>) }
      : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else out[k] = mergePatch(out[k], v);
  }
  return out;
}
