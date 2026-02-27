'use client';

/**
 * Date Range Picker Component
 *
 * Select-based picker with preset date ranges for analytics filtering.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RANGE_OPTIONS, type RangeKey } from '@/lib/analytics/date-ranges';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  value: RangeKey;
  onChange: (range: RangeKey) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-slate-400" />
      <Select value={value} onValueChange={(v) => onChange(v as RangeKey)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
