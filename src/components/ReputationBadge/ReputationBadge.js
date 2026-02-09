import React from 'react';
import classNames from 'classnames';
import { useIntl } from '../../util/reactIntl';
import { getReputationTier } from '../../util/structuredReview';

import css from './ReputationBadge.module.css';

// Tier colors and icons
const TIER_CONFIG = {
  new: { emoji: '🌱', colorClass: 'tierNew' },
  emerging: { emoji: '🌿', colorClass: 'tierEmerging' },
  building: { emoji: '⭐', colorClass: 'tierBuilding' },
  established: { emoji: '🏆', colorClass: 'tierEstablished' },
  exceptional: { emoji: '💎', colorClass: 'tierExceptional' },
};

/**
 * ReputationBadge displays a user's reputation tier as a compact badge.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {number} props.overallScore - Average rating (0-5)
 * @param {number} props.totalReviews - Number of reviews
 * @param {boolean} [props.showScore] - Whether to show numeric score
 * @param {string} [props.size] - 'small' | 'medium' | 'large'
 */
const ReputationBadge = props => {
  const {
    className,
    overallScore = 0,
    totalReviews = 0,
    showScore = true,
    size = 'medium',
  } = props;
  const intl = useIntl();

  const { tier, labelId } = getReputationTier(overallScore, totalReviews);
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.new;
  const tierLabel = intl.formatMessage({ id: labelId });

  const classes = classNames(css.root, css[tierConfig.colorClass], css[size], className);

  return (
    <span className={classes}>
      <span className={css.icon}>{tierConfig.emoji}</span>
      <span className={css.label}>{tierLabel}</span>
      {showScore && totalReviews > 0 ? (
        <span className={css.score}>{overallScore.toFixed(1)}</span>
      ) : null}
    </span>
  );
};

export default ReputationBadge;
