'use client';

/**
 * Corporate Applications Review Page
 *
 * View and respond to student applications.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FileText, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Mail, GraduationCap, Download, Star, Sparkles } from 'lucide-react';
import { ExportButton } from '@/components/analytics/export-button';
import { CandidateInsightsCard } from '@/components/corporate/candidate-insights-card';

interface Application {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: string;
  listingId: string;
  listingTitle: string;
  coverLetter: string | null;
  skills: string[];
  gpa: string | null;
  hoursPerWeek: number | null;
  interestReason: string | null;
  relevantCoursework: string | null;
  availabilityDate: string | null;
  submittedAt: string;
  respondedAt: string | null;
  initiatedBy: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Declined', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-500' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500' },
};

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Declined' },
  { key: 'completed', label: 'Completed' },
];

export default function CorporateApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Response dialog
  const [respondingApp, setRespondingApp] = useState<Application | null>(null);
  const [respondAction, setRespondAction] = useState<'accept' | 'decline' | 'complete'>('accept');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [responding, setResponding] = useState(false);

  // Onboarding fields (for accept action)
  const [workDescription, setWorkDescription] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [systemAccess, setSystemAccess] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Feedback fields (for complete action)
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackStrengths, setFeedbackStrengths] = useState('');
  const [feedbackImprovements, setFeedbackImprovements] = useState('');
  const [feedbackRecommend, setFeedbackRecommend] = useState(false);

  // Rating dialog state
  const [ratingApp, setRatingApp] = useState<Application | null>(null);
  const [studentRating, setStudentRating] = useState(0);
  const [studentReviewText, setStudentReviewText] = useState('');
  const [studentStrengths, setStudentStrengths] = useState('');
  const [studentImprovements, setStudentImprovements] = useState('');
  const [studentRecommend, setStudentRecommend] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Track which apps are already rated
  const [ratedApps, setRatedApps] = useState<Set<string>>(new Set());

  // AI Candidate Screening
  const [hasAiScreening, setHasAiScreening] = useState(false);
  const [aiInsightsAppId, setAiInsightsAppId] = useState<string | null>(null);

  const fetchApps = async (status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const res = await fetch(`/api/corporate/applications?${params}`);
      const data = await res.json();
      setApplications(data.applications || []);
      setCounts(data.counts || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApps(statusFilter); }, [statusFilter]);

  // Check AI access on mount
  useEffect(() => {
    fetch('/api/ai/usage')
      .then((r) => r.json())
      .then((data) => {
        const plan = data.plan || 'starter';
        setHasAiScreening(plan === 'professional' || plan === 'enterprise');
      })
      .catch(() => {});
  }, []);

  const handleRespond = async () => {
    if (!respondingApp) return;
    setResponding(true);
    try {
      const res = await csrfFetch(`/api/corporate/applications/${respondingApp.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: respondAction,
          rejectionReason: rejectionReason || undefined,
          reviewerNotes: reviewerNotes || undefined,
          ...(respondAction === 'accept' ? {
            onboarding: { workDescription, paymentInfo, systemAccess, contactName, contactEmail, contactPhone: contactPhone || undefined, additionalNotes: additionalNotes || undefined }
          } : {}),
          ...(respondAction === 'complete' ? {
            feedback: { overallRating: feedbackRating, overallComments: feedbackComments, strengths: feedbackStrengths || undefined, areasForImprovement: feedbackImprovements || undefined, recommendForFuture: feedbackRecommend }
          } : {}),
        }),
      });
      if (res.ok) {
        setRespondingApp(null);
        setRejectionReason('');
        setReviewerNotes('');
        setWorkDescription('');
        setPaymentInfo('');
        setSystemAccess('');
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setAdditionalNotes('');
        setFeedbackRating(0);
        setFeedbackComments('');
        setFeedbackStrengths('');
        setFeedbackImprovements('');
        setFeedbackRecommend(false);
        fetchApps(statusFilter);
      }
    } catch (err) { console.error(err); }
    finally { setResponding(false); }
  };

  const handleRateStudent = async () => {
    if (!ratingApp || studentRating === 0) return;
    setRatingSubmitting(true);
    try {
      const res = await csrfFetch('/api/corporate/rate-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: ratingApp.id,
          rating: studentRating,
          reviewText: studentReviewText || undefined,
          strengths: studentStrengths || undefined,
          areasForImprovement: studentImprovements || undefined,
          recommendForFuture: studentRecommend,
        }),
      });
      if (res.ok) {
        setRatedApps(prev => new Set(Array.from(prev).concat(ratingApp.id)));
        setRatingApp(null);
        setStudentRating(0);
        setStudentReviewText('');
        setStudentStrengths('');
        setStudentImprovements('');
        setStudentRecommend(false);
      }
    } catch (err) { console.error(err); }
    finally { setRatingSubmitting(false); }
  };

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Applications</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Review and respond to student applications</p>
          </div>
          <ExportButton
            data={applications as unknown as Record<string, unknown>[]}
            filename="applications-received"
            columns={[
              { key: 'studentName', label: 'Student' },
              { key: 'studentEmail', label: 'Email' },
              { key: 'listingTitle', label: 'Project' },
              { key: 'status', label: 'Status' },
              { key: 'gpa', label: 'GPA' },
              { key: 'submittedAt', label: 'Applied', format: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
              { key: 'respondedAt', label: 'Responded', format: (v) => v ? new Date(v as string).toLocaleDateString() : '' },
            ]}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Click a row to expand details &middot; <strong>Accept</strong> to approve a student &middot; <strong>Decline</strong> with an optional reason &middot; <strong>Complete</strong> when the project is finished
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = tab.key ? counts[tab.key] || 0 : totalCount;
          return (
            <Button key={tab.key} variant={statusFilter === tab.key ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(tab.key)} className={statusFilter === tab.key ? 'bg-teal-600 hover:bg-teal-700' : ''}>
              {tab.label}
              {count > 0 && <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">{count}</Badge>}
            </Button>
          );
        })}
      </div>

      {loading && (<div className="space-y-3">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-28" />))}</div>)}

      {!loading && applications.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">{statusFilter ? `No ${statusFilter} applications` : 'No applications yet'}</h3>
            <p className="text-sm text-slate-400 mt-1">Applications will appear here when students apply to your listings</p>
          </CardContent>
        </Card>
      )}

      {!loading && applications.length > 0 && (
        <div className="space-y-3">
          {applications.map((app) => {
            const config = statusConfig[app.status] || statusConfig.pending;
            const isExpanded = expandedId === app.id;
            return (
              <Card key={app.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : app.id)}>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                          {(app.studentName?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">{app.studentName}</h3>
                            <Badge className={`${config.color} border-0`}>{config.label}</Badge>
                            {app.initiatedBy === 'corporate' && (<Badge variant="outline" className="text-xs">Invited</Badge>)}
                          </div>
                          <p className="text-xs text-slate-500">{app.listingTitle} &middot; {new Date(app.submittedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {app.status === 'pending' && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setRespondingApp(app); setRespondAction('accept'); }}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => { setRespondingApp(app); setRespondAction('decline'); }}>
                            <XCircle className="h-3 w-3 mr-1" /> Decline
                          </Button>
                        </>
                      )}
                      {app.status === 'accepted' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setRespondingApp(app); setRespondAction('complete'); }}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      )}
                      {app.status === 'completed' && !ratedApps.has(app.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50"
                          onClick={() => { setRatingApp(app); }}
                        >
                          <Star className="h-3 w-3 mr-1" /> Rate Student
                        </Button>
                      )}
                      {app.status === 'completed' && ratedApps.has(app.id) && (
                        <Badge variant="outline" className="text-amber-600 border-amber-200">
                          <Star className="h-3 w-3 mr-1 fill-amber-400" /> Rated
                        </Badge>
                      )}
                      {(app.status === 'pending' || app.status === 'accepted') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-teal-600 hover:text-teal-700 border-teal-200 hover:bg-teal-50"
                          onClick={() => setAiInsightsAppId(aiInsightsAppId === app.id ? null : app.id)}
                        >
                          <Sparkles className="h-3 w-3 mr-1" /> AI Insights
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : app.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* AI Candidate Insights */}
                  {aiInsightsAppId === app.id && (
                    <div className="mt-4">
                      <CandidateInsightsCard
                        applicationId={app.id}
                        studentName={app.studentName}
                        hasAccess={hasAiScreening}
                        onClose={() => setAiInsightsAppId(null)}
                      />
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {app.studentEmail}</div>
                        {app.gpa && <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-slate-400" /> GPA: {app.gpa}</div>}
                        {app.hoursPerWeek && <div><span className="text-slate-400">Hours/week:</span> {app.hoursPerWeek}</div>}
                        {app.availabilityDate && <div><span className="text-slate-400">Available:</span> {app.availabilityDate}</div>}
                      </div>
                      {Array.isArray(app.skills) && app.skills.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Skills</p>
                          <div className="flex flex-wrap gap-1">{app.skills.map((s: string) => (<Badge key={s} variant="secondary" className="text-xs">{s}</Badge>))}</div>
                        </div>
                      )}
                      {app.coverLetter && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Cover Letter</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{app.coverLetter}</p>
                        </div>
                      )}
                      {app.interestReason && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Interest</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{app.interestReason}</p>
                        </div>
                      )}
                      {app.relevantCoursework && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Relevant Coursework</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{app.relevantCoursework}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Respond Dialog */}
      <Dialog open={!!respondingApp} onOpenChange={() => {
        setRespondingApp(null);
        setRejectionReason('');
        setReviewerNotes('');
        setWorkDescription('');
        setPaymentInfo('');
        setSystemAccess('');
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setAdditionalNotes('');
        setFeedbackRating(0);
        setFeedbackComments('');
        setFeedbackStrengths('');
        setFeedbackImprovements('');
        setFeedbackRecommend(false);
      }}>
        <DialogContent className={respondAction === 'accept' || respondAction === 'complete' ? 'max-w-2xl' : ''}>
          <DialogHeader>
            <DialogTitle>
              {respondAction === 'accept' ? 'Accept Application' : respondAction === 'decline' ? 'Decline Application' : 'Mark as Complete'}
            </DialogTitle>
            <DialogDescription>
              {respondingApp?.studentName} &mdash; {respondingApp?.listingTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {respondAction === 'decline' && (
              <div className="space-y-2">
                <Label>Reason for declining (optional)</Label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Provide feedback to the student..." rows={3} />
              </div>
            )}

            {respondAction === 'accept' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Onboarding Information</h3>
                  <Separator className="mt-2" />
                </div>
                <div className="space-y-2">
                  <Label>Work Description <span className="text-red-500">*</span></Label>
                  <Textarea value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} placeholder="Describe the work the student will be doing..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Setup <span className="text-red-500">*</span></Label>
                  <Textarea value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} placeholder="Payment details, rate, schedule..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>System Access <span className="text-red-500">*</span></Label>
                  <Textarea value={systemAccess} onChange={(e) => setSystemAccess(e.target.value)} placeholder="Tools, accounts, and systems the student will need access to..." rows={2} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name <span className="text-red-500">*</span></Label>
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Primary contact name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email <span className="text-red-500">*</span></Label>
                    <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@company.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone (optional)</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone number" />
                </div>
                <div className="space-y-2">
                  <Label>Additional Notes (optional)</Label>
                  <Textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="Any other information the student should know..." rows={2} />
                </div>
              </>
            )}

            {respondAction === 'complete' && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Student Feedback</h3>
                  <Separator className="mt-2" />
                </div>
                <div className="space-y-2">
                  <Label>Overall Rating <span className="text-red-500">*</span></Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setFeedbackRating(s)} className="p-0.5 focus:outline-none">
                        <Star className={`h-6 w-6 ${s <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                    {feedbackRating > 0 && <span className="ml-2 text-sm text-slate-500">{feedbackRating}/5</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Overall Comments <span className="text-red-500">*</span></Label>
                  <Textarea value={feedbackComments} onChange={(e) => setFeedbackComments(e.target.value)} placeholder="Share your overall feedback about the student's performance..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Strengths (optional)</Label>
                  <Textarea value={feedbackStrengths} onChange={(e) => setFeedbackStrengths(e.target.value)} placeholder="What did the student do well?" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Areas for Improvement (optional)</Label>
                  <Textarea value={feedbackImprovements} onChange={(e) => setFeedbackImprovements(e.target.value)} placeholder="What could the student improve on?" rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recommend-checkbox"
                    checked={feedbackRecommend}
                    onChange={(e) => setFeedbackRecommend(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <Label htmlFor="recommend-checkbox" className="cursor-pointer">Recommend this student for future opportunities</Label>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Internal notes (optional)</Label>
              <Textarea value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)} placeholder="Notes for your records..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondingApp(null)}>Cancel</Button>
            <Button
              onClick={handleRespond}
              disabled={
                responding ||
                (respondAction === 'accept' && (!workDescription || !paymentInfo || !systemAccess || !contactName || !contactEmail)) ||
                (respondAction === 'complete' && (feedbackRating === 0 || !feedbackComments))
              }
              className={respondAction === 'accept' ? 'bg-green-600 hover:bg-green-700' : respondAction === 'decline' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {responding ? 'Processing...' : respondAction === 'accept' ? 'Accept' : respondAction === 'decline' ? 'Decline' : 'Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Student Dialog */}
      <Dialog open={!!ratingApp} onOpenChange={() => { setRatingApp(null); setStudentRating(0); setStudentReviewText(''); setStudentStrengths(''); setStudentImprovements(''); setStudentRecommend(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" /> Rate Student
            </DialogTitle>
            <DialogDescription>
              Private rating for {ratingApp?.studentName} — {ratingApp?.listingTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating <span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setStudentRating(s)} className="p-0.5 focus:outline-none">
                    <Star className={`h-6 w-6 ${s <= studentRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
                {studentRating > 0 && <span className="ml-2 text-sm text-slate-500">{studentRating}/5</span>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Review (optional)</Label>
              <Textarea value={studentReviewText} onChange={(e) => setStudentReviewText(e.target.value)} placeholder="Share your experience working with this student..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Strengths (optional)</Label>
              <Textarea value={studentStrengths} onChange={(e) => setStudentStrengths(e.target.value)} placeholder="What did the student do well?" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Areas for Improvement (optional)</Label>
              <Textarea value={studentImprovements} onChange={(e) => setStudentImprovements(e.target.value)} placeholder="What could be improved?" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="rate-recommend" checked={studentRecommend} onChange={(e) => setStudentRecommend(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <Label htmlFor="rate-recommend" className="cursor-pointer">Recommend for future opportunities</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingApp(null)}>Cancel</Button>
            <Button onClick={handleRateStudent} disabled={ratingSubmitting || studentRating === 0} className="bg-amber-600 hover:bg-amber-700">
              {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
