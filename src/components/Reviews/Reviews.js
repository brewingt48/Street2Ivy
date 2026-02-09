import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { decodeStructuredReview, getReviewCategories } from '../../util/structuredReview';

import { Avatar, ReviewRating, UserDisplayName } from '../../components';

import css from './Reviews.module.css';

/**
 * Renders the per-category rating breakdown for a structured review.
 */
const CategoryBreakdown = ({ structuredData, intl }) => {
  if (!structuredData || !structuredData.categories) return null;

  const reviewerRole = structuredData.reviewerRole || 'customer';
  const categories = getReviewCategories(reviewerRole);

  return (
    <div className={css.categoryBreakdown}>
      {categories.map(cat => {
        const rating = structuredData.categories[cat.key];
        if (!rating) return null;
        return (
          <div key={cat.key} className={css.categoryRow}>
            <span className={css.categoryLabel}>
              {intl.formatMessage({ id: cat.labelId })}
            </span>
            <ReviewRating
              rating={Number(rating)}
              className={css.categoryStars}
              reviewStarClassName={css.categoryRatingStar}
            />
          </div>
        );
      })}
    </div>
  );
};

const Review = props => {
  const { review, intl } = props;

  const date = review.attributes.createdAt;
  const dateString = intl.formatDate(date, { month: 'long', year: 'numeric' });

  // Decode structured review data if present
  const { textContent, structuredData } = decodeStructuredReview(review.attributes.content);

  return (
    <div className={css.review}>
      <Avatar className={css.avatar} user={review.author} />
      <div>
        <ReviewRating
          rating={review.attributes.rating}
          className={css.mobileReviewRating}
          reviewStarClassName={css.reviewRatingStar}
        />
        {structuredData ? (
          <CategoryBreakdown structuredData={structuredData} intl={intl} />
        ) : null}
        <p className={css.reviewContent}>{textContent}</p>
        <p className={css.reviewInfo}>
          <UserDisplayName user={review.author} intl={intl} />
          <span className={css.separator}>•</span>
          {dateString}
          <span className={css.desktopSeparator}>•</span>
          <span className={css.desktopReviewRatingWrapper}>
            <ReviewRating
              rating={review.attributes.rating}
              className={css.desktopReviewRating}
              reviewStarClassName={css.reviewRatingStar}
            />
          </span>
        </p>
      </div>
    </div>
  );
};

/**
 * A component that renders a list of reviews.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {Array<propTypes.review>} props.reviews - The reviews to render
 * @returns {JSX.Element}
 */
const Reviews = props => {
  const intl = useIntl();
  const { className, rootClassName, reviews = [] } = props;
  const classes = classNames(rootClassName || css.root, className);

  return reviews.length ? (
    <ul className={classes}>
      {reviews.map(r => {
        return (
          <li key={`Review_${r.id.uuid}`} className={css.reviewItem}>
            <Review review={r} intl={intl} />
          </li>
        );
      })}
    </ul>
  ) : null;
};

export default Reviews;
