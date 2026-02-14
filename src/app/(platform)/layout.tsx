/**
 * Platform Layout
 *
 * Protected layout for authenticated users.
 * Checks session → renders topbar + sidebar + children.
 * Redirects to /login if not authenticated.
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/middleware';
import { Topbar } from '@/components/layout/topbar';
import { Sidebar } from '@/components/layout/sidebar';
import { Toaster } from '@/components/ui/toaster';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Topbar user={user} />
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-white dark:bg-slate-900 dark:border-slate-800 min-h-[calc(100vh-3.5rem)]">
          <Sidebar user={user} />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
