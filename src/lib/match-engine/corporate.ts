/**
 * ProveGround Match Engine™ — Corporate Attractiveness Scoring
 *
 * Reverse-direction scoring: how attractive is a listing/company
 * to students? Used to help students evaluate opportunities and
 * for platform analytics.
 *
 * Signals:
 *  - Compensation competitiveness
 *  - Work flexibility (remote, hours)
 *  - Company reputation (ratings)
 *  - Student completion rate (company side)
 *  - Growth opportunity indicators
 */

import { sql } from '@/lib/db';

export interface CorporateAttractivenessResult {
  listingId: string;
  authorId: string;
  attractivenessScore: number;
  signals: {
    compensation: { score: number; details: Record<string, unknown> };
    flexibility: { score: number; details: Record<string, unknown> };
    reputation: { score: number; details: Record<string, unknown> };
    completionRate: { score: number; details: Record<string, unknown> };
    growthOpportunity: { score: number; details: Record<string, unknown> };
  };
  sampleSize: number;
}

/**
 * Compute the attractiveness score for a listing.
 */
export async function computeAttractivenessScore(
  listingId: string
): Promise<CorporateAttractivenessResult | null> {
  // Fetch listing details
  const [listing] = await sql`
    SELECT l.id, l.author_id, l.compensation, l.is_paid, l.remote_allowed,
           l.hours_per_week, l.duration, l.category, l.title, l.description,
           u.company_name
    FROM listings l
    LEFT JOIN users u ON u.id = l.author_id
    WHERE l.id = ${listingId}
  `;
  if (!listing) return null;

  const authorId = listing.author_id as string;

  // Fetch company-level stats
  const companyStats = await getCompanyStats(authorId);

  // --- Signal 1: Compensation ---
  const compensationSignal = scoreCompensation(listing);

  // --- Signal 2: Flexibility ---
  const flexibilitySignal = scoreFlexibility(listing);

  // --- Signal 3: Reputation ---
  const reputationSignal = scoreReputation(companyStats);

  // --- Signal 4: Completion rate ---
  const completionSignal = scoreCompletionRate(companyStats);

  // --- Signal 5: Growth opportunity ---
  const growthSignal = scoreGrowthOpportunity(listing);

  // --- Weighted composite ---
  // Compensation: 25%, Flexibility: 20%, Reputation: 25%, Completion: 15%, Growth: 15%
  const attractivenessScore = Math.round(
    compensationSignal.score * 0.25 +
    flexibilitySignal.score * 0.20 +
    reputationSignal.score * 0.25 +
    completionSignal.score * 0.15 +
    growthSignal.score * 0.15
  );

  const result: CorporateAttractivenessResult = {
    listingId,
    authorId,
    attractivenessScore: Math.min(100, Math.max(0, attractivenessScore)),
    signals: {
      compensation: compensationSignal,
      flexibility: flexibilitySignal,
      reputation: reputationSignal,
      completionRate: completionSignal,
      growthOpportunity: growthSignal,
    },
    sampleSize: companyStats.totalListings,
  };

  // Cache the result
  await sql`
    INSERT INTO corporate_attractiveness_scores
      (listing_id, author_id, tenant_id, attractiveness_score, signal_breakdown, sample_size)
    VALUES (${listingId}, ${authorId}, ${listing.tenant_id || null},
            ${result.attractivenessScore}, ${JSON.stringify(result.signals)}::jsonb,
            ${companyStats.totalListings})
    ON CONFLICT (listing_id) DO UPDATE
    SET attractiveness_score = EXCLUDED.attractiveness_score,
        signal_breakdown = EXCLUDED.signal_breakdown,
        sample_size = EXCLUDED.sample_size,
        is_stale = FALSE,
        computed_at = NOW(),
        updated_at = NOW()
  `;

  return result;
}

/**
 * Get aggregate attractiveness for a company (across all their listings).
 */
export async function getCompanyAttractiveness(
  authorId: string
): Promise<{ avgScore: number; listingCount: number; scores: { listingId: string; score: number }[] }> {
  const rows = await sql`
    SELECT listing_id, attractiveness_score
    FROM corporate_attractiveness_scores
    WHERE author_id = ${authorId}
    ORDER BY attractiveness_score DESC
  `;

  if (rows.length === 0) {
    return { avgScore: 0, listingCount: 0, scores: [] };
  }

  const avgScore = Math.round(
    rows.reduce((sum, r) => sum + Number(r.attractiveness_score), 0) / rows.length
  );

  return {
    avgScore,
    listingCount: rows.length,
    scores: rows.map((r) => ({
      listingId: r.listing_id as string,
      score: Number(r.attractiveness_score),
    })),
  };
}

// ============================================================================
// Internal Signal Scorers
// ============================================================================

interface CompanyStats {
  totalListings: number;
  avgRating: number | null;
  ratingCount: number;
  completedProjects: number;
  acceptedStudents: number;
}

async function getCompanyStats(authorId: string): Promise<CompanyStats> {
  const [stats] = await sql`
    SELECT
      COUNT(DISTINCT l.id) as total_listings,
      COUNT(DISTINCT CASE WHEN pa.status = 'completed' THEN pa.id END) as completed_projects,
      COUNT(DISTINCT CASE WHEN pa.status IN ('accepted', 'completed') THEN pa.student_id END) as accepted_students
    FROM listings l
    LEFT JOIN project_applications pa ON pa.listing_id = l.id
    WHERE l.author_id = ${authorId}
  `;

  // Get ratings for this company
  const [ratingStats] = await sql`
    SELECT AVG(r.rating)::numeric(3,2) as avg_rating, COUNT(r.id) as rating_count
    FROM corporate_ratings r
    WHERE r.corporate_user_id = ${authorId}
  `;

  return {
    totalListings: Number(stats?.total_listings || 0),
    avgRating: ratingStats?.avg_rating ? Number(ratingStats.avg_rating) : null,
    ratingCount: Number(ratingStats?.rating_count || 0),
    completedProjects: Number(stats?.completed_projects || 0),
    acceptedStudents: Number(stats?.accepted_students || 0),
  };
}

function scoreCompensation(listing: Record<string, unknown>): {
  score: number;
  details: Record<string, unknown>;
} {
  const isPaid = listing.is_paid as boolean;
  const compensation = listing.compensation as string | null;

  if (!isPaid) {
    return { score: 20, details: { isPaid: false, note: 'Unpaid listing' } };
  }

  if (!compensation) {
    return { score: 40, details: { isPaid: true, note: 'Paid but compensation not specified' } };
  }

  // Parse compensation string for rough scoring
  const compStr = compensation.toLowerCase();
  if (compStr.includes('negotiable') || compStr.includes('competitive')) {
    return { score: 70, details: { isPaid: true, compensation, note: 'Competitive/negotiable' } };
  }

  // Try to extract a dollar amount
  const match = compStr.match(/\$?(\d+)/);
  if (match) {
    const amount = parseInt(match[1]);
    const isHourly = compStr.includes('/hr') || compStr.includes('per hour') || compStr.includes('hourly');
    const hourlyRate = isHourly ? amount : amount / 160; // rough monthly to hourly

    let score: number;
    if (hourlyRate >= 25) score = 95;
    else if (hourlyRate >= 18) score = 80;
    else if (hourlyRate >= 12) score = 65;
    else score = 45;

    return { score, details: { isPaid: true, compensation, estimatedHourlyRate: Math.round(hourlyRate) } };
  }

  return { score: 55, details: { isPaid: true, compensation } };
}

function scoreFlexibility(listing: Record<string, unknown>): {
  score: number;
  details: Record<string, unknown>;
} {
  const remoteAllowed = listing.remote_allowed as boolean;
  const hoursPerWeek = (listing.hours_per_week as number) || 20;

  let score = 50;
  const details: Record<string, unknown> = {};

  // Remote bonus
  if (remoteAllowed) {
    score += 25;
    details.remote = true;
  } else {
    details.remote = false;
  }

  // Hours — more flexible = higher score
  if (hoursPerWeek <= 10) {
    score += 20; // Very flexible
    details.flexibility = 'Very flexible (≤10 hrs/wk)';
  } else if (hoursPerWeek <= 20) {
    score += 10; // Standard
    details.flexibility = 'Standard (10-20 hrs/wk)';
  } else {
    score -= 5; // Heavy commitment
    details.flexibility = 'Heavy commitment (>20 hrs/wk)';
  }

  details.hoursPerWeek = hoursPerWeek;

  return { score: Math.min(100, Math.max(0, score)), details };
}

function scoreReputation(stats: CompanyStats): {
  score: number;
  details: Record<string, unknown>;
} {
  if (stats.ratingCount === 0) {
    return { score: 50, details: { note: 'No ratings yet', ratingCount: 0 } };
  }

  const rating = stats.avgRating || 0;
  let score: number;
  if (rating >= 4.5) score = 100;
  else if (rating >= 4.0) score = 85;
  else if (rating >= 3.5) score = 70;
  else if (rating >= 3.0) score = 50;
  else score = 25;

  // Small sample regression
  if (stats.ratingCount < 5) {
    score = Math.round(score * 0.8 + 50 * 0.2);
  }

  return {
    score,
    details: {
      avgRating: stats.avgRating,
      ratingCount: stats.ratingCount,
    },
  };
}

function scoreCompletionRate(stats: CompanyStats): {
  score: number;
  details: Record<string, unknown>;
} {
  if (stats.acceptedStudents === 0) {
    return { score: 50, details: { note: 'No completed projects yet' } };
  }

  const rate = stats.completedProjects / Math.max(stats.acceptedStudents, 1);
  let score: number;
  if (rate >= 0.9) score = 100;
  else if (rate >= 0.75) score = 80;
  else if (rate >= 0.5) score = 60;
  else score = 35;

  return {
    score,
    details: {
      completionRate: Math.round(rate * 100) / 100,
      completedProjects: stats.completedProjects,
      acceptedStudents: stats.acceptedStudents,
    },
  };
}

function scoreGrowthOpportunity(listing: Record<string, unknown>): {
  score: number;
  details: Record<string, unknown>;
} {
  const description = ((listing.description as string) || '').toLowerCase();
  const title = ((listing.title as string) || '').toLowerCase();
  const combined = `${title} ${description}`;

  let score = 50;
  const indicators: string[] = [];

  // Keywords that indicate growth opportunity
  const growthKeywords = [
    { keyword: 'mentor', boost: 15 },
    { keyword: 'training', boost: 10 },
    { keyword: 'learn', boost: 8 },
    { keyword: 'develop', boost: 8 },
    { keyword: 'growth', boost: 10 },
    { keyword: 'leadership', boost: 12 },
    { keyword: 'full-time', boost: 15 },
    { keyword: 'hire', boost: 12 },
    { keyword: 'career', boost: 10 },
    { keyword: 'advancement', boost: 10 },
    { keyword: 'certification', boost: 10 },
    { keyword: 'presentation', boost: 8 },
  ];

  for (const { keyword, boost } of growthKeywords) {
    if (combined.includes(keyword)) {
      score += boost;
      indicators.push(keyword);
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    details: { indicators, note: indicators.length > 0 ? 'Growth indicators found' : 'No specific growth indicators' },
  };
}
