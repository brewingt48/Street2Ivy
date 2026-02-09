/**
 * Structured Review Utilities
 *
 * Since Sharetribe's review API only accepts a single rating (1-5) and text content,
 * we encode structured category ratings as a JSON block appended to the review content.
 * The overall rating sent to Sharetribe is the rounded average of all category ratings.
 *
 * Format:
 *   <user's written review text>
 *   <!--S2I_REVIEW_DATA:{"categories":{...},"reviewerRole":"customer"}-->
 *
 * The marker is an HTML comment that won't render visibly if displayed raw.
 */

// Review categories differ by reviewer role
// Customers (students) rate the provider (corporate partner)
export const CUSTOMER_REVIEW_CATEGORIES = [
  { key: 'communication', labelId: 'StructuredReview.category.communication' },
  { key: 'mentorship', labelId: 'StructuredReview.category.mentorship' },
  { key: 'projectClarity', labelId: 'StructuredReview.category.projectClarity' },
  { key: 'professionalism', labelId: 'StructuredReview.category.professionalism' },
];

// Providers (corporate partners) rate the customer (student)
export const PROVIDER_REVIEW_CATEGORIES = [
  { key: 'workQuality', labelId: 'StructuredReview.category.workQuality' },
  { key: 'communication', labelId: 'StructuredReview.category.communication' },
  { key: 'reliability', labelId: 'StructuredReview.category.reliability' },
  { key: 'initiative', labelId: 'StructuredReview.category.initiative' },
];

const REVIEW_DATA_MARKER = '<!--S2I_REVIEW_DATA:';
const REVIEW_DATA_END = '-->';

/**
 * Encode structured review data into the review content string.
 *
 * @param {string} textContent - The user's written review text
 * @param {Object} categoryRatings - Map of category key → rating (1-5)
 * @param {string} reviewerRole - 'customer' or 'provider'
 * @returns {{ content: string, overallRating: number }}
 */
export const encodeStructuredReview = (textContent, categoryRatings, reviewerRole) => {
  const data = {
    categories: categoryRatings,
    reviewerRole,
    version: 1,
  };

  const encodedContent = `${textContent.trim()}\n${REVIEW_DATA_MARKER}${JSON.stringify(data)}${REVIEW_DATA_END}`;

  // Calculate overall rating as rounded average of category ratings
  const ratings = Object.values(categoryRatings).map(Number);
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const overallRating = Math.round(sum / ratings.length);

  // Clamp to 1-5 range
  const clampedRating = Math.max(1, Math.min(5, overallRating));

  return {
    content: encodedContent,
    overallRating: clampedRating,
  };
};

/**
 * Decode structured review data from review content string.
 *
 * @param {string} content - The raw review content from Sharetribe
 * @returns {{ textContent: string, structuredData: Object|null }}
 */
export const decodeStructuredReview = content => {
  if (!content || typeof content !== 'string') {
    return { textContent: content || '', structuredData: null };
  }

  const markerIndex = content.indexOf(REVIEW_DATA_MARKER);

  if (markerIndex === -1) {
    // No structured data — legacy review
    return { textContent: content, structuredData: null };
  }

  const textContent = content.substring(0, markerIndex).trim();
  const jsonStart = markerIndex + REVIEW_DATA_MARKER.length;
  const jsonEnd = content.indexOf(REVIEW_DATA_END, jsonStart);

  if (jsonEnd === -1) {
    return { textContent: content, structuredData: null };
  }

  try {
    const jsonStr = content.substring(jsonStart, jsonEnd);
    const structuredData = JSON.parse(jsonStr);
    return { textContent, structuredData };
  } catch (e) {
    return { textContent: content, structuredData: null };
  }
};

/**
 * Get the review categories for a given reviewer role.
 *
 * @param {string} reviewerRole - 'customer' or 'provider'
 * @returns {Array<{ key: string, labelId: string }>}
 */
export const getReviewCategories = reviewerRole => {
  return reviewerRole === 'provider' ? PROVIDER_REVIEW_CATEGORIES : CUSTOMER_REVIEW_CATEGORIES;
};

/**
 * Compute a reputation score from an array of decoded structured reviews.
 * Returns an object with per-category averages and an overall score.
 *
 * @param {Array<Object>} structuredReviews - Array of structuredData objects (from decodeStructuredReview)
 * @returns {{ overall: number, categories: Object<string, number>, totalReviews: number }}
 */
export const computeReputationScore = structuredReviews => {
  if (!structuredReviews || structuredReviews.length === 0) {
    return { overall: 0, categories: {}, totalReviews: 0 };
  }

  const categoryTotals = {};
  const categoryCounts = {};

  structuredReviews.forEach(data => {
    if (!data || !data.categories) return;
    Object.entries(data.categories).forEach(([key, rating]) => {
      const r = Number(rating);
      if (!isNaN(r)) {
        categoryTotals[key] = (categoryTotals[key] || 0) + r;
        categoryCounts[key] = (categoryCounts[key] || 0) + 1;
      }
    });
  });

  const categories = {};
  let totalSum = 0;
  let totalCount = 0;

  Object.keys(categoryTotals).forEach(key => {
    const avg = categoryTotals[key] / categoryCounts[key];
    categories[key] = Math.round(avg * 10) / 10; // One decimal place
    totalSum += categoryTotals[key];
    totalCount += categoryCounts[key];
  });

  const overall = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : 0;

  return {
    overall,
    categories,
    totalReviews: structuredReviews.length,
  };
};

/**
 * Get a reputation tier based on overall score and review count.
 *
 * @param {number} overall - Average overall score (0-5)
 * @param {number} totalReviews - Number of reviews
 * @returns {{ tier: string, labelId: string, minReviews: number }}
 */
export const getReputationTier = (overall, totalReviews) => {
  if (totalReviews === 0) {
    return { tier: 'new', labelId: 'Reputation.tier.new' };
  }
  if (totalReviews < 3) {
    return { tier: 'emerging', labelId: 'Reputation.tier.emerging' };
  }
  if (overall >= 4.5 && totalReviews >= 5) {
    return { tier: 'exceptional', labelId: 'Reputation.tier.exceptional' };
  }
  if (overall >= 4.0) {
    return { tier: 'established', labelId: 'Reputation.tier.established' };
  }
  if (overall >= 3.0) {
    return { tier: 'building', labelId: 'Reputation.tier.building' };
  }
  return { tier: 'emerging', labelId: 'Reputation.tier.emerging' };
};
