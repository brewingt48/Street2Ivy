'use client';

/**
 * Create New Tenant — Full Admin Pipeline
 *
 * Multi-step form: Institution Details → Plan & Features → Admin Account → Review & Create
 * On success: shows credentials card with copy button.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Crown,
  GraduationCap,
  Palette,
  Shield,
  Sparkles,
  Users,
  Zap,
  Trophy,
} from 'lucide-react';

interface CreatedTenant {
  tenant: { id: string; subdomain: string; name: string; displayName: string; status: string };
  admin: { id: string; email: string; firstName: string; lastName: string };
  credentials: { email: string; password: string; loginUrl: string };
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small programs getting started',
    icon: GraduationCap,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    selectedColor: 'bg-blue-600 text-white border-blue-600',
    features: ['Up to 100 students', '10 project listings', 'Basic support', 'Standard branding'],
    limits: { maxStudents: 100, maxListings: 10 },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing institutions with advanced needs',
    icon: Zap,
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    selectedColor: 'bg-teal-600 text-white border-teal-600',
    features: ['Up to 500 students', '50 project listings', 'AI Coaching', 'Custom branding', 'Analytics dashboard'],
    limits: { maxStudents: 500, maxListings: 50 },
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale with premium support',
    icon: Crown,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    selectedColor: 'bg-amber-600 text-white border-amber-600',
    features: ['Unlimited students', 'Unlimited listings', 'AI Coaching', 'White-label branding', 'Advanced analytics', 'API access', 'Priority support'],
    limits: { maxStudents: -1, maxListings: -1 },
  },
];

const STEPS = ['Institution', 'Plan', 'Admin Account', 'Review'];

export default function NewTenantPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedTenant | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [subdomain, setSubdomain] = useState('');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [institutionDomain, setInstitutionDomain] = useState('');
  const [institutionType, setInstitutionType] = useState('university');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [plan, setPlan] = useState('professional');
  const [primaryColor, setPrimaryColor] = useState('#0F766E');
  const [secondaryColor, setSecondaryColor] = useState('#C8A951');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  // Athletic fields
  const [marketplaceType, setMarketplaceType] = useState<'institution' | 'athletic'>('institution');
  const [sport, setSport] = useState('');
  const [teamName, setTeamName] = useState('');
  const [conference, setConference] = useState('');

  const canAdvance = () => {
    switch (step) {
      case 0:
        return subdomain.length >= 2 && name.length >= 1;
      case 1:
        return !!plan;
      case 2:
        return adminEmail.includes('@') && adminFirstName.length >= 1 && adminLastName.length >= 1;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: subdomain.toLowerCase().trim(),
          name,
          displayName: displayName || name,
          institutionDomain: institutionDomain || undefined,
          institutionType,
          allowedDomains: allowedDomains ? allowedDomains.split(',').map((d: string) => d.trim()).filter(Boolean) : [],
          plan,
          adminEmail: adminEmail.trim(),
          adminFirstName: adminFirstName.trim(),
          adminLastName: adminLastName.trim(),
          branding: { primaryColor, secondaryColor },
          marketplaceType,
          sport: sport || undefined,
          teamName: teamName || undefined,
          conference: conference || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create tenant');
        return;
      }

      setCreated(data);
    } catch (err) {
      setError('Network error — please try again');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Success Screen ──
  if (created) {
    const allCreds = `Campus2Career Tenant Credentials\n${'─'.repeat(40)}\n\nInstitution: ${created.tenant.name}\nSubdomain: ${created.tenant.subdomain}.campus2career.com\n\nAdmin Login:\n  Email: ${created.credentials.email}\n  Password: ${created.credentials.password}\n  Login URL: ${created.credentials.loginUrl}\n\nPlease change the password after first login.`;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tenant Created!</h1>
          <p className="text-slate-500 mt-2">
            <strong>{created.tenant.name}</strong> is now live at{' '}
            <span className="text-teal-600 font-mono">{created.tenant.subdomain}.campus2career.com</span>
          </p>
        </div>

        {/* Credentials Card */}
        <Card className="border-2 border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Shield className="h-5 w-5" /> Admin Credentials
                </CardTitle>
                <CardDescription className="text-amber-600">
                  Save these credentials — the password cannot be retrieved after leaving this page.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => copyToClipboard(allCreds, 'all')}
              >
                {copied === 'all' ? <Check className="h-4 w-4 mr-1" /> : <ClipboardCopy className="h-4 w-4 mr-1" />}
                {copied === 'all' ? 'Copied!' : 'Copy All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-amber-600 uppercase tracking-wider">Admin Name</Label>
                <p className="font-medium text-slate-900 mt-1">
                  {created.admin.firstName} {created.admin.lastName}
                </p>
              </div>
              <div>
                <Label className="text-xs text-amber-600 uppercase tracking-wider">Role</Label>
                <p className="font-medium text-slate-900 mt-1">
                  <Badge className="bg-teal-100 text-teal-700 border-0">Educational Admin</Badge>
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-amber-200">
              <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-200">
                <div>
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Email</Label>
                  <p className="font-mono text-sm text-slate-900">{created.credentials.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(created.credentials.email, 'email')}
                >
                  {copied === 'email' ? <Check className="h-4 w-4 text-green-600" /> : <ClipboardCopy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-200">
                <div>
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Password</Label>
                  <p className="font-mono text-sm text-slate-900">{created.credentials.password}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(created.credentials.password, 'password')}
                >
                  {copied === 'password' ? <Check className="h-4 w-4 text-green-600" /> : <ClipboardCopy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-200">
                <div>
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Login URL</Label>
                  <p className="font-mono text-sm text-teal-600">{created.credentials.loginUrl}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(created.credentials.loginUrl, 'url')}
                >
                  {copied === 'url' ? <Check className="h-4 w-4 text-green-600" /> : <ClipboardCopy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-center pt-4">
          <Button variant="outline" onClick={() => router.push('/admin/tenants')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenants
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => router.push(`/admin/tenants/${created.tenant.id}`)}
          >
            View Tenant Details <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Multi-Step Form ──
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create New Tenant</h1>
          <p className="text-slate-500 mt-1">Set up a new institution on Campus2Career</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between px-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                i < step
                  ? 'bg-teal-600 text-white'
                  : i === step
                    ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-600'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`ml-2 text-sm font-medium hidden sm:inline ${
                i <= step ? 'text-slate-900 dark:text-white' : 'text-slate-400'
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-3 ${i < step ? 'bg-teal-600' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 0: Institution Details */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600" /> Institution Details
                </h2>
                <p className="text-sm text-slate-500 mt-1">Basic information about the institution</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subdomain">
                    Subdomain <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center">
                    <Input
                      id="subdomain"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="harvard"
                      className="rounded-r-none"
                    />
                    <span className="inline-flex items-center px-3 h-10 border border-l-0 rounded-r-md bg-slate-50 text-xs text-slate-500 whitespace-nowrap">
                      .campus2career.com
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instType">Institution Type <span className="text-red-500">*</span></Label>
                  <Select value={institutionType} onValueChange={setInstitutionType}>
                    <SelectTrigger id="instType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="university">University / College</SelectItem>
                      <SelectItem value="community_college">Community College</SelectItem>
                      <SelectItem value="hbcu">HBCU</SelectItem>
                      <SelectItem value="trade_school">Trade / Vocational School</SelectItem>
                      <SelectItem value="bootcamp">Bootcamp / Academy</SelectItem>
                      <SelectItem value="nonprofit">Non-Profit Organization</SelectItem>
                      <SelectItem value="government">Government Program</SelectItem>
                      <SelectItem value="workforce">Workforce Development</SelectItem>
                      <SelectItem value="corporate_training">Corporate Training</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instDomain">Primary Domain</Label>
                  <Input
                    id="instDomain"
                    value={institutionDomain}
                    onChange={(e) => setInstitutionDomain(e.target.value.toLowerCase())}
                    placeholder="harvard.edu"
                  />
                  <p className="text-xs text-slate-400">
                    Primary institution domain (can be .edu, .org, .com, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedDomains">Allowed Email Domains</Label>
                  <Input
                    id="allowedDomains"
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value.toLowerCase())}
                    placeholder="harvard.edu, fas.harvard.edu"
                  />
                  <p className="text-xs text-slate-400">
                    Comma-separated. Students must register with one of these email domains.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Institution Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Harvard University"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Harvard"
                />
                <p className="text-xs text-slate-400">Shown in the UI if different from full name</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">Brand Colors</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <div>
                      <p className="text-xs text-slate-500">Primary</p>
                      <p className="text-xs font-mono text-slate-400">{primaryColor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <div>
                      <p className="text-xs text-slate-500">Secondary</p>
                      <p className="text-xs font-mono text-slate-400">{secondaryColor}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Athletic Program Toggle */}
              <div className="border-t pt-5 space-y-4">
                <Label className="text-sm font-medium text-slate-700">Marketplace Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'institution' as const, label: 'Standard Institution', desc: 'University, college, or training program', icon: Building2 },
                    { value: 'athletic' as const, label: 'Athletic Program', desc: 'Sports team with alumni network', icon: Trophy },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isActive = marketplaceType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMarketplaceType(opt.value)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isActive
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                          <p className={`font-semibold text-sm ${isActive ? 'text-purple-700' : 'text-slate-900'}`}>
                            {opt.label}
                          </p>
                          {isActive && <Check className="h-4 w-4 text-purple-600 ml-auto" />}
                        </div>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {marketplaceType === 'athletic' && (
                  <div className="space-y-4 p-4 rounded-lg bg-purple-50/50 border border-purple-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Athletic Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Sport</Label>
                        <select
                          value={sport}
                          onChange={(e) => setSport(e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Select sport...</option>
                          {['Football', 'Basketball', 'Baseball', 'Soccer', 'Track & Field', 'Swimming', 'Lacrosse', 'Hockey', 'Tennis', 'Volleyball', 'Wrestling', 'Softball', 'Golf', 'Rowing', 'Other'].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Team Name</Label>
                        <Input
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="e.g. Crusaders"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Conference</Label>
                        <Input
                          value={conference}
                          onChange={(e) => setConference(e.target.value)}
                          placeholder="e.g. Patriot League"
                        />
                      </div>
                    </div>
                    <div className="rounded-lg bg-purple-100/50 p-3 text-xs text-purple-700">
                      <strong>Note:</strong> Athletic tenants automatically get shared network access enabled with full network tier.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Plan Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-600" /> Choose a Plan
                </h2>
                <p className="text-sm text-slate-500 mt-1">Select the plan that fits the institution&apos;s needs</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map((p) => {
                  const Icon = p.icon;
                  const isSelected = plan === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlan(p.id)}
                      className={`relative text-left rounded-xl border-2 p-5 transition-all ${
                        isSelected ? p.selectedColor + ' shadow-lg scale-[1.02]' : p.color + ' hover:shadow-md'
                      }`}
                    >
                      {p.recommended && (
                        <Badge className="absolute -top-2.5 left-4 bg-teal-600 text-white border-0 text-xs">
                          Recommended
                        </Badge>
                      )}
                      <Icon className={`h-6 w-6 mb-3 ${isSelected ? 'text-white' : ''}`} />
                      <h3 className="font-bold text-lg">{p.name}</h3>
                      <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'opacity-70'}`}>
                        {p.description}
                      </p>
                      <ul className={`mt-4 space-y-1.5 text-sm ${isSelected ? 'text-white/90' : ''}`}>
                        {p.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 flex-shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Admin Account */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" /> Admin Account
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Create the primary educational admin for this institution. A secure password will be auto-generated.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminFirstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="adminFirstName"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminLastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="adminLastName"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">
                  Admin Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@harvard.edu"
                />
                <p className="text-xs text-slate-400">
                  This will be the login email. A secure password will be generated automatically.
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 flex gap-3">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Security Note</p>
                  <p className="mt-1">
                    A 16-character password with mixed case, numbers, and symbols will be generated.
                    You&apos;ll be able to copy and share these credentials after creation. The admin should
                    change their password on first login.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-teal-600" /> Review & Create
                </h2>
                <p className="text-sm text-slate-500 mt-1">Verify the details before creating the tenant</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Institution</Label>
                    <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
                    {displayName && displayName !== name && (
                      <p className="text-sm text-slate-500">Display: {displayName}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Subdomain</Label>
                    <p className="font-mono text-teal-600">{subdomain}.campus2career.com</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Type</Label>
                    <p className="text-slate-700 capitalize">{institutionType.replace('_', ' ')}</p>
                  </div>
                  {institutionDomain && (
                    <div>
                      <Label className="text-xs text-slate-500 uppercase tracking-wider">Primary Domain</Label>
                      <p className="text-slate-700">{institutionDomain}</p>
                    </div>
                  )}
                  {allowedDomains && (
                    <div>
                      <Label className="text-xs text-slate-500 uppercase tracking-wider">Allowed Email Domains</Label>
                      <p className="text-slate-700">{allowedDomains}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Brand Colors</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: primaryColor }} />
                      <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: secondaryColor }} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Marketplace Type</Label>
                    <p className="text-slate-700 capitalize flex items-center gap-2">
                      {marketplaceType === 'athletic' ? (
                        <>
                          <Trophy className="h-4 w-4 text-purple-600" /> Athletic Program
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 text-slate-500" /> Standard Institution
                        </>
                      )}
                    </p>
                  </div>
                  {marketplaceType === 'athletic' && (
                    <>
                      {sport && (
                        <div>
                          <Label className="text-xs text-slate-500 uppercase tracking-wider">Sport</Label>
                          <p className="text-slate-700">{sport}</p>
                        </div>
                      )}
                      {teamName && (
                        <div>
                          <Label className="text-xs text-slate-500 uppercase tracking-wider">Team Name</Label>
                          <p className="text-slate-700">{teamName}</p>
                        </div>
                      )}
                      {conference && (
                        <div>
                          <Label className="text-xs text-slate-500 uppercase tracking-wider">Conference</Label>
                          <p className="text-slate-700">{conference}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">Network</Label>
                        <p className="text-green-600 text-sm">Shared network enabled (Full tier)</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Plan</Label>
                    <p className="font-semibold text-slate-900 dark:text-white capitalize">{plan}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 uppercase tracking-wider">Admin</Label>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {adminFirstName} {adminLastName}
                    </p>
                    <p className="text-sm text-slate-500">{adminEmail}</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {step < 3 ? (
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <>
                <Palette className="h-4 w-4 mr-2 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Create Tenant
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
