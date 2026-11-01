/** Copy packages/core/data/banks.json into skills/vietqr/scripts so the Python fallback ships the same list. */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(ROOT, 'skills', 'vietqr', 'scripts');
mkdirSync(dest, { recursive: true });
copyFileSync(join(ROOT, 'packages', 'core', 'data', 'banks.json'), join(dest, 'banks.json'));
