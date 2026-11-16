import type { AddressCatalogue } from '@vn-skills/core';
import { toCsv } from './csv.js';

type Cell = string | number | boolean | null | undefined;

const header = (c: AddressCatalogue, prefix: string, name = c.table): string =>
  `${prefix} vn-skills address export ${name}: dataset ${c.dataset.version}, ${c.dataset.decree}; see packages/core/data/SOURCES.md`;

export function toCatalogueCsv(c: AddressCatalogue): string {
  const cell = (v: Cell): string => (v === null || v === undefined ? '' : String(v));
  return (
    header(c, '#') +
    '\n' +
    toCsv([c.columns, ...c.rows.map((r) => c.columns.map((k) => cell(r[k])))])
  );
}

const sqlValue = (v: Cell): string =>
  v === null || v === undefined
    ? 'NULL'
    : typeof v === 'number'
      ? String(v)
      : typeof v === 'boolean'
        ? v
          ? '1'
          : '0'
        : `'${v.replace(/'/g, "''")}'`;

export function toCatalogueSql(c: AddressCatalogue): string {
  const name = c.table.replace(/-/g, '_');
  const types = c.columns.map((k) => {
    const sample = c.rows.find((r) => r[k] !== null && r[k] !== undefined)?.[k];
    return typeof sample === 'number'
      ? 'INTEGER'
      : typeof sample === 'boolean'
        ? 'INTEGER'
        : 'TEXT';
  });
  const cols = c.columns.map((k) => `"${k}"`).join(', ');
  const lines = [
    header(c, '--', name),
    `CREATE TABLE IF NOT EXISTS ${name} (${c.columns.map((k, i) => `"${k}" ${types[i]}`).join(', ')});`,
    ...c.rows.map(
      (r) =>
        `INSERT INTO ${name} (${cols}) VALUES (${c.columns.map((k) => sqlValue(r[k])).join(', ')});`,
    ),
  ];
  return lines.join('\n') + '\n';
}
