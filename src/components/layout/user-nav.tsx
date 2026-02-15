'use client';

/**
 * User Nav Component
 *
 * Avatar dropdown menu with profile, settings, and logout.
 */

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut } from 'lucide-react';

interface UserNavProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();

  const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
  const displayName = user.displayName || `${user.firstName} ${user.lastName}`;

  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    // Redirect to tenant homepage if available, otherwise main site
    if (data.subdomain) {
      router.push(`/${data.subdomain}`);
    } else {
      router.push('/');
    }
    router.refresh();
  };

  const roleLabels: Record<string, string> = {
    admin: 'Platform Admin',
    student: 'Student',
    corporate_partner: 'Corporate Partner',
    educational_admin: 'Edu Admin',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-slate-500">{user.email}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1">
              {roleLabels[user.role] || user.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings/account')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
