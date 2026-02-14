'use client';

/**
 * Corporate Listings Management
 *
 * List, filter, and manage project listings.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Briefcase,
  Users,
  Edit,
  Eye,
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string | null;
  status: string;
  createdAt: string;
  applicationCount: number;
  pendingCount: number;
  compensation: string | null;
  remoteAllowed: boolean;
}

const statusStyles: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  published: { label: 'Published', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', color: 'bg-red-100 text-red-600' },
};

export default function CorporateProjectsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/listings')
      .then((r) => r.json())
      .then((data) => setListings(data.listings || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredListings = filter ? listings.filter((l) => l.status === filter) : listings;
  const counts = {
    all: listings.length,
    draft: listings.filter((l) => l.status === 'draft').length,
    published: listings.filter((l) => l.status === 'published').length,
    closed: listings.filter((l) => l.status === 'closed').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-32" />))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Listings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage your project listings</p>
        </div>
        <Button onClick={() => router.push('/corporate/projects/new')} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" /> New Listing
        </Button>
      </div>

      <div className="flex gap-2">
        {([
          { key: '', label: 'All', count: counts.all },
          { key: 'draft', label: 'Drafts', count: counts.draft },
          { key: 'published', label: 'Published', count: counts.published },
          { key: 'closed', label: 'Closed', count: counts.closed },
        ] as const).map((tab) => (
          <Button key={tab.key} variant={filter === tab.key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(tab.key)} className={filter === tab.key ? 'bg-teal-600 hover:bg-teal-700' : ''}>
            {tab.label}
            {tab.count > 0 && (<Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">{tab.count}</Badge>)}
          </Button>
        ))}
      </div>

      {filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">{filter ? `No ${filter} listings` : 'No listings yet'}</h3>
            <p className="text-sm text-slate-400 mt-1">Create your first listing to start finding talented students</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/corporate/projects/new')}>
              <Plus className="h-4 w-4 mr-2" /> Create Listing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredListings.map((listing) => {
            const style = statusStyles[listing.status] || statusStyles.draft;
            return (
              <Card key={listing.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-base truncate">{listing.title}</h3>
                        <Badge className={`${style.color} border-0 shrink-0`}>{style.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">{listing.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        {listing.category && <span>{listing.category}</span>}
                        {listing.compensation && <span>{listing.compensation}</span>}
                        {listing.remoteAllowed && <span className="text-teal-600">Remote</span>}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {listing.applicationCount} applicant{listing.applicationCount !== 1 ? 's' : ''}</span>
                        {listing.pendingCount > 0 && <span className="text-yellow-600 font-medium">{listing.pendingCount} pending</span>}
                        <span>Created {new Date(listing.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/corporate/projects/${listing.id}/edit`)}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {listing.status === 'published' && (
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${listing.id}`)}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
