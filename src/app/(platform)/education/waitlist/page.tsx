'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function EducationWaitlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Waitlist</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Students waiting for institution support</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No students on the waitlist</p>
        </CardContent>
      </Card>
    </div>
  );
}
