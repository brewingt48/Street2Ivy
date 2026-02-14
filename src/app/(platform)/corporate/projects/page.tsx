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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Briefcase,
  Users,
  Edit,
  Eye,
  Trash2,
  XCircle,
  AlertTriangle,
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
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [closeTarget, setCloseTarget] = useState<Listing | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetch('/api/listings')
      .then((r) => r.json())
      .then((data) => setListings(data.listings || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleClose = async () => {
    if (!closeTarget) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/listings/${closeTarget.id}/close`, { method: 'POST' });
      if (res.ok) {
        setListings((prev) => prev.map((l) => l.id === closeTarget.id ? { ...l, status: 'closed' } : l));
        setCloseTarget(null);
      }
    } catch (err) {
      console.error('Failed to close listing:', err);
    } finally {
      setClosing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/listings/${deleteTarget.id}/delete`, { method: 'DELETE' });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Failed to delete listing:', err);
    } finally {
      setDeleting(false);
    }
  };

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
                        <>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${listing.id}`)}>
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => setCloseTarget(listing)}>
                            <XCircle className="h-3 w-3 mr-1" /> Close
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(listing)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Close Confirmation Dialog */}
      <Dialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Close Listing
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to close &quot;{closeTarget?.title}&quot;? This will remove it from search results. Students can no longer apply, but existing applications will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTarget(null)}>Cancel</Button>
            <Button
              onClick={handleClose}
              disabled={closing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {closing ? 'Closing...' : 'Close Listing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Listing Permanently
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone. All applications, messages, and associated data will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
