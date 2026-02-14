'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  Star,
  Download,
} from 'lucide-react';
import { ExportButton } from '@/components/analytics/export-button';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  university: string | null;
  companyName: string | null;
  createdAt: string;
  approvalStatus: string | null;
  avgRating?: number | null;
  ratingCount?: number | null;
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  student: 'bg-blue-100 text-blue-700',
  corporate_partner: 'bg-green-100 text-green-700',
  educational_admin: 'bg-amber-100 text-amber-700',
};

const approvalColors: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  discontinued: 'bg-slate-100 text-slate-600',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionTarget, setActionTarget] = useState<User | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set('q', query);
    if (roleFilter) params.set('role', roleFilter);
    try {
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, query, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${actionTarget.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, reason: actionReason }),
      });
      if (res.ok) {
        setActionTarget(null);
        setActionType('');
        setActionReason('');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const openAction = (user: User, action: string) => {
    setActionTarget(user);
    setActionType(action);
    setActionReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Users</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage platform users — approve, reject, or discontinue accounts</p>
        </div>
        <ExportButton
          data={users as unknown as Record<string, unknown>[]}
          filename="platform-users"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'isActive', label: 'Active', format: (v) => v ? 'Yes' : 'No' },
            { key: 'approvalStatus', label: 'Approval Status' },
            { key: 'university', label: 'University' },
            { key: 'companyName', label: 'Company' },
            { key: 'createdAt', label: 'Created', format: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
          ]}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name or email..." value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchUsers(); } }} />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="corporate_partner">Corporate</SelectItem>
            <SelectItem value="educational_admin">Edu Admin</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setPage(1); fetchUsers(); }} className="bg-teal-600 hover:bg-teal-700">Search</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : users.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No users found</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className={u.approvalStatus === 'pending_approval' ? 'border-yellow-200 bg-yellow-50/30' : ''}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                    {(u.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{u.name}</p>
                      {u.role === 'corporate_partner' && u.avgRating ? (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {Number(u.avgRating).toFixed(1)}
                          <span className="text-slate-400">({u.ratingCount})</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 ${roleColors[u.role] || 'bg-slate-100 text-slate-700'}`}>
                    {u.role.replace('_', ' ')}
                  </Badge>
                  {u.university && <span className="text-xs text-slate-400">{u.university}</span>}
                  {u.companyName && <span className="text-xs text-slate-400">{u.companyName}</span>}

                  {/* Approval Status for Corporate Partners */}
                  {u.role === 'corporate_partner' && u.approvalStatus && (
                    <Badge className={`border-0 text-xs ${approvalColors[u.approvalStatus] || ''}`}>
                      {u.approvalStatus.replace('_', ' ')}
                    </Badge>
                  )}

                  {/* Status badge */}
                  <Badge className={u.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>

                  {/* Action buttons for corporate partners */}
                  {u.role === 'corporate_partner' && (
                    <div className="flex items-center gap-1 ml-2">
                      {u.approvalStatus === 'pending_approval' && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => openAction(u, 'approve')}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => openAction(u, 'reject')}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {(u.approvalStatus === 'approved' || u.isActive) && u.approvalStatus !== 'pending_approval' && (
                        <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => openAction(u, 'discontinue')}>
                          <Ban className="h-3.5 w-3.5 mr-1" /> Discontinue
                        </Button>
                      )}
                      {(u.approvalStatus === 'rejected' || u.approvalStatus === 'discontinued') && (
                        <Button variant="ghost" size="sm" className="h-7 text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => openAction(u, 'reactivate')}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reactivate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
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

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(open) => { if (!open) { setActionTarget(null); setActionType(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' && <><CheckCircle2 className="h-5 w-5 text-green-600" /> Approve Corporate Partner</>}
              {actionType === 'reject' && <><XCircle className="h-5 w-5 text-red-600" /> Reject Corporate Partner</>}
              {actionType === 'discontinue' && <><Ban className="h-5 w-5 text-red-600" /> Discontinue Corporate Partner</>}
              {actionType === 'reactivate' && <><RefreshCw className="h-5 w-5 text-teal-600" /> Reactivate Corporate Partner</>}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && `Approving ${actionTarget?.name} will grant them full access to create listings, search students, and send invitations.`}
              {actionType === 'reject' && `Rejecting ${actionTarget?.name} will prevent them from using the platform. They will be notified.`}
              {actionType === 'discontinue' && `Discontinuing ${actionTarget?.name} will immediately revoke their platform access. Their existing listings will be closed.`}
              {actionType === 'reactivate' && `Reactivating ${actionTarget?.name} will restore their platform access and allow them to manage listings again.`}
            </DialogDescription>
          </DialogHeader>

          {(actionType === 'reject' || actionType === 'discontinue') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={actionType === 'reject' ? 'Reason for rejection...' : 'Reason for discontinuation...'}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionTarget(null); setActionType(''); }}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
              className={
                actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                actionType === 'reactivate' ? 'bg-teal-600 hover:bg-teal-700' :
                'bg-red-600 hover:bg-red-700'
              }
            >
              {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : actionType === 'discontinue' ? 'Discontinue' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
