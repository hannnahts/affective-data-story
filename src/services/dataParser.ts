import type { DataPoint, Dataset } from '../types/emotion';

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(cell.trim()); cell = ''; }
    else { cell += ch; }
  }
  result.push(cell.trim());
  return result;
}

export function parseCSV(text: string, name: string): Dataset {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV must have at least one header row and one data row');

  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map(l => splitCSVLine(l));

  const isNumericCol = (colIdx: number) =>
    rows.every(r => r[colIdx] !== undefined && !isNaN(parseFloat(r[colIdx])) && r[colIdx] !== '');

  const numericCols = headers.map((_, i) => i).filter(i => isNumericCol(i));
  const stringCols  = headers.map((_, i) => i).filter(i => !isNumericCol(i));

  if (numericCols.length === 0) throw new Error('CSV contains no numeric columns');

  // Default X: first string column, or first column if all numeric
  const defaultLabelColIdx = stringCols.length > 0 ? stringCols[0] : 0;
  const numericDataCols = numericCols.filter(i => i !== defaultLabelColIdx);
  if (numericDataCols.length === 0 && numericCols.length > 0) {
    // All columns are numeric — skip this guard
  }

  const parsed: DataPoint[] = rows.map((r, rowIdx) => {
    const xVal = (r[defaultLabelColIdx] ?? String(rowIdx)).replace(/^["']|["']$/g, '');
    const point: DataPoint = {
      month: xVal,
      value: numericDataCols.length > 0 ? (parseFloat(r[numericDataCols[0]]) || 0) : 0,
    };
    // Store ALL columns so X axis can be reassigned later
    for (let i = 0; i < headers.length; i++) {
      const raw = (r[i] ?? '').replace(/^["']|["']$/g, '');
      point[headers[i]] = numericCols.includes(i) ? (parseFloat(raw) || 0) : raw;
    }
    return point;
  });

  const xColumn = headers[defaultLabelColIdx];
  const numericColumns = numericDataCols.map(i => headers[i]);
  const yColumns = numericColumns.length > 0 ? numericColumns : numericCols.map(i => headers[i]);

  return { name, parsed, columns: headers, xColumn, numericColumns, yColumns };
}

export function parseJSON(text: string, name: string): Dataset {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('Invalid JSON format'); }

  if (!Array.isArray(raw)) throw new Error('JSON must be an array');
  const arr = raw as Record<string, unknown>[];
  if (arr.length === 0) throw new Error('JSON array is empty');

  const keys = Object.keys(arr[0]);
  const numericKeys = keys.filter(k => typeof arr[0][k] === 'number');
  const labelKey = keys.find(k => typeof arr[0][k] === 'string');

  if (numericKeys.length === 0) throw new Error('No numeric fields found in JSON objects');

  const parsed: DataPoint[] = arr.map((item, i) => {
    const xVal = labelKey ? String(item[labelKey]) : String(i + 1);
    const point: DataPoint = {
      month: xVal,
      value: Number(item[numericKeys[0]]) || 0,
    };
    // Store all keys
    for (const k of keys) {
      const v = item[k];
      point[k] = typeof v === 'number' ? v : String(v ?? '');
    }
    return point;
  });

  const xColumn = labelKey ?? 'index';
  return { name, parsed, columns: keys, xColumn, numericColumns: numericKeys, yColumns: numericKeys };
}

// Re-derives 'month' and 'value' fields when user changes the X or Y axis mapping.
// 'month' drives the X axis tick label; 'value' drives single-series LLM analysis.
export function remapAxes(dataset: Dataset, newXColumn: string, newYColumns: string[]): Dataset {
  const parsed = dataset.parsed.map(d => ({
    ...d,
    month: String(d[newXColumn] ?? ''),
    value: newYColumns.length > 0 ? Number(d[newYColumns[0]]) || 0 : d.value,
  }));
  return { ...dataset, parsed, xColumn: newXColumn, yColumns: newYColumns };
}

export function parseFile(text: string, filename: string): Dataset {
  const name = filename.replace(/\.[^.]+$/, '');
  if (filename.toLowerCase().endsWith('.json')) return parseJSON(text, name);
  return parseCSV(text, name);
}
