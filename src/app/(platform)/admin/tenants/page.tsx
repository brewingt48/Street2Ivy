'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Plus } from 'lucide-react';

interface Tenant { id: string; subdomain: string; name: string; displayName: string | null; status: string; institutionDomain: string | null; createdAt: string; }

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [name, setName] = useState('');
  const [instDomain, setInstDomain] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTenants = () => {
    setLoading(true);
    fetch('/api/admin/tenants').then((r) => r.json()).then((d) => setTenants(d.tenants || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleCreate = async () => {
    if (!subdomain || !name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, name, institutionDomain: instDomain || undefined }),
      });
      if (res.ok) {
        setShowCreate(false); setSubdomain(''); setName(''); setInstDomain('');
        fetchTenants();
      }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-700', inactive: 'bg-slate-100 text-slate-500', suspended: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tenants</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage multi-tenant instances</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Tenant
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : tenants.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No tenants yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tenants.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{t.name}</p>
                    <Badge className={`border-0 ${statusColors[t.status] || ''}`}>{t.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-400">{t.subdomain}.street2ivy.com</p>
                  {t.institutionDomain && <p className="text-xs text-slate-400">Institution: {t.institutionDomain}</p>}
                </div>
                <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Tenant</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Subdomain *</Label><Input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="e.g. harvard" /></div>
            <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Harvard University" /></div>
            <div className="space-y-2"><Label>Institution Domain</Label><Input value={instDomain} onChange={(e) => setInstDomain(e.target.value)} placeholder="e.g. harvard.edu" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !subdomain || !name} className="bg-teal-600 hover:bg-teal-700">
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
