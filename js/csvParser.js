/* ── CSV parsing ────────────────────────────────────────────────────── */

import { normalizeCategory } from './categories.js';
import { resolveAssetUrl } from './config.js';

const csvFlag = (value) => String(value ?? '').trim().toLowerCase() === 'y';

function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function parseCsvRows(text) {
  const rows = [];
  let currentRow = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { inQuotes = !inQuotes; currentRow += char; continue; }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (currentRow) rows.push(currentRow);
      currentRow = '';
      continue;
    }
    currentRow += char;
  }

  if (currentRow) rows.push(currentRow);
  return rows;
}

function rowToDatabase(headers, values) {
  const record = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  const name = record['database name'];
  if (!name) return null;

  const sort = parseInt(record.sort, 10);

  return {
    name,
    intro: record.intro ?? '',
    type: record['database type'] ?? '',
    subjects: (record['related subjects'] ?? '').split('|').map((s) => s.trim()).filter(Boolean),
    url: record['access url'] ?? '',
    category: normalizeCategory(record.function),
    img: resolveAssetUrl(record.img),
    openResource: csvFlag(record.open_resource),
    aiFeature: csvFlag(record.ai_feature),
    sort: Number.isFinite(sort) ? sort : 999,
  };
}

function parseCsv(text) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) return [];

  const headers = splitCsvLine(rows[0]).map((header) => header.toLowerCase());

  return rows.slice(1).flatMap((row) => {
    const line = row.trim();
    if (!line) return [];
    const database = rowToDatabase(headers, splitCsvLine(line));
    return database ? [database] : [];
  });
}

export { parseCsv };

