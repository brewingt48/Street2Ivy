'use client';

/**
 * Topbar Component
 *
 * Main navigation bar with logo, nav links, notification bell, and user menu.
 */

import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserNav } from './user-nav';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';

interface TopbarProps {
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export function Topbar({ user }: TopbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/95 dark:border-slate-800">
      <div className="flex h-14 items-center px-4 md:px-6">
        {/* Mobile sidebar trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar user={user} mobile />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center space-x-2 mr-6">
          <span className="text-xl font-bold text-teal-700 dark:text-teal-400">
            Street2Ivy
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center space-x-4 flex-1">
          <NavLinks role={user.role} />
        </nav>

        {/* Right side: notifications + user menu */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* Notification bell */}
          <Link href="/inbox">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                0
              </Badge>
              <span className="sr-only">Notifications</span>
            </Button>
          </Link>

          {/* User menu */}
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}

function NavLinks({ role }: { role: string }) {
  const links = getNavLinks(role);
  return (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

function getNavLinks(role: string) {
  const common = [
    { href: '/inbox', label: 'Messages' },
  ];

  switch (role) {
    case 'student':
      return [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/projects', label: 'Projects' },
        ...common,
        { href: '/settings', label: 'Settings' },
      ];
    case 'corporate_partner':
      return [
        { href: '/corporate', label: 'Dashboard' },
        { href: '/corporate/projects', label: 'My Listings' },
        { href: '/corporate/applications', label: 'Applications' },
        ...common,
      ];
    case 'educational_admin':
      return [
        { href: '/education', label: 'Dashboard' },
        { href: '/education/students', label: 'Students' },
        ...common,
      ];
    case 'admin':
      return [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/tenants', label: 'Tenants' },
        ...common,
      ];
    default:
      return [{ href: '/dashboard', label: 'Dashboard' }, ...common];
  }
}
