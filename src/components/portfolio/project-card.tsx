'use client';

/**
 * Project Card Component
 *
 * Displays a verified project on a public portfolio page.
 */

import { Building2, CheckCircle, Star, Quote } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  title: string;
  company: string;
  isFeatured: boolean;
  studentReflection: string | null;
}

export function ProjectCard({
  title,
  company,
  isFeatured,
  studentReflection,
}: ProjectCardProps) {
  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        isFeatured && 'border-amber-300 ring-1 ring-amber-200'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          {isFeatured && (
            <Star
              size={18}
              className="shrink-0 fill-amber-400 text-amber-400 mt-0.5"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
          <Building2 size={14} />
          <span>{company}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Skills tags */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            Verified
          </Badge>
        </div>

        {/* Verification mark */}
        <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 rounded-md px-2.5 py-1.5">
          <CheckCircle size={14} className="shrink-0 text-teal-600" />
          <span>
            Verified by <strong>{company}</strong> via Proveground
          </span>
        </div>

        {/* Student reflection */}
        {studentReflection && (
          <div className="flex gap-2 pt-1">
            <Quote
              size={14}
              className="shrink-0 text-slate-300 mt-0.5 rotate-180"
            />
            <p className="text-sm italic text-slate-600 leading-relaxed">
              {studentReflection}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
