import React from 'react';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  decodeStructuredReview,
  computeReputationScore,
  getReputationTier,
  CUSTOMER_REVIEW_CATEGORIES,
  PROVIDER_REVIEW_CATEGORIES,
} from '../../util/structuredReview';
import { REVIEW_TYPE_OF_PROVIDER, REVIEW_TYPE_OF_CUSTOMER } from '../../util/types';

import { ReviewRating } from '../../components';
import ReputationBadge from '../ReputationBadge/ReputationBadge';

import css from './ReputationDashboard.module.css';

/**
 * A category bar showing average rating with a visual bar.
 */
const CategoryBar = ({ label, score, maxScore = 5 }) => {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return (
    <div className={css.categoryBar}>
      <span className={css.categoryBarLabel}>{label}</span>
      <div className={css.categoryBarTrack}>
        <div className={css.categoryBarFill} style={{ width: `${percentage}%` }} />
      </div>
      <span className={css.categoryBarScore}>{score.toFixed(1)}</span>
    </div>
  );
};

/**
 * A section showing reputation scores for reviews of a particular type.
 */
const ReputationSection = ({ title, reviews, categories, intl }) => {
  // Decode structured data from all reviews
  const structuredReviews = reviews
    .map(r => decodeStructuredReview(r.attributes.content).structuredData)
    .filter(Boolean);

  const reputationScore = computeReputationScore(structuredReviews);

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className={css.reputationSection}>
      <h4 className={css.sectionTitle}>{title}</h4>

      <div className={css.scoreOverview}>
        <div className={css.overallScore}>
          <span className={css.overallScoreNumber}>
            {reputationScore.overall > 0 ? reputationScore.overall.toFixed(1) : '-'}
          </span>
          <ReviewRating
            rating={Math.round(reputationScore.overall)}
            className={css.overallStars}
            reviewStarClassName={css.overallStar}
          />
          <span className={css.reviewCount}>
            <FormattedMessage
              id="ReputationDashboard.reviewCount"
              values={{ count: reputationScore.totalReviews }}
            />
          </span>
        </div>

        {/* Category breakdown — only if there are structured reviews */}
        {reputationScore.totalReviews > 0 &&
        Object.keys(reputationScore.categories).length > 0 ? (
          <div className={css.categoryBreakdown}>
            {categories.map(cat => {
              const score = reputationScore.categories[cat.key];
              if (score === undefined) return null;
              return (
                <CategoryBar
                  key={cat.key}
                  label={intl.formatMessage({ id: cat.labelId })}
                  score={score}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/**
 * ReputationDashboard — shows aggregated reputation scores on the ProfilePage.
 *
 * Displays:
 * - Overall reputation badge
 * - Category-level breakdowns (from structured reviews)
 * - Separate sections for "as a project host" and "as a student"
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {Array} props.reviews - All reviews for this user
 * @param {Array} [props.userTypeRoles] - User type roles (e.g., ['corporate-partner', 'student'])
 */
const ReputationDashboard = props => {
  const { className, reviews = [] } = props;
  const intl = useIntl();

  if (reviews.length === 0) {
    return null;
  }

  // Split reviews by type
  const providerReviews = reviews.filter(
    r => r.attributes.type === REVIEW_TYPE_OF_PROVIDER
  );
  const customerReviews = reviews.filter(
    r => r.attributes.type === REVIEW_TYPE_OF_CUSTOMER
  );

  // Compute overall reputation across all reviews
  const allStructuredData = reviews
    .map(r => decodeStructuredReview(r.attributes.content).structuredData)
    .filter(Boolean);
  const overallReputation = computeReputationScore(allStructuredData);
  const allRatings = reviews.map(r => r.attributes.rating).filter(Boolean);
  const overallAvg =
    overallReputation.totalReviews > 0
      ? overallReputation.overall
      : allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : 0;

  const classes = classNames(css.root, className);

  return (
    <div className={classes}>
      <div className={css.header}>
        <h3 className={css.title}>
          <FormattedMessage id="ReputationDashboard.title" />
        </h3>
        <ReputationBadge
          overallScore={overallAvg}
          totalReviews={reviews.length}
          size="large"
        />
      </div>

      {providerReviews.length > 0 ? (
        <ReputationSection
          title={intl.formatMessage({ id: 'ReputationDashboard.asProjectHost' })}
          reviews={providerReviews}
          categories={CUSTOMER_REVIEW_CATEGORIES}
          intl={intl}
        />
      ) : null}

      {customerReviews.length > 0 ? (
        <ReputationSection
          title={intl.formatMessage({ id: 'ReputationDashboard.asStudent' })}
          reviews={customerReviews}
          categories={PROVIDER_REVIEW_CATEGORIES}
          intl={intl}
        />
      ) : null}
    </div>
  );
};

export default ReputationDashboard;
