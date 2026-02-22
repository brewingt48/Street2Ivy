'use client';

/**
 * Analytics Data Table
 *
 * Sortable, paginated table with integrated export button.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportButton } from './export-button';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
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
  /** Enable a search bar that filters rows across all text columns */
  searchable?: boolean;
  /** Placeholder for the search input */
  searchPlaceholder?: string;
  /** Column keys to search within (defaults to all columns) */
  searchKeys?: string[];
  /** Custom render function for individual cells */
  renderCell?: (col: TableColumn, value: unknown, row: Record<string, unknown>) => React.ReactNode | undefined;
}

export function DataTable({
  title,
  data,
  columns,
  exportFilename,
  pageSize = 10,
  onRowClick,
  searchable,
  searchPlaceholder,
  searchKeys,
  renderCell,
}: DataTableProps) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    const keys = searchKeys || columns.map((c) => c.key);
    return data.filter((row) =>
      keys.some((key) => {
        const val = row[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, searchQuery, searchable, searchKeys, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
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
  }, [filteredData, sortKey, sortDir]);

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
            <span className="text-xs text-slate-400">
              {searchQuery ? `${filteredData.length} of ${data.length}` : data.length} records
            </span>
            {exportFilename && (
              <ExportButton
                data={data}
                filename={exportFilename}
                columns={csvColumns}
              />
            )}
          </div>
        </div>
        {searchable && (
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder={searchPlaceholder || 'Search...'}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        )}
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
                          {renderCell?.(col, row[col.key], row) ?? (col.format ? col.format(row[col.key], row) : String(row[col.key] ?? ''))}
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
