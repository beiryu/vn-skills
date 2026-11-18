import { fail, type Result } from '../shared/result.js';
import { formatNumber } from '../numfmt/index.js';
import { moneyToWords } from '../money/index.js';
import type { BuildVietQRData } from './build.js';

export interface VietQRCardOptions {
  template?: 'card' | 'print';
  /** Display text only; it is not part of the QR payload. */
  accountName?: string;
  thousand?: 'nghìn' | 'ngàn';
}

export type VietQRCardInput = Result<BuildVietQRData> & { modules: boolean[][] };

export interface VietQRCardData {
  svg: string;
  width: number;
  height: number;
}

const QUIET = 4;
const FONT = 'sans-serif';

/**
 * Average advance of a sans-serif glyph in em, kept on the wide side (capitals, bold, Vietnamese
 * diacritics) so a wrapped line stays inside the card in common fonts. SVG cannot measure text.
 */
const EM_PER_CHAR = 0.6;
const EM_PER_CHAR_BOLD = 0.66;

/** Splits `text` into lines of at most `max` characters, at spaces, or inside a word longer than a line. */
function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while ([...word].length > max) {
      if (cur) {
        out.push(cur);
        cur = '';
      }
      const chars = [...word];
      out.push(chars.slice(0, max).join(''));
      word = chars.slice(max).join('');
    }
    if (!cur) cur = word;
    else if ([...cur].length + 1 + [...word].length <= max) cur += ` ${word}`;
    else {
      out.push(cur);
      cur = word;
    }
  }
  if (cur || out.length === 0) out.push(cur);
  return out;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Render a printable VietQR card (QR plus transfer details) as an SVG string. Pure; no I/O. */
export function renderVietQRCard(
  data: VietQRCardInput,
  opts: VietQRCardOptions = {},
): Result<VietQRCardData> {
  if (!data || !data.ok)
    return fail('INVALID_INPUT', 'renderVietQRCard needs the ok result of buildVietQR');
  const modules = data.modules;
  if (!Array.isArray(modules) || modules.length === 0 || !Array.isArray(modules[0]))
    return fail('INVALID_INPUT', 'modules must be a non-empty QR matrix');

  const print = opts.template === 'print';
  const n = modules.length;
  const cell = print ? 12 : 8;
  const qrSize = (n + QUIET * 2) * cell;
  const pad = print ? 32 : 20;
  const fs = print ? 28 : 18;
  const lineH = Math.round(fs * 1.5);
  const width = qrSize + pad * 2;

  const lines: { text: string; bold?: boolean }[] = [];
  const bank = data.bank.name ? `${data.bank.shortName} - ${data.bank.name}` : data.bank.shortName;
  lines.push({ text: bank, bold: true }, { text: data.account });
  if (opts.accountName) lines.push({ text: opts.accountName, bold: true });
  if (data.amount !== undefined) {
    const f = formatNumber(data.amount, { maxFractionDigits: 0 });
    const w = moneyToWords(data.amount, { thousand: opts.thousand ?? 'nghìn' });
    if (f.ok) lines.push({ text: `${f.text} ₫`, bold: true });
    if (w.ok) lines.push({ text: w.words.charAt(0).toUpperCase() + w.words.slice(1) });
  }
  if (data.note) lines.push({ text: data.note });

  const rows = lines.flatMap((l) =>
    wrap(
      l.text,
      Math.max(1, Math.floor((width - pad * 2) / (fs * (l.bold ? EM_PER_CHAR_BOLD : EM_PER_CHAR)))),
    ).map((text) => ({ text, bold: l.bold })),
  );
  const height = pad + qrSize + rows.length * lineH + pad;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
  ];
  const ox = pad + QUIET * cell;
  const oy = pad + QUIET * cell;
  modules.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on)
        parts.push(
          `<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${cell}" height="${cell}" fill="#000000"/>`,
        );
    }),
  );
  rows.forEach((l, i) => {
    const y = pad + qrSize + i * lineH + fs + Math.round((lineH - fs) / 2);
    parts.push(
      `<text x="${width / 2}" y="${y}" font-size="${fs}" text-anchor="middle" fill="#000000"${l.bold ? ' font-weight="bold"' : ''}>${esc(l.text)}</text>`,
    );
  });
  parts.push('</svg>');
  return { ok: true, svg: parts.join(''), width, height };
}
