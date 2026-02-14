'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

interface WaitlistEntry { id: string; email: string; firstName: string | null; lastName: string | null; domain: string | null; institutionName: string | null; attempts: number; contacted: boolean; createdAt: string; }

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = filter ? `?contacted=${filter}` : '';
    fetch(`/api/admin/waitlist${params}`).then((r) => r.json()).then((d) => setEntries(d.entries || []))
      .catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Student Waitlist</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Students waiting for institution support</p>
      </div>

      <div className="flex gap-2">
        {[{ key: '', label: 'All' }, { key: 'false', label: 'Not Contacted' }, { key: 'true', label: 'Contacted' }].map((t) => (
          <Button key={t.key} variant={filter === t.key ? 'default' : 'outline'} size="sm"
            className={filter === t.key ? 'bg-teal-600 hover:bg-teal-700' : ''}
            onClick={() => setFilter(t.key)}>{t.label}</Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No waitlist entries</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{e.firstName} {e.lastName} ({e.email})</p>
                  <p className="text-xs text-slate-400">{e.institutionName || e.domain || 'Unknown'} &middot; {e.attempts} attempt(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={e.contacted ? 'bg-green-100 text-green-700 border-0' : 'bg-yellow-100 text-yellow-700 border-0'}>
                    {e.contacted ? 'Contacted' : 'Pending'}
                  </Badge>
                  <span className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
