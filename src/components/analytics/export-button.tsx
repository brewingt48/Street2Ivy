'use client';

/**
 * Export Button Component
 *
 * Button that triggers CSV download of data.
 */

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToCSV, type CsvColumn } from '@/lib/export/csv';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: CsvColumn[];
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
}

export function ExportButton({
  data,
  filename,
  columns,
  label = 'Export CSV',
  variant = 'outline',
  size = 'sm',
  disabled = false,
}: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;
    exportToCSV(data, filename, columns);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="gap-1.5"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
