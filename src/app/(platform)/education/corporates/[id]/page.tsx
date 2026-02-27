'use client';

/**
 * Education Admin — Corporate Partner Profile
 *
 * Read-only detail view of a corporate partner user showing their
 * company info, stats, ratings, and project listings.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Mail,
  Star,
  FileText,
  Users,
  Calendar,
  Globe,
} from 'lucide-react';

interface CorporateDetail {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
  stockSymbol: string | null;
  isPubliclyTraded: boolean;
  isActive: boolean;
  approvalStatus: string;
  createdAt: string;
  activeListings: number;
  totalListings: number;
  totalApplications: number;
  avgRating: number;
  ratingCount: number;
}

interface Listing {
  id: string;
  title: string;
  status: string;
  category: string | null;
  createdAt: string;
  publishedAt: string | null;
  applicationCount: number;
}

const statusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-slate-100 text-slate-600',
  closed: 'bg-red-100 text-red-700',
  archived: 'bg-slate-100 text-slate-500',
};

export default function CorporateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [corporate, setCorporate] = useState<CorporateDetail | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/education/corporates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCorporate(data.corporate);
        setListings(data.listings || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!corporate) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Corporate partner not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Corporate Partners
      </Button>

      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-xl shrink-0">
              {(corporate.name?.[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{corporate.name}</h1>
                <Badge className={corporate.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                  {corporate.isActive ? 'Active' : 'Blocked'}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{corporate.email}</p>
              {corporate.companyName && (
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 dark:text-slate-300">
                  <Building2 className="h-4 w-4" />
                  <span>{corporate.companyName}</span>
                  {corporate.companyIndustry && (
                    <Badge variant="outline" className="text-xs">{corporate.companyIndustry}</Badge>
                  )}
                  {corporate.isPubliclyTraded && corporate.stockSymbol && (
                    <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">${corporate.stockSymbol}</Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                {corporate.companyWebsite && (
                  <a href={corporate.companyWebsite.startsWith('http') ? corporate.companyWebsite : `https://${corporate.companyWebsite}`}
                     target="_blank" rel="noopener noreferrer"
                     className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
                <a href={`mailto:${corporate.email}`} className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </a>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Joined {new Date(corporate.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Briefcase className="h-3.5 w-3.5" /> Active Listings
            </div>
            <p className="text-2xl font-bold">{corporate.activeListings}</p>
            <p className="text-xs text-slate-400">{corporate.totalListings} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Users className="h-3.5 w-3.5" /> Applications
            </div>
            <p className="text-2xl font-bold">{corporate.totalApplications}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Star className="h-3.5 w-3.5" /> Avg Rating
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{corporate.avgRating > 0 ? corporate.avgRating.toFixed(1) : '\u2014'}</p>
              {corporate.ratingCount > 0 && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`h-3.5 w-3.5 ${star <= Math.round(corporate.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  ))}
                  <span className="text-xs text-slate-400 ml-1">({corporate.ratingCount})</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Project Listings
          </CardTitle>
          <CardDescription>{listings.length} listing{listings.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No listings yet.</p>
          ) : (
            <div className="space-y-2">
              {listings.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <Link href={`/projects/${l.id}`} className="text-sm font-medium hover:text-teal-600 transition-colors">
                      {l.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {l.category && <span className="text-xs text-slate-400">{l.category}</span>}
                      {l.publishedAt && (
                        <span className="text-xs text-slate-400">
                          Published {new Date(l.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-slate-400">{l.applicationCount} app{l.applicationCount !== 1 ? 's' : ''}</span>
                    <Badge className={`text-xs border-0 ${statusColors[l.status] || 'bg-slate-100 text-slate-600'}`}>
                      {l.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
