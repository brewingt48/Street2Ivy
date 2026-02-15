'use client';

/**
 * My Reviews Page (Corporate)
 *
 * Two tabs: "Reviews I Received" (public ratings from students) and
 * "Reviews I Gave" (feedback the corporate gave to students).
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Briefcase, MessageSquare, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ---------- types ----------

interface ReceivedReview {
  id: string;
  studentName: string;
  projectTitle: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
}

interface GivenReview {
  id: string;
  studentName: string;
  projectTitle: string;
  rating: number;
  reviewText: string | null;
  strengths: string | null;
  areasForImprovement: string | null;
  recommendForFuture: boolean;
  createdAt: string;
}

// ---------- helpers ----------

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
      <span className="ml-1.5 text-sm text-slate-500">{rating}/5</span>
    </div>
  );
}

function LargeStarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-6 w-6 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </div>
  );
}

// ---------- tabs ----------

const TABS = [
  { key: 'received', label: 'Reviews I Received' },
  { key: 'given', label: 'Reviews I Gave' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ---------- component ----------

export default function CorporateReviewsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('received');

  // Received reviews (from students)
  const [receivedReviews, setReceivedReviews] = useState<ReceivedReview[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingReceived, setLoadingReceived] = useState(true);

  // Given reviews (to students)
  const [givenReviews, setGivenReviews] = useState<GivenReview[]>([]);
  const [loadingGiven, setLoadingGiven] = useState(true);

  useEffect(() => {
    async function fetchReceived() {
      setLoadingReceived(true);
      try {
        const res = await fetch('/api/corporate/ratings');
        const data = await res.json();
        setReceivedReviews(data.ratings || []);
        setAverageRating(data.average ?? null);
        setTotalCount(data.count ?? 0);
      } catch (err) {
        console.error('Failed to fetch received reviews:', err);
      } finally {
        setLoadingReceived(false);
      }
    }

    async function fetchGiven() {
      setLoadingGiven(true);
      try {
        const res = await fetch('/api/corporate/reviews-given');
        const data = await res.json();
        // Combine assessments and private ratings into a unified list
        const combined: GivenReview[] = [];
        if (data.assessments) {
          for (const a of data.assessments) {
            combined.push({
              id: String(a.id),
              studentName: a.studentName || 'Student',
              projectTitle: a.projectTitle || '',
              rating: Number(a.overallAverage) || 0,
              reviewText: a.overallComments || null,
              strengths: a.strengths || null,
              areasForImprovement: a.areasForImprovement || null,
              recommendForFuture: a.recommendForFuture || false,
              createdAt: a.createdAt,
            });
          }
        }
        if (data.privateRatings) {
          for (const r of data.privateRatings) {
            // Avoid duplicating if same student+project
            const exists = combined.some(c => c.studentName === r.studentName && c.projectTitle === r.projectTitle);
            if (!exists) {
              combined.push({
                id: r.id,
                studentName: r.studentName || 'Student',
                projectTitle: r.projectTitle || '',
                rating: Number(r.rating) || 0,
                reviewText: r.reviewText || null,
                strengths: r.strengths || null,
                areasForImprovement: r.areasForImprovement || null,
                recommendForFuture: r.recommendForFuture || false,
                createdAt: r.createdAt,
              });
            }
          }
        }
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setGivenReviews(combined);
      } catch (err) {
        console.error('Failed to fetch given reviews:', err);
      } finally {
        setLoadingGiven(false);
      }
    }

    fetchReceived();
    fetchGiven();
  }, []);

  const loading = activeTab === 'received' ? loadingReceived : loadingGiven;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            My Reviews
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View reviews from students and feedback you&apos;ve given
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/corporate')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            {tab.label}
            {tab.key === 'received' && totalCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                {totalCount}
              </Badge>
            )}
            {tab.key === 'given' && givenReviews.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                {givenReviews.length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Aggregate stats for received tab */}
      {activeTab === 'received' && !loadingReceived && totalCount > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {averageRating !== null ? averageRating.toFixed(1) : '--'}
                </p>
                <LargeStarRating rating={averageRating ?? 0} />
              </div>
              <div className="text-sm text-slate-500">
                <p>
                  Based on <span className="font-medium text-slate-700 dark:text-slate-300">{totalCount}</span>{' '}
                  {totalCount === 1 ? 'review' : 'reviews'} from students
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {/* Received Reviews */}
      {!loading && activeTab === 'received' && receivedReviews.length > 0 && (
        <div className="space-y-3">
          {receivedReviews.map((review) => (
            <Card key={review.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                          {(review.studentName?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">
                            {review.studentName}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {review.projectTitle} &middot;{' '}
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StarRating rating={review.rating} />
                    </div>
                  </div>

                  {review.reviewText && (
                    <div className="flex gap-2 ml-11">
                      <MessageSquare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {review.reviewText}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Given Reviews */}
      {!loading && activeTab === 'given' && givenReviews.length > 0 && (
        <div className="space-y-3">
          {givenReviews.map((review) => (
            <Card key={review.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                          {(review.studentName?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">
                              {review.studentName}
                            </h3>
                            {review.recommendForFuture && (
                              <Badge className="bg-green-100 text-green-700 border-0 shrink-0">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {review.projectTitle} &middot;{' '}
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StarRating rating={review.rating} />
                    </div>
                  </div>

                  {review.reviewText && (
                    <div className="flex gap-2 ml-11">
                      <MessageSquare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {review.reviewText}
                      </p>
                    </div>
                  )}

                  {(review.strengths || review.areasForImprovement) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-11">
                      {review.strengths && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1">
                            Strengths
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {review.strengths}
                          </p>
                        </div>
                      )}
                      {review.areasForImprovement && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-1">
                            Areas for Improvement
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {review.areasForImprovement}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty states */}
      {!loading && activeTab === 'received' && receivedReviews.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Star className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 dark:text-slate-300">
              No reviews received yet
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Student reviews will appear here after they complete projects with you
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && activeTab === 'given' && givenReviews.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600 dark:text-slate-300">
              No reviews given yet
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              After completing a project you can rate and provide feedback on students
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
