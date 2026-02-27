'use client';

/**
 * Notification Item
 *
 * Single notification entry within the bell dropdown.
 */

import { MessageSquare, FileText, UserCheck, Star, AlertCircle, Bell } from 'lucide-react';

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    subject: string;
    content: string | null;
    isRead: boolean;
    createdAt: string;
  };
  onMarkRead: () => void;
}

const typeIcons: Record<string, typeof Bell> = {
  message: MessageSquare,
  application: FileText,
  invite: UserCheck,
  assessment: Star,
  system: AlertCircle,
};

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const Icon = typeIcons[notification.type] || Bell;
  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <button
      onClick={() => { if (!notification.isRead) onMarkRead(); }}
      className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-3 transition-colors ${
        !notification.isRead ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
      }`}
    >
      <div className={`mt-0.5 rounded-full p-1.5 ${
        !notification.isRead
          ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
          : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
      }`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${!notification.isRead ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
          {notification.subject}
        </p>
        {notification.content && (
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {notification.content}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-1">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <div className="mt-2 h-2 w-2 rounded-full bg-teal-500 flex-shrink-0" />
      )}
    </button>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}
