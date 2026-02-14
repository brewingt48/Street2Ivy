'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditEntry { id: string; userId: string | null; userName: string | null; action: string; resource: string | null; resourceId: string | null; ipAddress: string | null; createdAt: string; }

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/audit-log?page=${page}`).then((r) => r.json()).then((d) => {
      setEntries(d.entries || []);
      setTotalPages(d.totalPages || 1);
    }).catch(console.error).finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Audit Log</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">System activity and changes</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No audit log entries</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-1">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="py-2 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{e.action}</Badge>
                    {e.resource && <span className="text-xs text-slate-400">{e.resource} {e.resourceId ? `#${e.resourceId.slice(0, 8)}` : ''}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{e.userName || 'System'} &middot; {e.ipAddress || 'N/A'}</p>
                </div>
                <span className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString()}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
