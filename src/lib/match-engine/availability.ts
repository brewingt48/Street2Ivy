/**
 * ProveGround Match Engine™ — Availability Calculator
 *
 * Computes student availability windows based on their
 * sport schedules, academic calendar, and custom blocks.
 */

import type { StudentScheduleEntry } from './types';

export interface AvailabilityWindow {
  startDate: string;
  endDate: string;
  availableHoursPerWeek: number;
  constraints: string[];
}

/**
 * Calculate available hours per week for a given date, considering
 * all active schedules.
 */
export function calculateAvailableHours(
  schedules: StudentScheduleEntry[],
  baseHoursPerWeek: number = 40
): number {
  const activeSchedules = schedules.filter((s) => s.isActive);

  // Sum up committed hours from sport schedules
  let committedHours = 0;
  for (const sched of activeSchedules) {
    if (sched.scheduleType === 'sport') {
      committedHours += (sched.practiceHoursPerWeek || 0) + (sched.competitionHoursPerWeek || 0);
    }
    if (sched.customBlocks && Array.isArray(sched.customBlocks)) {
      for (const block of sched.customBlocks) {
        if (block.startTime && block.endTime) {
          const hours = parseTimeToHours(block.endTime) - parseTimeToHours(block.startTime);
          if (hours > 0) committedHours += hours;
        }
      }
    }
  }

  // Academic load reduces availability (estimate 15-20 hrs/week for classes during semester)
  const academicSchedules = activeSchedules.filter((s) => s.scheduleType === 'academic');
  let academicHours = 0;
  for (const sched of academicSchedules) {
    if (sched.intensityLevel >= 4) {
      academicHours = 20; // Heavy course load
    } else if (sched.intensityLevel >= 3) {
      academicHours = 15; // Normal load
    } else {
      academicHours = 5; // Light / break
    }
  }

  const availableHours = Math.max(0, baseHoursPerWeek - committedHours - academicHours);
  return Math.round(availableHours * 10) / 10;
}

/**
 * Get availability windows for a date range.
 * Returns periods of varying availability based on schedule overlaps.
 */
export function getAvailabilityWindows(
  schedules: StudentScheduleEntry[],
  startDate: string,
  endDate: string
): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];
  const activeSchedules = schedules.filter((s) => s.isActive);

  if (activeSchedules.length === 0) {
    // No schedules — fully available
    return [
      {
        startDate,
        endDate,
        availableHoursPerWeek: 40,
        constraints: [],
      },
    ];
  }

  // Simplified: break the range into monthly windows and calculate per-month availability
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current < end) {
    const windowEnd = new Date(current);
    windowEnd.setMonth(windowEnd.getMonth() + 1);
    if (windowEnd > end) windowEnd.setTime(end.getTime());

    const month = current.getMonth() + 1; // 1-indexed
    const constraints: string[] = [];
    let committedHours = 0;

    for (const sched of activeSchedules) {
      if (sched.scheduleType === 'sport' && sched.startMonth && sched.endMonth) {
        if (isMonthInRange(month, sched.startMonth, sched.endMonth)) {
          committedHours +=
            (sched.practiceHoursPerWeek || 0) + (sched.competitionHoursPerWeek || 0);
          constraints.push(
            `${sched.sportName || 'Sport'} ${sched.seasonType || 'season'}`
          );
        }
      }
    }

    // Check for travel conflicts in this window
    for (const sched of activeSchedules) {
      for (const tc of sched.travelConflicts || []) {
        const tcStart = new Date(tc.startDate);
        const tcEnd = new Date(tc.endDate);
        if (tcStart <= windowEnd && tcEnd >= current) {
          constraints.push(`Travel: ${tc.reason || 'Away'}`);
          committedHours += 8; // rough penalty for travel
        }
      }
    }

    const availableHoursPerWeek = Math.max(0, 40 - committedHours);

    windows.push({
      startDate: current.toISOString().split('T')[0],
      endDate: windowEnd.toISOString().split('T')[0],
      availableHoursPerWeek: Math.round(availableHoursPerWeek * 10) / 10,
      constraints,
    });

    current.setMonth(current.getMonth() + 1);
  }

  return windows;
}

/**
 * Check for hard travel conflicts in a date range.
 * Returns the number of conflict days.
 */
export function countTravelConflicts(
  schedules: StudentScheduleEntry[],
  startDate: string,
  endDate: string
): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  let conflictDays = 0;

  for (const sched of schedules) {
    if (!sched.isActive) continue;
    for (const tc of sched.travelConflicts || []) {
      const tcStart = new Date(tc.startDate).getTime();
      const tcEnd = new Date(tc.endDate).getTime();
      const overlap = Math.max(0, Math.min(end, tcEnd) - Math.max(start, tcStart));
      conflictDays += overlap / (1000 * 60 * 60 * 24);
    }
  }

  return Math.round(conflictDays * 10) / 10;
}

// --- Helpers ---

function parseTimeToHours(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

function isMonthInRange(month: number, start: number, end: number): boolean {
  if (start <= end) {
    return month >= start && month <= end;
  }
  return month >= start || month <= end;
}
