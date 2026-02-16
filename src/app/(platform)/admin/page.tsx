'use client';

/**
 * Platform Admin Dashboard
 */

import { useState, useEffect } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Building2, Briefcase, FileText, Clock, GraduationCap, UserPlus, CheckCircle2, AlertCircle, Copy, Mail, Phone, HelpCircle, Save, ExternalLink, TrendingUp, ArrowRight } from 'lucide-react';

interface TestUser {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  exists: boolean;
  lastLogin: string | null;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [testPassword, setTestPassword] = useState('');
  const [loadingTestUsers, setLoadingTestUsers] = useState(false);

  // Support settings state
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [helpCenterUrl, setHelpCenterUrl] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [savingSupport, setSavingSupport] = useState(false);
  const [supportMsg, setSupportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Load support settings
    fetch('/api/admin/support-settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        setSupportEmail(s.supportEmail || '');
        setSupportPhone(s.supportPhone || '');
        setOfficeHours(s.officeHours || '');
        setHelpCenterUrl(s.helpCenterUrl || '');
        setSupportMessage(s.supportMessage || '');
      })
      .catch(console.error);
  }, []);

  const handleSaveSupport = async () => {
    setSavingSupport(true);
    setSupportMsg(null);
    try {
      const res = await csrfFetch('/api/admin/support-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportEmail: supportEmail || undefined,
          supportPhone,
          officeHours,
          helpCenterUrl: helpCenterUrl || '',
          supportMessage,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }
      setSupportMsg({ type: 'success', text: 'Support settings saved successfully' });
    } catch (err) {
      setSupportMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSavingSupport(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchTestUsers = async () => {
    setLoadingTestUsers(true);
    try {
      const res = await fetch('/api/admin/seed-test-users');
      const data = await res.json();
      setTestUsers(data.testUsers || []);
      setTestPassword(data.password || '');
    } catch {
      // ignore
    } finally {
      setLoadingTestUsers(false);
    }
  };

  const handleSeedUsers = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await csrfFetch('/api/admin/seed-test-users', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedResult({ message: data.message, type: 'success' });
        fetchTestUsers(); // Refresh the list
      } else {
        setSeedResult({ message: data.error || 'Failed', type: 'error' });
      }
    } catch {
      setSeedResult({ message: 'Failed to seed test users', type: 'error' });
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-10 w-64" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const users = (data?.users as Record<string, number>) || {};
  const listings = (data?.listings as Record<string, number>) || {};
  const apps = (data?.applications as Record<string, number>) || {};
  const recentUsers = (data?.recentUsers as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Platform administration and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/admin/users">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.totalUsers as number || 0}</div>
              <p className="text-xs text-slate-400">
                {users.student || 0} students, {users.corporate_partner || 0} corps
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/tenants">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{data?.activeTenants as number || 0}</div></CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listings</CardTitle>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.values(listings).reduce((a, b) => a + b, 0)}</div>
            <p className="text-xs text-slate-400">{listings.published || 0} published</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.values(apps).reduce((a, b) => a + b, 0)}</div>
            <p className="text-xs text-slate-400">{apps.pending || 0} pending</p>
          </CardContent>
        </Card>
        <Link href="/admin/waitlist">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
              <Clock className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{data?.waitlist as number || 0}</div></CardContent>
          </Card>
        </Link>
        <Link href="/admin/edu-applications">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Edu Apps</CardTitle>
              <GraduationCap className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values((data?.eduApplications as Record<string, number>) || {}).reduce((a, b) => a + b, 0)}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Link */}
      <div className="flex justify-end">
        <Link href="/admin/analytics">
          <Button variant="outline" size="sm" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            View Analytics
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Users</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div key={u.id as string} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{u.name as string}</p>
                    <p className="text-xs text-slate-400">{u.email as string}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{(u.role as string).replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Links</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { href: '/admin/users', label: 'Manage Users', icon: Users },
                { href: '/admin/tenants', label: 'Manage Tenants', icon: Building2 },
                { href: '/admin/institutions', label: 'Institutions', icon: GraduationCap },
                { href: '/admin/blog', label: 'Blog CMS', icon: FileText },
                { href: '/admin/waitlist', label: 'Waitlist', icon: Clock },
              ].map((link) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                  <link.icon className="h-4 w-4 text-slate-400" />
                  {link.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support & Contact Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-teal-600" />
            Support & Contact Settings
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Configure the support contact information displayed to all users on their dashboards.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportMsg && (
            <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
              supportMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {supportMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {supportMsg.text}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supportEmail" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Support Email
              </Label>
              <Input
                id="supportEmail"
                type="email"
                placeholder="support@yourdomain.com"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
              <p className="text-xs text-slate-400">Email address users will see for support requests</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportPhone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Support Phone
              </Label>
              <Input
                id="supportPhone"
                placeholder="+1 (555) 000-0000"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
              />
              <p className="text-xs text-slate-400">Optional phone number for support</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="officeHours" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Office Hours
              </Label>
              <Input
                id="officeHours"
                placeholder="Mon-Fri 9am-5pm EST"
                value={officeHours}
                onChange={(e) => setOfficeHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="helpCenterUrl" className="flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                Help Center URL
              </Label>
              <Input
                id="helpCenterUrl"
                placeholder="https://help.yourdomain.com"
                value={helpCenterUrl}
                onChange={(e) => setHelpCenterUrl(e.target.value)}
              />
              <p className="text-xs text-slate-400">Optional link to an external help center or FAQ</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportMessage">Support Message</Label>
            <Textarea
              id="supportMessage"
              placeholder="A helpful message displayed to users seeking support..."
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-slate-400">
              This message appears at the top of the Help & Support card on every user&apos;s dashboard
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveSupport} disabled={savingSupport} className="bg-teal-600 hover:bg-teal-700">
              <Save className="h-4 w-4 mr-2" />
              {savingSupport ? 'Saving...' : 'Save Support Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Users Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-teal-600" />
              Test User Profiles
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchTestUsers} disabled={loadingTestUsers}>
                {loadingTestUsers ? 'Loading...' : 'Check Status'}
              </Button>
              <Button size="sm" onClick={handleSeedUsers} disabled={seeding} className="bg-teal-600 hover:bg-teal-700">
                <UserPlus className="h-4 w-4 mr-1" />
                {seeding ? 'Creating...' : 'Seed Test Users'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Create one test account for each user type. All accounts share the same password.
          </p>
        </CardHeader>
        <CardContent>
          {seedResult && (
            <div className={`mb-4 p-3 rounded-md text-sm flex items-center gap-2 ${
              seedResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {seedResult.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {seedResult.message}
            </div>
          )}

          {testUsers.length > 0 ? (
            <div className="space-y-3">
              {testPassword && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shared Password</p>
                    <p className="text-sm font-mono font-semibold mt-0.5">{testPassword}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(testPassword)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              )}
              {testUsers.map((tu) => (
                <div key={tu.email} className={`flex items-center justify-between p-3 rounded-lg border ${
                  tu.exists ? 'border-green-200 bg-green-50/50' : 'border-slate-200'
                }`}>
                  <div>
                    <p className="text-sm font-medium">{tu.firstName} {tu.lastName}</p>
                    <p className="text-xs text-slate-400 font-mono">{tu.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{tu.role.replace('_', ' ')}</Badge>
                    {tu.exists ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-slate-400">Not Created</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Click &quot;Check Status&quot; to see test user accounts or &quot;Seed Test Users&quot; to create them</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
