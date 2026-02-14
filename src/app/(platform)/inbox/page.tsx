/**
 * Inbox Page
 *
 * Unified messaging inbox. Placeholder — fully built in Phase 4.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Inbox } from 'lucide-react';

export const metadata = {
  title: 'Messages — Street2Ivy',
};

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Messages
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Your conversations and notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Coming in Phase 4</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Inbox className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Your conversations will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}
