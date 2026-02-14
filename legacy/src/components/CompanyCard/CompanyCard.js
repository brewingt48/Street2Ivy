import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './CompanyCard.module.css';

/**
 * CompanyCard -- Displays a company/corporate partner in search results.
 *
 * Vertical card layout: logo (with initial fallback), company name,
 * industry tag, and a stats row showing open projects and star rating.
 * Wraps in an anchor when `href` is provided, making the card clickable.
 *
 * @component
 * @param {Object} props
 * @param {string} props.companyName - Company display name (required)
 * @param {string} [props.industry] - Industry label shown as a subtle tag
 * @param {string} [props.logoUrl] - URL for the company logo image
 * @param {number} [props.openProjectCount] - Number of open projects
 * @param {number} [props.averageRating] - Average rating from 0 to 5
 * @param {string} [props.href] - Link to company profile (makes card an anchor)
 * @param {string} [props.className] - Additional CSS class appended to the root
 * @param {string} [props.rootClassName] - Overrides the default root CSS class
 * @returns {JSX.Element}
 */
const CompanyCard = props => {
  const {
    companyName,
    industry,
    logoUrl,
    openProjectCount,
    averageRating,
    href,
    className,
    rootClassName,
  } = props;

  const classes = classNames(
    rootClassName || css.root,
    { [css.clickable]: !!href },
    className
  );

  // Build the initial letter for the fallback logo
  const initial = companyName ? companyName.charAt(0).toUpperCase() : '?';

  // Clamp rating between 0 and 5
  const clampedRating =
    typeof averageRating === 'number'
      ? Math.min(Math.max(Math.round(averageRating), 0), 5)
      : null;

  // Render 5 star spans: filled or empty
  const renderStars = () => {
    if (clampedRating === null) {
      return null;
    }
    return (
      <span className={css.starsRow} aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={`star-${i}`}
            className={classNames(css.star, i < clampedRating ? css.starFilled : css.starEmpty)}
            aria-hidden="true"
          >
            {'\u2605'}
          </span>
        ))}
      </span>
    );
  };

  const hasStats =
    typeof openProjectCount === 'number' || clampedRating !== null;

  const cardContent = (
    <>
      {/* Logo */}
      <div className={css.logo}>
        {logoUrl ? (
          <img
            className={css.logoImage}
            src={logoUrl}
            alt={`${companyName} logo`}
          />
        ) : (
          <div className={css.logoFallback} aria-hidden="true">
            {initial}
          </div>
        )}
      </div>

      {/* Company name */}
      <h3 className={css.companyName}>{companyName}</h3>

      {/* Industry tag */}
      {industry && <span className={css.industryTag}>{industry}</span>}

      {/* Stats row */}
      {hasStats && (
        <div className={css.statsRow}>
          {typeof openProjectCount === 'number' && (
            <span className={css.projectCount}>
              {openProjectCount} open project{openProjectCount !== 1 ? 's' : ''}
            </span>
          )}
          {typeof openProjectCount === 'number' && clampedRating !== null && (
            <span className={css.statsDivider} aria-hidden="true" />
          )}
          {renderStars()}
        </div>
      )}
    </>
  );

  // Wrap in anchor if href is provided; otherwise render as a div
  if (href) {
    return (
      <a className={classes} href={href} aria-label={`View ${companyName} profile`}>
        {cardContent}
      </a>
    );
  }

  return (
    <div className={classes} aria-label={companyName}>
      {cardContent}
    </div>
  );
};

CompanyCard.defaultProps = {
  industry: null,
  logoUrl: null,
  openProjectCount: undefined,
  averageRating: undefined,
  href: null,
  className: null,
  rootClassName: null,
};

CompanyCard.propTypes = {
  /** Company display name */
  companyName: PropTypes.string.isRequired,

  /** Industry label shown as a subtle tag */
  industry: PropTypes.string,

  /** URL for the company logo image */
  logoUrl: PropTypes.string,

  /** Number of open projects */
  openProjectCount: PropTypes.number,

  /** Average rating from 0 to 5 */
  averageRating: PropTypes.number,

  /** Link to company profile; makes the entire card clickable */
  href: PropTypes.string,

  /** Additional CSS class appended to the root element */
  className: PropTypes.string,

  /** Overrides the default root CSS class entirely */
  rootClassName: PropTypes.string,
};

export default CompanyCard;
