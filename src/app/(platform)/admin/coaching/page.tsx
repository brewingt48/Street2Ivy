'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function AdminCoachingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Coaching Configuration</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage AI coaching settings</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Coaching configuration</p>
          <p className="text-sm text-slate-400 mt-1">AI coaching settings are managed per-institution</p>
        </CardContent>
      </Card>
    </div>
  );
}
