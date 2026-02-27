import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './HomeSkeletonLoader.module.css';

/**
 * HomeSkeletonLoader -- comprehensive skeleton loading placeholder for dashboard pages.
 *
 * Renders placeholder shapes that match the actual content dimensions
 * with a subtle shimmer animation. Supports four layout variants:
 *   - dashboard: greeting header + 4 stat cards + section title + 3 project cards
 *   - profile:   avatar + name/bio + stats row + review cards
 *   - search:    filter sidebar + 3 listing cards
 *   - detail:    header + description block + sidebar
 *
 * @component
 * @param {Object} props
 * @param {'dashboard'|'profile'|'search'|'detail'} [props.variant='dashboard'] - Layout variant
 * @param {string} [props.className] - Additional CSS class appended to root
 * @param {string} [props.rootClassName] - Overrides the root CSS class entirely
 * @returns {JSX.Element}
 */
const HomeSkeletonLoader = props => {
  const { variant = 'dashboard', className, rootClassName } = props;

  const classes = classNames(rootClassName || css.root, className);

  // ------------------------------------------------------------------ Dashboard
  if (variant === 'dashboard') {
    return (
      <div
        className={classes}
        aria-busy="true"
        aria-label="Loading dashboard content"
      >
        <div className={css.dashboard}>
          {/* Greeting header */}
          <div className={css.dashboardHeader}>
            <div className={css.greetingLine} />
            <div className={css.subtitleLine} />
          </div>

          {/* 4-column stat cards */}
          <div className={css.statsGrid}>
            {[0, 1, 2, 3].map(i => (
              <div className={css.statCard} key={`stat-${i}`}>
                <div className={css.statIconBone} />
                <div className={css.statContent}>
                  <div className={css.statValueBone} />
                  <div className={css.statLabelBone} />
                </div>
              </div>
            ))}
          </div>

          {/* Section title */}
          <div className={css.sectionHeader}>
            <div className={css.sectionTitleBone} />
            <div className={css.sectionActionBone} />
          </div>

          {/* 3 project cards */}
          <div className={css.projectsGrid}>
            {[0, 1, 2].map(i => (
              <div className={css.projectCard} key={`project-${i}`}>
                <div className={css.projectHeaderRow}>
                  <div className={css.projectTitleBone} />
                  <div className={css.projectBadgeBone} />
                </div>
                <div className={css.projectCompanyBone} />
                <div className={css.projectDescriptionBone}>
                  <div className={css.projectDescLine} />
                  <div className={css.projectDescLineShort} />
                </div>
                <div className={css.projectMetaRow}>
                  <div className={css.projectMetaBone} />
                  <div className={css.projectMetaBone} />
                </div>
                <div className={css.projectActionsBone}>
                  <div className={css.projectButtonBone} />
                  <div className={css.projectButtonBone} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Profile
  if (variant === 'profile') {
    return (
      <div
        className={classes}
        aria-busy="true"
        aria-label="Loading profile content"
      >
        <div className={css.profile}>
          {/* Avatar + name + bio */}
          <div className={css.profileHeader}>
            <div className={css.avatarBone} />
            <div className={css.profileNameBone} />
            <div className={css.profileBioBone} />
            <div className={css.profileBioShortBone} />

            {/* Stats row */}
            <div className={css.profileStatsRow}>
              {[0, 1, 2].map(i => (
                <div className={css.profileStatItem} key={`pstat-${i}`}>
                  <div className={css.profileStatValueBone} />
                  <div className={css.profileStatLabelBone} />
                </div>
              ))}
            </div>
          </div>

          {/* Section title for reviews */}
          <div className={css.sectionHeader}>
            <div className={css.sectionTitleBone} />
          </div>

          {/* Review cards */}
          <div className={css.reviewsSection}>
            {[0, 1, 2].map(i => (
              <div className={css.reviewCard} key={`review-${i}`}>
                <div className={css.reviewHeader}>
                  <div className={css.reviewAvatarBone} />
                  <div className={css.reviewAuthorInfo}>
                    <div className={css.reviewAuthorBone} />
                    <div className={css.reviewDateBone} />
                  </div>
                </div>
                <div className={css.reviewStarsBone} />
                <div className={css.reviewTextBone} />
                <div className={css.reviewTextShortBone} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Search
  if (variant === 'search') {
    return (
      <div
        className={classes}
        aria-busy="true"
        aria-label="Loading search results"
      >
        <div className={css.search}>
          {/* Filter sidebar */}
          <div className={css.filterSidebar}>
            <div className={css.filterTitleBone} />

            {/* Filter groups */}
            {[0, 1, 2].map(g => (
              <div className={css.filterGroup} key={`fg-${g}`}>
                <div className={css.filterLabelBone} />
                {g === 0 ? (
                  <div className={css.filterInputBone} />
                ) : (
                  [0, 1, 2].map(c => (
                    <div className={css.filterCheckboxRow} key={`fc-${g}-${c}`}>
                      <div className={css.filterCheckboxBone} />
                      <div className={css.filterCheckboxLabelBone} />
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>

          {/* 3 listing cards */}
          <div className={css.listingsGrid}>
            {[0, 1, 2].map(i => (
              <div className={css.listingCard} key={`listing-${i}`}>
                <div className={css.listingImageBone} />
                <div className={css.listingContent}>
                  <div className={css.listingTitleBone} />
                  <div className={css.listingSubtitleBone} />
                  <div className={css.listingDescBone} />
                  <div className={css.listingDescShortBone} />
                  <div className={css.listingTagsRow}>
                    <div className={css.listingTagBone} />
                    <div className={css.listingTagBone} />
                    <div className={css.listingTagBone} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ Detail
  if (variant === 'detail') {
    return (
      <div
        className={classes}
        aria-busy="true"
        aria-label="Loading detail content"
      >
        <div className={css.detail}>
          {/* Main content area */}
          <div className={css.detailMain}>
            {/* Header */}
            <div className={css.detailHeader}>
              <div className={css.detailTitleBone} />
              <div className={css.detailMetaRow}>
                <div className={css.detailMetaBone} />
                <div className={css.detailMetaBone} />
                <div className={css.detailMetaBone} />
              </div>
              <div className={css.detailBadgeRow}>
                <div className={css.detailBadgeBone} />
                <div className={css.detailBadgeBone} />
              </div>
            </div>

            {/* Description block */}
            <div className={css.detailDescription}>
              <div className={css.detailDescTitleBone} />
              <div className={css.detailDescLineBone} />
              <div className={css.detailDescLineBone} />
              <div className={css.detailDescLineShortBone} />
              <div className={css.detailDescLineBone} />
              <div className={css.detailDescLineShorterBone} />
            </div>
          </div>

          {/* Sidebar */}
          <div className={css.detailSidebar}>
            {/* Pricing / action card */}
            <div className={css.sidebarCard}>
              <div className={css.sidebarTitleBone} />
              <div className={css.sidebarRowBone}>
                <div className={css.sidebarLabelBone} />
                <div className={css.sidebarValueBone} />
              </div>
              <div className={css.sidebarRowBone}>
                <div className={css.sidebarLabelBone} />
                <div className={css.sidebarValueBone} />
              </div>
              <div className={css.sidebarButtonBone} />
            </div>

            {/* Author card */}
            <div className={css.sidebarCard}>
              <div className={css.sidebarAvatarRow}>
                <div className={css.sidebarAvatarBone} />
                <div>
                  <div className={css.sidebarAvatarNameBone} />
                  <div className={css.sidebarAvatarSubBone} style={{ marginTop: 8 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: render the dashboard variant if an unknown variant is passed
  return (
    <HomeSkeletonLoader variant="dashboard" className={className} rootClassName={rootClassName} />
  );
};

HomeSkeletonLoader.defaultProps = {
  variant: 'dashboard',
  className: null,
  rootClassName: null,
};

HomeSkeletonLoader.propTypes = {
  /** Layout variant controlling which skeleton structure is rendered */
  variant: PropTypes.oneOf(['dashboard', 'profile', 'search', 'detail']),
  /** Additional CSS class appended to the root element */
  className: PropTypes.string,
  /** Overrides the default root CSS class entirely */
  rootClassName: PropTypes.string,
};

export default HomeSkeletonLoader;
