'use client';

/**
 * Browse Projects Page
 *
 * Search and filter published project listings with pagination.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Filter,
  School,
  Trophy,
  Star,
  Building2,
  Globe,
  TrendingUp,
} from 'lucide-react';

interface ProjectListing {
  id: string;
  title: string;
  description: string;
  category: string | null;
  location: string | null;
  remoteAllowed: boolean;
  compensation: string | null;
  hoursPerWeek: number | null;
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  maxApplicants: number | null;
  requiresNda: boolean;
  skillsRequired: string[];
  publishedAt: string;
  createdAt: string;
  applicationCount: number;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    companyName: string | null;
    companyWebsite: string | null;
    stockSymbol: string | null;
    isPubliclyTraded: boolean;
    alumniOf: string | null;
    sportsPlayed: string | null;
    avgRating: number | null;
    ratingCount: number | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState<ProjectListing[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [remoteOnly, setRemoteOnly] = useState(searchParams.get('remote') === 'true');
  const [alumniOfFilter, setAlumniOfFilter] = useState(searchParams.get('alumniOf') || '');
  const [sportsPlayedFilter, setSportsPlayedFilter] = useState(searchParams.get('sportsPlayed') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (category && category !== 'all') params.set('category', category);
      if (remoteOnly) params.set('remote', 'true');
      if (alumniOfFilter) params.set('alumniOf', alumniOfFilter);
      if (sportsPlayedFilter) params.set('sportsPlayed', sportsPlayedFilter);
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
      setPagination(data.pagination || null);
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, remoteOnly, alumniOfFilter, sportsPlayedFilter, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProjects();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setRemoteOnly(false);
    setAlumniOfFilter('');
    setSportsPlayedFilter('');
    setPage(1);
  };

  const hasActiveFilters = search || category || remoteOnly || alumniOfFilter || sportsPlayedFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Browse Projects
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Discover opportunities from top companies
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Use the search bar and filters to find projects. Filter by <strong>category</strong>, <strong>remote</strong> availability, partner <strong>alumni status</strong>, or <strong>sport</strong>. Click any project card to view details and apply.
        </p>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search projects by title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category || 'all'} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={remoteOnly ? 'default' : 'outline'}
              onClick={() => { setRemoteOnly(!remoteOnly); setPage(1); }}
              className={remoteOnly ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              <Wifi className="h-4 w-4 mr-2" />
              Remote
            </Button>
            <Input
              placeholder="Partner alumni of..."
              value={alumniOfFilter}
              onChange={(e) => setAlumniOfFilter(e.target.value)}
              className="w-[170px]"
            />
            <Input
              placeholder="Partner sport..."
              value={sportsPlayedFilter}
              onChange={(e) => setSportsPlayedFilter(e.target.value)}
              className="w-[160px]"
            />
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
              Search
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Results count */}
      {pagination && !loading && (
        <p className="text-sm text-slate-500">
          {pagination.total === 0
            ? 'No projects found'
            : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(
                pagination.page * pagination.limit,
                pagination.total
              )} of ${pagination.total} projects`}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      )}

      {/* Project Grid */}
      {!loading && listings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-tight group-hover:text-teal-600 transition-colors truncate">
                      {project.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                        <Building2 className="h-3.5 w-3.5 text-teal-600" />
                        {project.author.companyName || project.author.displayName || `${project.author.firstName} ${project.author.lastName}`}
                        {project.author.avgRating ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-600 ml-1">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            <span className="text-xs font-medium">{Number(project.author.avgRating).toFixed(1)}</span>
                          </span>
                        ) : null}
                      </span>
                      {project.author.companyName && (
                        <span className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                          Sponsor: {project.author.displayName || `${project.author.firstName} ${project.author.lastName}`}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {project.author.companyWebsite && (
                          <a
                            href={project.author.companyWebsite.startsWith('http') ? project.author.companyWebsite : `https://${project.author.companyWebsite}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-xs text-teal-600 hover:text-teal-700 hover:underline"
                          >
                            <Globe className="h-3 w-3" /> Website
                          </a>
                        )}
                        {project.author.isPubliclyTraded && project.author.stockSymbol ? (
                          <a
                            href={`https://www.google.com/finance/quote/${project.author.stockSymbol}:NYSE?hl=en`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <TrendingUp className="h-3 w-3" /> ${project.author.stockSymbol}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
                            Privately Held
                          </span>
                        )}
                      </span>
                      {project.category && (
                        <span className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                          <Briefcase className="h-3 w-3" /> Industry: {project.category}
                        </span>
                      )}
                      {project.author.alumniOf && (
                        <span className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                          <School className="h-3 w-3" /> Alumni: {project.author.alumniOf}
                        </span>
                      )}
                      {project.author.sportsPlayed && (
                        <span className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                          <Trophy className="h-3 w-3" /> {project.author.sportsPlayed}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {project.category && (
                    <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                      {project.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {project.description || 'No description provided'}
                </p>

                {/* Meta info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {project.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {project.location}
                    </span>
                  )}
                  {project.remoteAllowed && (
                    <span className="flex items-center gap-1 text-teal-600">
                      <Wifi className="h-3 w-3" />
                      Remote
                    </span>
                  )}
                  {project.compensation && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {project.compensation}
                    </span>
                  )}
                  {project.hoursPerWeek && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {project.hoursPerWeek} hrs/wk
                    </span>
                  )}
                  {project.duration && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {project.duration}
                    </span>
                  )}
                </div>

                {/* Skills */}
                {Array.isArray(project.skillsRequired) && project.skillsRequired.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.skillsRequired.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs px-2 py-0">
                        {skill}
                      </Badge>
                    ))}
                    {project.skillsRequired.length > 4 && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        +{project.skillsRequired.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {project.applicationCount} applicant{project.applicationCount !== 1 ? 's' : ''}
                  </span>
                  <span>
                    {new Date(project.publishedAt || project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && listings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 dark:text-slate-300">No projects found</h3>
            <p className="text-sm text-slate-400 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters or search terms'
                : 'Check back soon — new projects are posted regularly'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-slate-500 px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
