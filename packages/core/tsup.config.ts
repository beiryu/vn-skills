import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: false,
  clean: true,
  target: 'node22',
  // JSON data files are inlined into the bundle so the package has no runtime file reads.
  loader: { '.json': 'json' },
});
