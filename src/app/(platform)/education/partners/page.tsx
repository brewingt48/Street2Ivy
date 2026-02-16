'use client';

/**
 * Partners & Network Page — Education Admin
 *
 * Manage tenant partner relationships and browse the shared network.
 * Shows exclusive/preferred partners, network partners, and invite dialogs.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Globe,
  Building2,
  GraduationCap,
  Briefcase,
  Mail,
  ExternalLink,
  Plus,
  Search,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  slug: string;
  type: string;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  companySize: string | null;
  headquarters: string | null;
  isAlumniPartner: boolean;
  alumniInstitution: string | null;
  alumniSport: string | null;
  alumniGraduationYear: number | null;
  alumniPosition: string | null;
  status: string;
  visibility: string;
  verified: boolean;
  featured: boolean;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  createdAt: string;
  access: {
    id: string;
    relationship: string;
    featuredInTenant: boolean;
    isActive: boolean;
    acceptedAt: string | null;
  } | null;
  stats: {
    activeListings: number;
  };
}

export default function PartnersNetworkPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlumniInvite, setShowAlumniInvite] = useState(false);
  const [showCorporateInvite, setShowCorporateInvite] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Alumni invite form
  const [alumniForm, setAlumniForm] = useState({
    name: '',
    slug: '',
    industry: '',
    website: '',
    description: '',
    alumniInstitution: '',
    alumniSport: '',
    alumniGraduationYear: '',
    alumniPosition: '',
    primaryContactName: '',
    primaryContactEmail: '',
  });

  // Corporate invite form
  const [corporateForm, setCorporateForm] = useState({
    name: '',
    slug: '',
    industry: '',
    website: '',
    description: '',
    primaryContactName: '',
    primaryContactEmail: '',
  });

  const fetchPartners = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/tenant/partners?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setPartners(data.partners || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const exclusivePartners = partners.filter(
    (p) => p.access && (p.access.relationship === 'exclusive' || p.access.relationship === 'preferred')
  );

  const networkPartners = partners.filter(
    (p) => !p.access || (p.access.relationship !== 'exclusive' && p.access.relationship !== 'preferred')
  );

  const handleAlumniInvite = async () => {
    setInviteSubmitting(true);
    setInviteMsg(null);
    try {
      const slug = alumniForm.slug || alumniForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const res = await csrfFetch('/api/tenant/partners/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: alumniForm.name,
          slug,
          type: 'alumni',
          industry: alumniForm.industry || undefined,
          website: alumniForm.website || undefined,
          description: alumniForm.description || undefined,
          isAlumniPartner: true,
          alumniInstitution: alumniForm.alumniInstitution || undefined,
          alumniSport: alumniForm.alumniSport || undefined,
          alumniGraduationYear: alumniForm.alumniGraduationYear
            ? parseInt(alumniForm.alumniGraduationYear, 10)
            : undefined,
          alumniPosition: alumniForm.alumniPosition || undefined,
          primaryContactName: alumniForm.primaryContactName || undefined,
          primaryContactEmail: alumniForm.primaryContactEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }
      setInviteMsg({ type: 'success', text: 'Alumni partner invited successfully' });
      setShowAlumniInvite(false);
      setAlumniForm({
        name: '', slug: '', industry: '', website: '', description: '',
        alumniInstitution: '', alumniSport: '', alumniGraduationYear: '',
        alumniPosition: '', primaryContactName: '', primaryContactEmail: '',
      });
      fetchPartners();
    } catch (err) {
      setInviteMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send invite' });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleCorporateInvite = async () => {
    setInviteSubmitting(true);
    setInviteMsg(null);
    try {
      const slug = corporateForm.slug || corporateForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const res = await csrfFetch('/api/tenant/partners/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: corporateForm.name,
          slug,
          type: 'corporate',
          industry: corporateForm.industry || undefined,
          website: corporateForm.website || undefined,
          description: corporateForm.description || undefined,
          isAlumniPartner: false,
          primaryContactName: corporateForm.primaryContactName || undefined,
          primaryContactEmail: corporateForm.primaryContactEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }
      setInviteMsg({ type: 'success', text: 'Corporate partner invited successfully' });
      setShowCorporateInvite(false);
      setCorporateForm({
        name: '', slug: '', industry: '', website: '', description: '',
        primaryContactName: '', primaryContactEmail: '',
      });
      fetchPartners();
    } catch (err) {
      setInviteMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send invite' });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const relationshipColors: Record<string, string> = {
    exclusive: 'bg-purple-100 text-purple-700',
    preferred: 'bg-blue-100 text-blue-700',
    standard: 'bg-slate-100 text-slate-600',
    network: 'bg-teal-100 text-teal-700',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-10 w-64" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Partners & Network</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your institution&apos;s partner relationships and browse the shared network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAlumniInvite(true)}>
            <GraduationCap className="h-4 w-4 mr-2" />
            Invite Alumni Partner
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setShowCorporateInvite(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Corporate Partner
          </Button>
        </div>
      </div>

      {/* Status Message */}
      {inviteMsg && (
        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
          inviteMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          {inviteMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {inviteMsg.text}
          <button className="ml-auto text-xs underline" onClick={() => setInviteMsg(null)}>Dismiss</button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search partners by name or industry..."
          className="pl-10"
        />
      </div>

      {/* What's the difference? Explainer */}
      <Card className="border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
        <CardContent className="pt-4 pb-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 h-fit">
                <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Exclusive Partners
                  <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">Exclusive</Badge>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Partners recruited directly by your institution. They work <strong>only with your students</strong> and
                  don&apos;t appear on any other institution&apos;s dashboard. Ideal for alumni mentors and dedicated corporate sponsors.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 h-fit">
                <Globe className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Network Partners
                  <Badge className="bg-teal-100 text-teal-700 border-0 text-xs">Network</Badge>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Partners from the <strong>shared Proveground talent engine</strong>. They post projects visible to students
                  across multiple institutions. Your students can apply, but so can students from other schools.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <Star className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{exclusivePartners.length}</p>
              <p className="text-xs text-slate-500">Exclusive Partners</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30">
              <Globe className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{networkPartners.length}</p>
              <p className="text-xs text-slate-500">Network Partners</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{partners.length}</p>
              <p className="text-xs text-slate-500">Total Partners</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exclusive Partners Section */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Star className="h-5 w-5 text-purple-500" />
          Exclusive Partners
          <Badge className="bg-purple-100 text-purple-700 border-0 ml-1">{exclusivePartners.length}</Badge>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 ml-7">
          These partners work exclusively with your institution. Only your students can see their projects and apply.
        </p>

        {exclusivePartners.length === 0 ? (
          <Card className="border-dashed border-purple-200 dark:border-purple-800">
            <CardContent className="text-center py-10">
              <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/30 mx-auto mb-3 flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-300" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No exclusive partners yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Invite alumni or corporate partners to create a private, dedicated network just for your students.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setShowAlumniInvite(true)}>
                  <GraduationCap className="h-3.5 w-3.5 mr-1.5" /> Invite Alumni
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCorporateInvite(true)}>
                  <Building2 className="h-3.5 w-3.5 mr-1.5" /> Invite Corporate
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exclusivePartners.map((partner) => (
              <Card key={partner.id} className="hover:border-purple-200 dark:hover:border-purple-800 transition-colors border-l-4 border-l-purple-400">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                        {partner.isAlumniPartner ? (
                          <GraduationCap className="h-5 w-5 text-purple-600" />
                        ) : (
                          <Building2 className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{partner.name}</CardTitle>
                        {partner.industry && (
                          <p className="text-xs text-slate-400">{partner.industry}</p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                      {partner.access?.relationship === 'preferred' ? 'Preferred' : 'Exclusive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {partner.isAlumniPartner && (
                    <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 dark:border-purple-700 dark:text-purple-300">
                      <GraduationCap className="h-3 w-3 mr-1" />
                      Alumni{partner.alumniGraduationYear ? ` '${String(partner.alumniGraduationYear).slice(2)}` : ''}
                      {partner.alumniSport ? ` - ${partner.alumniSport}` : ''}
                      {partner.alumniPosition ? ` (${partner.alumniPosition})` : ''}
                    </Badge>
                  )}

                  {partner.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{partner.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {partner.stats.activeListings} listing{partner.stats.activeListings !== 1 ? 's' : ''}
                      </span>
                      {partner.verified && (
                        <Badge className="bg-green-50 text-green-700 border-0 text-xs py-0">Verified</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {partner.primaryContactEmail && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <a href={`mailto:${partner.primaryContactEmail}`}>
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {partner.website && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <a href={partner.website} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Network Partners Section */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <Globe className="h-5 w-5 text-teal-600" />
          Network Partners
          <Badge className="bg-teal-100 text-teal-700 border-0 ml-1">{networkPartners.length}</Badge>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 ml-7">
          Shared talent engine partners whose projects are visible to students across multiple institutions.
        </p>

        {networkPartners.length === 0 ? (
          <Card className="border-dashed border-teal-200 dark:border-teal-800">
            <CardContent className="text-center py-10">
              <div className="h-12 w-12 rounded-full bg-teal-50 dark:bg-teal-900/30 mx-auto mb-3 flex items-center justify-center">
                <Globe className="h-6 w-6 text-teal-300" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No network partners available yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                When corporate partners join the Proveground shared talent engine, their projects will appear here for your students to apply to.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {networkPartners.map((partner) => (
              <Card key={partner.id} className="hover:border-teal-200 dark:hover:border-teal-800 transition-colors border-l-4 border-l-teal-400">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                      {partner.isAlumniPartner ? (
                        <GraduationCap className="h-4 w-4 text-teal-600" />
                      ) : (
                        <Building2 className="h-4 w-4 text-teal-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{partner.name}</p>
                      <div className="flex items-center gap-2">
                        {partner.industry && (
                          <span className="text-xs text-slate-400">{partner.industry}</span>
                        )}
                        {partner.isAlumniPartner && (
                          <Badge variant="outline" className="text-xs py-0 h-4">Alumni</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {partner.stats.activeListings} listing{partner.stats.activeListings !== 1 ? 's' : ''}
                    </span>
                    <Badge className="bg-teal-100 text-teal-700 border-0 text-xs">
                      Shared Network
                    </Badge>
                    {partner.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={partner.website} target="_blank" rel="noopener noreferrer">
                          View <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Alumni Invite Dialog */}
      <Dialog open={showAlumniInvite} onOpenChange={setShowAlumniInvite}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-teal-600" />
              Invite Alumni Partner
            </DialogTitle>
            <DialogDescription>
              Invite an alumni to join as a corporate partner for your institution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Company / Organization Name *</Label>
                <Input
                  value={alumniForm.name}
                  onChange={(e) => setAlumniForm({ ...alumniForm, name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input
                  value={alumniForm.slug}
                  onChange={(e) => setAlumniForm({ ...alumniForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="acme-corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={alumniForm.primaryContactName}
                  onChange={(e) => setAlumniForm({ ...alumniForm, primaryContactName: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={alumniForm.primaryContactEmail}
                  onChange={(e) => setAlumniForm({ ...alumniForm, primaryContactEmail: e.target.value })}
                  placeholder="john@acme.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={alumniForm.industry}
                onChange={(e) => setAlumniForm({ ...alumniForm, industry: e.target.value })}
                placeholder="Technology, Finance, etc."
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Alumni Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input
                    value={alumniForm.alumniInstitution}
                    onChange={(e) => setAlumniForm({ ...alumniForm, alumniInstitution: e.target.value })}
                    placeholder="University name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Graduation Year</Label>
                  <Input
                    value={alumniForm.alumniGraduationYear}
                    onChange={(e) => setAlumniForm({ ...alumniForm, alumniGraduationYear: e.target.value })}
                    placeholder="2015"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-2">
                  <Label>Sport</Label>
                  <Input
                    value={alumniForm.alumniSport}
                    onChange={(e) => setAlumniForm({ ...alumniForm, alumniSport: e.target.value })}
                    placeholder="Basketball, Football, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Input
                    value={alumniForm.alumniPosition}
                    onChange={(e) => setAlumniForm({ ...alumniForm, alumniPosition: e.target.value })}
                    placeholder="Point Guard, Quarterback, etc."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message / Description</Label>
              <Textarea
                value={alumniForm.description}
                onChange={(e) => setAlumniForm({ ...alumniForm, description: e.target.value })}
                placeholder="Brief description of the partner or invitation message..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlumniInvite(false)}>Cancel</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleAlumniInvite}
              disabled={inviteSubmitting || !alumniForm.name}
            >
              {inviteSubmitting ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Corporate Invite Dialog */}
      <Dialog open={showCorporateInvite} onOpenChange={setShowCorporateInvite}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              Invite Corporate Partner
            </DialogTitle>
            <DialogDescription>
              Invite a company to partner with your institution on Proveground.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  value={corporateForm.name}
                  onChange={(e) => setCorporateForm({ ...corporateForm, name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input
                  value={corporateForm.slug}
                  onChange={(e) => setCorporateForm({ ...corporateForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="acme-corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={corporateForm.primaryContactName}
                  onChange={(e) => setCorporateForm({ ...corporateForm, primaryContactName: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={corporateForm.primaryContactEmail}
                  onChange={(e) => setCorporateForm({ ...corporateForm, primaryContactEmail: e.target.value })}
                  placeholder="jane@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  value={corporateForm.industry}
                  onChange={(e) => setCorporateForm({ ...corporateForm, industry: e.target.value })}
                  placeholder="Technology, Finance, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={corporateForm.website}
                  onChange={(e) => setCorporateForm({ ...corporateForm, website: e.target.value })}
                  placeholder="https://company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={corporateForm.description}
                onChange={(e) => setCorporateForm({ ...corporateForm, description: e.target.value })}
                placeholder="Brief description of the company and partnership goals..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCorporateInvite(false)}>Cancel</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleCorporateInvite}
              disabled={inviteSubmitting || !corporateForm.name}
            >
              {inviteSubmitting ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
