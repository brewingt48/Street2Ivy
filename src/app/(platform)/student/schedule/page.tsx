'use client';

import { ScheduleBuilder } from '@/components/matching/ScheduleBuilder';
import { AvailabilityCalendar } from '@/components/matching/AvailabilityCalendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Calendar,
  Target,
  Trophy,
  Clock,
  Briefcase,
  Zap,
  TrendingUp,
  Plane,
  Info,
} from 'lucide-react';

export default function StudentSchedulePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="h-6 w-6 text-teal-600" />
          My Schedule
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your sport seasons, academic calendar, and weekly availability. Your schedule directly
          impacts your <strong>Match Engine&trade;</strong> scores.
        </p>
      </div>

      {/* How It Works — Instructional Card */}
      <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/80 to-emerald-50/80 dark:from-teal-900/20 dark:to-emerald-900/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-teal-600" />
            How Your Schedule Powers the Match Engine&trade;
          </CardTitle>
          <CardDescription>
            The Match Engine&trade; uses your schedule to calculate a <strong>Temporal Fit</strong> signal
            &mdash; one of six signals that determine your match score for every opportunity. Keeping your
            schedule accurate means better, more realistic project recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Sport Seasons */}
            <div className="bg-white dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Sport Seasons</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Add your sport seasons (in-season and off-season) so the engine knows when you&apos;re training,
                competing, and traveling. <strong>In-season</strong> projects will score lower if your practice
                and competition load is heavy, while <strong>off-season</strong> opportunities will rank higher
                since you have more bandwidth.
              </p>
              <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-medium pt-1">
                <Zap className="h-3 w-3" />
                Impacts: Season conflicts, intensity scoring
              </div>
            </div>

            {/* Custom & Work Blocks */}
            <div className="bg-white dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-slate-500" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Custom &amp; Work Blocks</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Block off recurring time for jobs, tutoring, clubs, or other commitments. The engine subtracts
                these hours from your total availability. If a project needs 15&nbsp;hours/week and you only have
                10 free, your match score drops &mdash; keeping your results realistic and honest.
              </p>
              <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-medium pt-1">
                <Zap className="h-3 w-3" />
                Impacts: Available hours, workload feasibility
              </div>
            </div>

            {/* Available Hours */}
            <div className="bg-white dark:bg-slate-900/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Available Hours/Week</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Set your total available hours per week for project work. The engine compares this against each
                listing&apos;s required hours. A close match scores high; if you have <strong>more</strong> hours
                than needed you&apos;re still in good shape; if you have <strong>fewer</strong>, the score drops
                proportionally.
              </p>
              <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-medium pt-1">
                <Zap className="h-3 w-3" />
                Impacts: Hours match score (25% of total)
              </div>
            </div>
          </div>

          {/* Additional Info Row */}
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="flex gap-3 p-3 rounded-lg bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
              <Plane className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Travel Conflicts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Each sport season includes estimated travel days/month. The engine checks for overlap between
                  travel dates and project timelines &mdash; heavy travel during a project window lowers the
                  match score to flag potential availability issues.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
              <TrendingUp className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Score Updates</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  When you add, change, or remove a schedule, your match scores are <strong>automatically
                  recalculated</strong>. Check your dashboard&apos;s &ldquo;Recommended For You&rdquo; section
                  to see updated recommendations after making changes.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="mt-4 p-3 rounded-lg bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">Quick Tips for Better Matches</p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                  <li>&bull; <strong>Add all active sport seasons</strong> &mdash; the engine can&apos;t avoid scheduling conflicts it doesn&apos;t know about</li>
                  <li>&bull; <strong>Be realistic with available hours</strong> &mdash; overestimating leads to matches you can&apos;t actually commit to</li>
                  <li>&bull; <strong>Update when things change</strong> &mdash; if your season ends or you pick up a new commitment, update your schedule so matches stay accurate</li>
                  <li>&bull; <strong>Off-season is your best window</strong> &mdash; projects starting during your off-season will naturally score higher</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Builder + Availability Calendar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScheduleBuilder />
        <AvailabilityCalendar />
      </div>
    </div>
  );
}
