'use client';

/**
 * Analytics Data Table
 *
 * Sortable, paginated table with integrated export button.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExportButton } from './export-button';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { CsvColumn } from '@/lib/export/csv';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  format?: (value: unknown, row: Record<string, unknown>) => string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps {
  title: string;
  data: Record<string, unknown>[];
  columns: TableColumn[];
  exportFilename?: string;
  pageSize?: number;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function DataTable({
  title,
  data,
  columns,
  exportFilename,
  pageSize = 10,
  onRowClick,
}: DataTableProps) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageData = sortedData.slice(start, start + pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const csvColumns: CsvColumn[] = columns.map((c) => ({
    key: c.key,
    label: c.label,
    format: c.format ? (val: unknown) => c.format!(val, {}) : undefined,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{data.length} records</span>
            {exportFilename && (
              <ExportButton
                data={data}
                filename={exportFilename}
                columns={csvColumns}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No data available</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`pb-2 font-medium text-slate-500 dark:text-slate-400 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.sortable && (
                            sortKey === col.key ? (
                              sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-slate-300" />
                            )
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
                      }`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-2.5 ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {col.format ? col.format(row[col.key], row) : String(row[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
