import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './ReviewCard.module.css';

/**
 * Renders a single inline SVG star with proportional fill support.
 *
 * Uses a linearGradient to partially fill the star path based on the
 * fill percentage, enabling decimal ratings (e.g. 4.3 = 30% filled 5th star).
 *
 * @param {Object} props
 * @param {number} props.index - Zero-based star index
 * @param {number} props.fillPercentage - 0-100 fill amount
 * @param {boolean} props.hasRating - Whether the overall rating is > 0
 * @returns {JSX.Element}
 */
const Star = ({ index, fillPercentage, hasRating }) => {
  const uniqueId = `review-star-${index}-${Math.random().toString(36).substr(2, 6)}`;

  return (
    <span className={css.starWrapper}>
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
          stroke={
            hasRating && fillPercentage > 0
              ? 'var(--s2i-star-filled)'
              : 'var(--s2i-star-empty)'
          }
          strokeWidth="1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
};

/**
 * Formats a date value into a short readable string (e.g. "Jan 15, 2026").
 *
 * Accepts both Date objects and date strings. Returns an empty string
 * if the input is falsy or produces an invalid date.
 *
 * @param {string|Date} dateValue
 * @returns {string}
 */
const formatDate = dateValue => {
  if (!dateValue) return '';
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * ReviewCard -- Displays a single review with reviewer info, star rating,
 * and written feedback.
 *
 * Layout (top to bottom):
 *   1. Header row: avatar (40px circle) + name/role, date aligned right
 *   2. Star rating (inline SVG with proportional fill)
 *   3. Review text (4-line clamp with "Read more" toggle)
 *   4. Project title pill/tag
 *
 * @component
 * @param {Object} props
 * @param {string} props.reviewerName - Display name of the reviewer (required)
 * @param {string} [props.reviewerRole] - Role/title (e.g. "VP of Strategy")
 * @param {string} [props.reviewerAvatarUrl] - URL for the avatar image
 * @param {string} [props.projectTitle] - Project this review is associated with
 * @param {number} [props.rating=0] - Rating value 0-5, supports decimals
 * @param {string} [props.content] - The review text body
 * @param {string|Date} [props.date] - When the review was written
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.rootClassName] - Override root CSS class
 * @returns {JSX.Element}
 */
const ReviewCard = props => {
  const {
    reviewerName,
    reviewerRole,
    reviewerAvatarUrl,
    projectTitle,
    rating = 0,
    content,
    date,
    className,
    rootClassName,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  // Clamp rating between 0 and 5
  const clampedRating = Math.min(Math.max(rating, 0), 5);
  const hasRating = clampedRating > 0;

  // Read more / line-clamp state
  const [isClamped, setIsClamped] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      // Compare scrollHeight to clientHeight to detect overflow from -webkit-line-clamp
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    }
  }, [content]);

  // Avatar: show image or fallback initial letter
  const initial = reviewerName ? reviewerName.charAt(0).toUpperCase() : '?';

  const formattedDate = formatDate(date);

  return (
    <div className={classes}>
      {/* ---- Header row ---- */}
      <div className={css.header}>
        <div className={css.reviewerInfo}>
          {/* Avatar */}
          <div className={css.avatar}>
            {reviewerAvatarUrl ? (
              <img
                className={css.avatarImage}
                src={reviewerAvatarUrl}
                alt={reviewerName}
              />
            ) : (
              <span className={css.avatarInitial}>{initial}</span>
            )}
          </div>

          {/* Name & Role */}
          <div className={css.nameBlock}>
            <span className={css.reviewerName}>{reviewerName}</span>
            {reviewerRole && (
              <span className={css.reviewerRole}>{reviewerRole}</span>
            )}
          </div>
        </div>

        {/* Date */}
        {formattedDate && <span className={css.date}>{formattedDate}</span>}
      </div>

      {/* ---- Star Rating ---- */}
      {hasRating && (
        <div className={css.starRating} role="img" aria-label={`${clampedRating.toFixed(1)} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, i) => {
            const fillPercentage = Math.min(
              Math.max((clampedRating - i) * 100, 0),
              100
            );
            return (
              <Star
                key={`star-${i}`}
                index={i}
                fillPercentage={fillPercentage}
                hasRating={hasRating}
              />
            );
          })}
        </div>
      )}

      {/* ---- Review Content ---- */}
      {content && (
        <div className={css.contentWrapper}>
          <p
            ref={contentRef}
            className={classNames(css.content, {
              [css.contentClamped]: !isExpanded,
            })}
          >
            {content}
          </p>
          {isClamped && (
            <button
              type="button"
              className={css.readMoreButton}
              onClick={() => {
                setIsExpanded(prev => !prev);
                // After expanding, re-check clamp state is no longer needed;
                // after collapsing, we know it was clamped before
              }}
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* ---- Project Title Tag ---- */}
      {projectTitle && (
        <div className={css.projectTagWrapper}>
          <span className={css.projectTag}>{projectTitle}</span>
        </div>
      )}
    </div>
  );
};

ReviewCard.defaultProps = {
  reviewerRole: null,
  reviewerAvatarUrl: null,
  projectTitle: null,
  rating: 0,
  content: null,
  date: null,
  className: null,
  rootClassName: null,
};

ReviewCard.propTypes = {
  reviewerName: PropTypes.string.isRequired,
  reviewerRole: PropTypes.string,
  reviewerAvatarUrl: PropTypes.string,
  projectTitle: PropTypes.string,
  rating: PropTypes.number,
  content: PropTypes.string,
  date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  className: PropTypes.string,
  rootClassName: PropTypes.string,
};

export default ReviewCard;
