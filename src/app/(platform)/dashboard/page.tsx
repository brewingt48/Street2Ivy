/**
 * Student Dashboard Page
 *
 * Main dashboard for students. Placeholder for Phase 2.
 */

import { getCurrentUser } from '@/lib/auth/middleware';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata = {
  title: 'Dashboard — Street2Ivy',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here&apos;s an overview of your activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active applications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Available projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unread messages
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.emailVerified ? 'Verified' : 'Pending'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Email status
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Complete these steps to get the most out of Street2Ivy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${user.emailVerified ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                {user.emailVerified ? '✓' : '1'}
              </div>
              <span className={user.emailVerified ? 'line-through text-slate-400' : ''}>
                Verify your email address
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold">2</div>
              <span>Complete your profile</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold">3</div>
              <span>Browse and apply to projects</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
