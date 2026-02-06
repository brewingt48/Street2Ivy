import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';

import { NamedLink, ListingCard, IconSpinner } from '../../components';

import css from './RecommendedProjects.module.css';

/**
 * RecommendedProjects - Shows project recommendations based on user skills
 *
 * @param {Object} currentUser - The logged in user
 * @param {Array} listings - Array of available listings to recommend from
 * @param {boolean} isLoading - Whether listings are still loading
 * @param {string} className - Additional CSS class
 * @param {number} maxItems - Maximum number of items to show (default: 4)
 */
const RecommendedProjects = props => {
  const {
    currentUser,
    listings = [],
    isLoading = false,
    className,
    rootClassName,
    maxItems = 4,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  // Get user skills from public data
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const userSkills = publicData.skills || [];
  const userMajor = publicData.major || '';
  const userInterests = publicData.interests || [];

  // If user has no skills to match against, don't show recommendations
  const hasMatchingCriteria = userSkills.length > 0 || userMajor || userInterests.length > 0;

  if (!hasMatchingCriteria && !isLoading && listings.length === 0) {
    return null;
  }

  // Score and sort listings by relevance
  const scoredListings = listings.map(listing => {
    const listingData = listing.attributes?.publicData || {};
    const listingSkills = listingData.requiredSkills || listingData.skills || [];
    const listingCategory = listingData.category || '';
    const listingIndustry = listingData.industry || '';

    let score = 0;

    // Match skills (highest weight)
    userSkills.forEach(skill => {
      if (
        listingSkills.some(
          ls =>
            ls.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(ls.toLowerCase())
        )
      ) {
        score += 10;
      }
    });

    // Match major to category/industry
    if (userMajor) {
      const majorLower = userMajor.toLowerCase();
      if (
        listingCategory.toLowerCase().includes(majorLower) ||
        listingIndustry.toLowerCase().includes(majorLower)
      ) {
        score += 5;
      }
    }

    // Match interests
    userInterests.forEach(interest => {
      const interestLower = interest.toLowerCase();
      if (
        listingCategory.toLowerCase().includes(interestLower) ||
        listingIndustry.toLowerCase().includes(interestLower) ||
        listing.attributes?.title?.toLowerCase().includes(interestLower)
      ) {
        score += 3;
      }
    });

    // Boost recently posted listings
    const createdAt = listing.attributes?.createdAt;
    if (createdAt) {
      const daysOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 7) score += 2;
      else if (daysOld < 30) score += 1;
    }

    return { listing, score };
  });

  // Sort by score and take top items
  const recommendedListings = scoredListings
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map(item => item.listing);

  // If no matches found with skills, show most recent listings
  const displayListings =
    recommendedListings.length > 0 ? recommendedListings : listings.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className={classes}>
        <h2 className={css.title}>
          <FormattedMessage id="RecommendedProjects.title" />
        </h2>
        <div className={css.loadingContainer}>
          <IconSpinner />
          <span className={css.loadingText}>
            <FormattedMessage id="RecommendedProjects.loading" />
          </span>
        </div>
      </div>
    );
  }

  if (displayListings.length === 0) {
    return (
      <div className={classes}>
        <h2 className={css.title}>
          <FormattedMessage id="RecommendedProjects.title" />
        </h2>
        <div className={css.emptyState}>
          <p className={css.emptyText}>
            <FormattedMessage id="RecommendedProjects.noProjects" />
          </p>
          <p className={css.emptySubtext}>
            Check back soon for new opportunities that match your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={classes}>
      <div className={css.header}>
        <h2 className={css.title}>
          <FormattedMessage id="RecommendedProjects.title" />
        </h2>
      </div>

      {recommendedListings.length > 0 && (
        <p className={css.subtitle}>
          <FormattedMessage id="RecommendedProjects.matchedSkills" />
        </p>
      )}

      <div className={css.listingsGrid}>
        {displayListings.map(listing => (
          <ListingCard key={listing.id.uuid} listing={listing} className={css.listingCard} />
        ))}
      </div>
    </div>
  );
};

RecommendedProjects.propTypes = {
  currentUser: PropTypes.object,
  listings: PropTypes.array,
  isLoading: PropTypes.bool,
  className: PropTypes.string,
  rootClassName: PropTypes.string,
  maxItems: PropTypes.number,
};

export default RecommendedProjects;
