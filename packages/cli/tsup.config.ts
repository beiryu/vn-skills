import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

function copyDir(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const e of readdirSync(from, { withFileTypes: true })) {
    if (e.isDirectory()) copyDir(join(from, e.name), join(to, e.name));
    else writeFileSync(join(to, e.name), readFileSync(join(from, e.name)));
  }
}

export default defineConfig({
  entry: ['src/index.ts', 'src/decode.ts'],
  dts: { entry: { decode: 'src/decode.ts' } },
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'node22',
  async onSuccess() {
    rmSync('skills', { recursive: true, force: true });
    copyDir('../../skills', 'skills');
  },
  banner: { js: '#!/usr/bin/env node' },
});
