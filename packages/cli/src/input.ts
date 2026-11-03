import { readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';
import type { Command } from 'commander';
import { failExit } from './output.js';

const KNOWN = 'utf-8, windows-1258, utf-16le, utf-16be';

function detectBom(buf: Buffer): string | undefined {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return 'utf-8';
  if (buf[0] === 0xff && buf[1] === 0xfe) return 'utf-16le';
  if (buf[0] === 0xfe && buf[1] === 0xff) return 'utf-16be';
  return undefined;
}

/** Reads a file ("-" = stdin), decodes it (BOM detection unless a label is given) and returns NFC text. */
export function readTextInput(file: string, encoding: string | undefined, c: Command): string {
  let buf: Buffer;
  try {
    buf = readFileSync(file === '-' ? 0 : file);
  } catch (e) {
    return failExit(c, {
      code: 'READ_ERROR',
      message: `cannot read ${file}: ${(e as Error).message}`,
      hint: 'Check the path and permissions, or pass "-" to read stdin.',
    });
  }
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(encoding ?? detectBom(buf) ?? 'utf-8');
  } catch {
    return failExit(c, {
      code: 'ENCODING',
      message: `unknown encoding "${encoding}"`,
      hint: `Use one of: ${KNOWN}.`,
    });
  }
  const text = decoder.decode(buf);
  const bad = text.indexOf('\uFFFD');
  if (bad >= 0) {
    const line = text.slice(0, bad).split(/\r\n|\r|\n/).length;
    return failExit(c, {
      code: 'ENCODING',
      message: `invalid ${decoder.encoding} bytes on line ${line} of ${file}`,
      hint: 'The file is probably not in this encoding; try --encoding windows-1258.',
    });
  }
  return text.normalize('NFC');
}
