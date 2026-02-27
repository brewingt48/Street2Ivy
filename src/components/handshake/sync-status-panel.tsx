'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, RefreshCw, Loader2, Settings } from 'lucide-react';

interface SyncStatusPanelProps {
  status: {
    isActive: boolean;
    lastSyncAt: string | null;
    lastSyncStatus: string;
    lastSyncError: string | null;
    syncFrequency: string;
    dataPermissions: Record<string, boolean>;
    createdAt: string;
  };
  onRefresh: () => void;
}

export function SyncStatusPanel({ status, onRefresh }: SyncStatusPanelProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/education/handshake/sync', { method: 'POST' });
      const result = await res.json();
      setSyncResult(result);
      onRefresh();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Connection Status</CardTitle>
            <Badge variant={status.isActive ? 'default' : 'destructive'} className={status.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>
              {status.isActive ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Last Sync</p>
              <p className="text-sm font-medium">{formatDate(status.lastSyncAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <div className="flex items-center gap-1">
                {status.lastSyncStatus === 'success' ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                ) : status.lastSyncStatus === 'failed' ? (
                  <AlertCircle className="h-3 w-3 text-red-600" />
                ) : null}
                <p className="text-sm font-medium capitalize">{status.lastSyncStatus || 'Never synced'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Frequency</p>
              <p className="text-sm font-medium capitalize">{status.syncFrequency}</p>
            </div>
          </div>

          {status.lastSyncError && (
            <div className="bg-red-50 text-red-700 text-xs p-2 rounded">
              {status.lastSyncError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Action */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manual Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {syncResult && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              {syncResult.success ? (
                <>
                  <p className="text-emerald-700 font-medium">Sync complete!</p>
                  <p className="text-slate-600">
                    Skills updated: {(syncResult.demand as Record<string, unknown>)?.skillsUpdated as number || 0} |
                    Jobs analyzed: {(syncResult.demand as Record<string, unknown>)?.jobsAnalyzed as number || 0} |
                    Roles: {(syncResult.roles as Record<string, unknown>)?.rolesCreated as number || 0} created,
                    {' '}{(syncResult.roles as Record<string, unknown>)?.rolesUpdated as number || 0} updated
                  </p>
                </>
              ) : (
                <p className="text-red-700">Sync failed: {syncResult.error as string}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Data Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(status.dataPermissions || {}).map(([key, enabled]) => (
              <Badge key={key} variant={enabled ? 'default' : 'outline'} className={enabled ? 'bg-teal-100 text-teal-700' : 'text-slate-400'}>
                {key}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Connected since {formatDate(status.createdAt)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
