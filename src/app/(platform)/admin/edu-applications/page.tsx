'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function AdminEduApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Education Admin Applications</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Review applications from educational institutions</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No pending applications</p>
          <p className="text-sm text-slate-400 mt-1">Applications from educational administrators will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}
