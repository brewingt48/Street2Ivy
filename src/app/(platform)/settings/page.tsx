/**
 * Settings Page
 *
 * User profile settings. Placeholder — expanded in Phase 2.
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
  title: 'Settings — Street2Ivy',
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your basic account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">First Name</p>
              <p className="text-sm">{user.firstName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Last Name</p>
              <p className="text-sm">{user.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Email</p>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Role</p>
              <p className="text-sm capitalize">{user.role.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Email Verified</p>
              <p className="text-sm">{user.emailVerified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
