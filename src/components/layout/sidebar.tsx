'use client';

/**
 * Sidebar Component
 *
 * Role-based sidebar navigation for the platform.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  Search,
  Inbox,
  Settings,
  Users,
  Building2,
  FileText,
  GraduationCap,
  Shield,
  BarChart3,
  Newspaper,
  Globe,
  ClipboardList,
  Palette,
  Sparkles,
  Home,
  HelpCircle,
  TrendingUp,
  Mail,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  user: {
    role: string;
    firstName: string;
    lastName: string;
  };
  mobile?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar({ user, mobile }: SidebarProps) {
  const pathname = usePathname();

  const navItems = getNavItems(user.role);

  return (
    <div className={cn('flex flex-col h-full', mobile ? 'pt-6' : '')}>
      {mobile && (
        <div className="px-4 pb-4">
          <span className="text-xl font-bold text-teal-700 dark:text-teal-400">
            Campus2Career
          </span>
        </div>
      )}

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-2">
          {navItems.map((section, i) => (
            <div key={i}>
              {i > 0 && <Separator className="my-3" />}
              {section.title && (
                <h4 className="mb-1 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </h4>
              )}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

function getNavItems(role: string): NavSection[] {
  switch (role) {
    case 'student':
      return [
        {
          items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp },
            { href: '/projects', label: 'Browse Projects', icon: Search },
            { href: '/applications', label: 'My Applications', icon: FileText },
            { href: '/reviews', label: 'My Reviews', icon: Star },
            { href: '/invites', label: 'Invites', icon: Mail },
            { href: '/inbox', label: 'Messages', icon: Inbox },
          ],
        },
        {
          title: 'Account',
          items: [
            { href: '/report-issue', label: 'Report Issue', icon: AlertTriangle },
            { href: '/settings', label: 'Settings', icon: Settings },
          ],
        },
      ];

    case 'corporate_partner':
      return [
        {
          items: [
            { href: '/corporate', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/corporate/analytics', label: 'Analytics', icon: TrendingUp },
            { href: '/corporate/projects', label: 'My Listings', icon: Briefcase },
            { href: '/corporate/applications', label: 'Applications', icon: ClipboardList },
            { href: '/corporate/reviews', label: 'My Reviews', icon: Star },
            { href: '/corporate/search-students', label: 'Find Students', icon: Search },
            { href: '/inbox', label: 'Messages', icon: Inbox },
          ],
        },
        {
          title: 'Account',
          items: [
            { href: '/settings', label: 'Settings', icon: Settings },
          ],
        },
      ];

    case 'educational_admin':
      return [
        {
          items: [
            { href: '/education', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/education/analytics', label: 'Analytics', icon: TrendingUp },
            { href: '/education/students', label: 'Students', icon: GraduationCap },
            { href: '/education/corporates', label: 'Corporate Partners', icon: Briefcase },
            { href: '/education/reports', label: 'Issue Reports', icon: AlertTriangle },
            { href: '/education/waitlist', label: 'Waitlist', icon: ClipboardList },
            { href: '/inbox', label: 'Messages', icon: Inbox },
          ],
        },
        {
          title: 'Institution',
          items: [
            { href: '/education/settings', label: 'Branding & Settings', icon: Palette },
          ],
        },
        {
          title: 'Account',
          items: [
            { href: '/settings', label: 'Settings', icon: Settings },
          ],
        },
      ];

    case 'admin':
      return [
        {
          items: [
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
            { href: '/admin/users', label: 'Users', icon: Users },
            { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
            { href: '/admin/institutions', label: 'Institutions', icon: GraduationCap },
          ],
        },
        {
          title: 'Content',
          items: [
            { href: '/admin/homepage', label: 'Homepage Editor', icon: Home },
            { href: '/admin/faq', label: 'FAQ Manager', icon: HelpCircle },
            { href: '/admin/blog', label: 'Blog', icon: Newspaper },
            { href: '/admin/content', label: 'Landing Page (Raw)', icon: Globe },
          ],
        },
        {
          title: 'System',
          items: [
            { href: '/admin/waitlist', label: 'Waitlist', icon: ClipboardList },
            { href: '/admin/coaching', label: 'AI Coaching', icon: Sparkles },
            { href: '/admin/audit', label: 'Audit Log', icon: Shield },
            { href: '/admin/edu-applications', label: 'Edu Applications', icon: BarChart3 },
            { href: '/inbox', label: 'Messages', icon: Inbox },
          ],
        },
        {
          title: 'Account',
          items: [
            { href: '/settings', label: 'Settings', icon: Settings },
          ],
        },
      ];

    default:
      return [
        {
          items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          ],
        },
      ];
  }
}
