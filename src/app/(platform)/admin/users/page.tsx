'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface User { id: string; name: string; email: string; role: string; isActive: boolean; emailVerified: boolean; university: string | null; companyName: string | null; createdAt: string; }

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  student: 'bg-blue-100 text-blue-700',
  corporate_partner: 'bg-green-100 text-green-700',
  educational_admin: 'bg-amber-100 text-amber-700',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Users</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage platform users</p>
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
            <Card key={u.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                    {(u.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 ${roleColors[u.role] || 'bg-slate-100 text-slate-700'}`}>
                    {u.role.replace('_', ' ')}
                  </Badge>
                  {u.university && <span className="text-xs text-slate-400">{u.university}</span>}
                  {u.companyName && <span className="text-xs text-slate-400">{u.companyName}</span>}
                  <Badge className={u.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
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
    </div>
  );
}
