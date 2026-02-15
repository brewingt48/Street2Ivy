'use client';

import { ScheduleBuilder } from '@/components/matching/ScheduleBuilder';
import { AvailabilityCalendar } from '@/components/matching/AvailabilityCalendar';

export default function StudentSchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          My Schedule
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your sport seasons and availability to get better match recommendations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScheduleBuilder />
        <AvailabilityCalendar />
      </div>
    </div>
  );
}
