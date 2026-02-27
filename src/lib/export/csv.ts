/**
 * CSV Export Utility
 *
 * Client-side CSV generation and download.
 * Handles date formatting, null values, and proper escaping.
 */

export interface CsvColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

/**
 * Format a value for CSV output
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Escape a CSV cell value (wrap in quotes if needed)
 */
function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate CSV content from data array
 */
export function generateCSV(
  data: Record<string, unknown>[],
  columns?: CsvColumn[]
): string {
  if (data.length === 0) return '';

  // Auto-detect columns if not provided
  const cols: CsvColumn[] = columns || Object.keys(data[0]).map((key) => ({
    key,
    label: key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim(),
  }));

  // Header row
  const header = cols.map((c) => escapeCell(c.label)).join(',');

  // Data rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const raw = row[col.key];
        const formatted = col.format ? col.format(raw) : formatValue(raw);
        return escapeCell(formatted);
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: CsvColumn[]
): void {
  const csv = generateCSV(data, columns);
  if (!csv) return;
  downloadCSV(csv, filename);
}
