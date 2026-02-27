import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useIntl } from '../../util/reactIntl';

import css from './StarRating.module.css';

/**
 * StarRating — Display-only star rating component with proportional fill.
 *
 * Supports decimal ratings (e.g., 4.3 renders 4 full stars + 30% filled fifth star).
 * Includes numeric display and optional review count.
 *
 * @component
 * @param {Object} props
 * @param {number} props.rating - Rating value (0–5, supports decimals)
 * @param {number} [props.maxStars=5] - Maximum number of stars
 * @param {boolean} [props.showEmpty=true] - Show empty stars when no rating
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Star size variant
 * @param {boolean} [props.showNumeric=false] - Display numeric rating next to stars
 * @param {number} [props.reviewCount] - Number of reviews to display
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.rootClassName] - Override root CSS class
 * @returns {JSX.Element}
 */
const StarRating = props => {
  const {
    rating = 0,
    maxStars = 5,
    showEmpty = true,
    size = 'md',
    showNumeric = false,
    reviewCount,
    className,
    rootClassName,
  } = props;

  const intl = useIntl();
  const classes = classNames(rootClassName || css.root, className);

  const sizeClass =
    size === 'sm' ? css.sizeSm : size === 'lg' ? css.sizeLg : css.sizeMd;

  const clampedRating = Math.min(Math.max(rating, 0), maxStars);
  const hasRating = clampedRating > 0;

  const ariaLabel = hasRating
    ? intl.formatMessage(
        { id: 'StarRating.ratingLabel' },
        { rating: clampedRating.toFixed(1), max: maxStars }
      )
    : intl.formatMessage({ id: 'StarRating.noRatingLabel' });

  const renderStar = (index) => {
    const starValue = index + 1;
    const fillPercentage = Math.min(
      Math.max((clampedRating - index) * 100, 0),
      100
    );
    const uniqueId = `star-fill-${index}-${Math.random().toString(36).substr(2, 6)}`;

    return (
      <span key={`star-${index}`} className={classNames(css.starWrapper, sizeClass)}>
        <svg
          className={css.starSvg}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={uniqueId}>
              <stop offset={`${fillPercentage}%`} className={css.starFillActive} />
              <stop offset={`${fillPercentage}%`} className={css.starFillEmpty} />
            </linearGradient>
          </defs>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={`url(#${uniqueId})`}
            stroke={hasRating && fillPercentage > 0 ? 'var(--s2i-star-filled)' : 'var(--s2i-star-empty)'}
            strokeWidth="1"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  };

  if (!hasRating && !showEmpty) {
    return null;
  }

  return (
    <span className={classes} role="img" aria-label={ariaLabel}>
      <span className={css.starsContainer}>
        {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
      </span>
      {showNumeric && hasRating && (
        <span className={css.numericRating}>
          {clampedRating.toFixed(1)} / {maxStars}.0
        </span>
      )}
      {showNumeric && !hasRating && (
        <span className={css.noRatingText}>
          {intl.formatMessage({ id: 'StarRating.noRatingsYet' })}
        </span>
      )}
      {typeof reviewCount === 'number' && (
        <span className={css.reviewCount}>
          ({intl.formatMessage(
            { id: 'StarRating.reviewCount' },
            { count: reviewCount }
          )})
        </span>
      )}
    </span>
  );
};

StarRating.defaultProps = {
  rating: 0,
  maxStars: 5,
  showEmpty: true,
  size: 'md',
  showNumeric: false,
  reviewCount: undefined,
  className: null,
  rootClassName: null,
};

StarRating.propTypes = {
  rating: PropTypes.number,
  maxStars: PropTypes.number,
  showEmpty: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showNumeric: PropTypes.bool,
  reviewCount: PropTypes.number,
  className: PropTypes.string,
  rootClassName: PropTypes.string,
};

export default StarRating;
