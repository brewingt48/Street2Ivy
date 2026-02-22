'use client';

import { useState, useEffect } from 'react';
import { CoachingPanel } from '@/components/coaching/coaching-panel';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CoachingPage() {
  const [access, setAccess] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/usage')
      .then((r) => {
        if (r.ok) return r.json();
        if (r.status === 403) throw new Error('access_denied');
        throw new Error('network_error');
      })
      .then(() => {
        setAccess({ allowed: true });
      })
      .catch((err) => {
        if (err.message === 'access_denied') {
          setAccess({ allowed: false, reason: 'AI coaching is not enabled for your institution. Contact your administrator for access.' });
        } else {
          setAccess({ allowed: false, reason: 'Unable to verify AI access. Please check your connection and try again.' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!access?.allowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">AI Coaching Not Available</h2>
            <p className="text-sm text-slate-500 mb-4">
              {access?.reason || 'AI coaching is not enabled for your institution. Contact your administrator for access.'}
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)]">
      <CoachingPanel />
    </div>
  );
}
