'use client';

/**
 * Employer Impact Section
 *
 * Displays employer engagement metrics and a top-employers table
 * for the Outcomes Dashboard.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Star, RefreshCw } from 'lucide-react';

interface EmployerImpactSectionProps {
  engagementCount: number;
  satisfactionAvg: number;
  repeatRate: number;
  topEmployers?: Array<{
    company_name: string;
    first_name: string;
    last_name: string;
    listing_count: number;
  }>;
}

export function EmployerImpactSection({
  engagementCount,
  satisfactionAvg,
  repeatRate,
  topEmployers,
}: EmployerImpactSectionProps) {
  return (
    <div className="space-y-4">
      {/* Employer stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30">
                <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Engaged Employers</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{engagementCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg Satisfaction</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Math.round(satisfactionAvg * 10) / 10}
                  <span className="text-base font-normal text-slate-400 ml-1">/5</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Repeat Rate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Math.round(repeatRate * 10) / 10}
                  <span className="text-base font-normal text-slate-400 ml-1">%</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top employers table */}
      {topEmployers && topEmployers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Employer Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">
                      Company
                    </th>
                    <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">
                      Contact
                    </th>
                    <th className="text-right py-2 font-medium text-slate-500 dark:text-slate-400">
                      Listings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topEmployers.map((employer, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <td className="py-2 pr-4 text-slate-900 dark:text-white">
                        {employer.company_name || 'Unknown Company'}
                      </td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                        {employer.first_name} {employer.last_name}
                      </td>
                      <td className="py-2 text-right font-medium text-slate-900 dark:text-white">
                        {employer.listing_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
