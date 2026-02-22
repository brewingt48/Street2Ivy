'use client';

/**
 * Handshake Integration Management Page
 *
 * Setup and manage Handshake EDU API integration.
 */

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectionWizard } from '@/components/handshake/connection-wizard';
import { SyncStatusPanel } from '@/components/handshake/sync-status-panel';
import { Link2 } from 'lucide-react';

interface IntegrationStatus {
  connected: boolean;
  isActive?: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string;
  lastSyncError?: string | null;
  syncFrequency?: string;
  dataPermissions?: Record<string, boolean>;
  createdAt?: string;
}

export default function HandshakePage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/education/handshake/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch Handshake status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Handshake Integration</h1>
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Link2 className="h-6 w-6 text-teal-600" />
          Handshake Integration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect Handshake EDU API for enriched employer demand data
        </p>
      </div>

      {status?.connected ? (
        <SyncStatusPanel
          status={{
            isActive: status.isActive || false,
            lastSyncAt: status.lastSyncAt || null,
            lastSyncStatus: status.lastSyncStatus || 'never_synced',
            lastSyncError: status.lastSyncError || null,
            syncFrequency: status.syncFrequency || 'weekly',
            dataPermissions: status.dataPermissions || {},
            createdAt: status.createdAt || '',
          }}
          onRefresh={fetchStatus}
        />
      ) : (
        <ConnectionWizard onConnected={fetchStatus} />
      )}
    </div>
  );
}
