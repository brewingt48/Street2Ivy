'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap } from 'lucide-react';

interface Institution { domain: string; name: string; membershipStatus: string; aiCoachingEnabled: boolean; userCount: number; createdAt: string; }

export default function AdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/institutions').then((r) => r.json()).then((d) => setInstitutions(d.institutions || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', inactive: 'bg-slate-100 text-slate-500' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Institutions</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage registered institutions</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : institutions.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No institutions yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {institutions.map((inst) => (
            <Card key={inst.domain}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{inst.name}</p>
                  <p className="text-xs text-slate-400">{inst.domain}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 ${statusColors[inst.membershipStatus] || ''}`}>{inst.membershipStatus}</Badge>
                  {inst.aiCoachingEnabled && <Badge variant="outline" className="text-xs">AI Coaching</Badge>}
                  <span className="text-xs text-slate-400">{inst.userCount} users</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
