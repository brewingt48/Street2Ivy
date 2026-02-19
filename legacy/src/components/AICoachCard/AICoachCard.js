import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './AICoachCard.module.css';

/**
 * AICoachCard -- Premium promotional card for AI career coaching.
 *
 * Displayed on the student dashboard to highlight the AI Coach feature.
 * Renders a dark gradient card with a sparkle icon, title, description,
 * three feature bullets, and a CTA button whose state depends on whether
 * the institution has enabled AI coaching.
 *
 * @component
 * @param {Object} props
 * @param {boolean} [props.enabled=false] - Whether the institution has enabled AI coaching
 * @param {string} [props.coachingUrl] - URL to launch the AI coaching experience
 * @param {Function} [props.onLearnMore] - Callback when user clicks the CTA (button mode)
 * @param {string} [props.className] - Additional CSS class appended to the root
 * @param {string} [props.rootClassName] - Overrides the default root CSS class
 * @returns {JSX.Element}
 */
const AICoachCard = props => {
  const {
    enabled = false,
    coachingUrl,
    onLearnMore,
    className,
    rootClassName,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  const isLaunchable = enabled && coachingUrl;

  const features = [
    { icon: '\u2728', label: 'Resume & Application Review' },
    { icon: '\uD83C\uDFAF', label: 'Interview Preparation' },
    { icon: '\uD83D\uDDFA\uFE0F', label: 'Career Path Planning' },
  ];

  const renderCta = () => {
    if (isLaunchable) {
      return (
        <a
          className={classNames(css.ctaButton, css.ctaEnabled)}
          href={coachingUrl}
          aria-label="Launch AI Coach"
        >
          <span>Launch AI Coach</span>
          <span className={css.ctaArrow} aria-hidden="true">
            {'\u2192'}
          </span>
        </a>
      );
    }

    // Not enabled -- show disabled "Coming Soon" button
    // If onLearnMore is provided, render as a button; otherwise a span
    if (onLearnMore) {
      return (
        <button
          type="button"
          className={classNames(css.ctaButton, css.ctaDisabled)}
          onClick={onLearnMore}
          aria-label="AI Coach coming soon"
        >
          <span className={css.lockIcon} aria-hidden="true">
            {'\uD83D\uDD12'}
          </span>
          <span>Coming Soon</span>
        </button>
      );
    }

    return (
      <span
        className={classNames(css.ctaButton, css.ctaDisabled)}
        role="status"
        aria-label="AI Coach coming soon"
      >
        <span className={css.lockIcon} aria-hidden="true">
          {'\uD83D\uDD12'}
        </span>
        <span>Coming Soon</span>
      </span>
    );
  };

  return (
    <div className={classes} aria-label="AI Career Coach">
      {/* Icon */}
      <div className={css.icon} aria-hidden="true">
        {'\u2728'}
      </div>

      {/* Title */}
      <h3 className={css.title}>AI Career Coach</h3>

      {/* Description */}
      <p className={css.description}>
        Get personalized career guidance, resume reviews, and interview prep
        &mdash; available 24/7
      </p>

      {/* Feature bullets */}
      <ul className={css.featureList}>
        {features.map((feature, index) => (
          <li key={`feature-${index}`} className={css.featureItem}>
            <span className={css.featureIcon} aria-hidden="true">
              {feature.icon}
            </span>
            <span>{feature.label}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {renderCta()}
    </div>
  );
};

AICoachCard.defaultProps = {
  enabled: false,
  coachingUrl: null,
  onLearnMore: null,
  className: null,
  rootClassName: null,
};

AICoachCard.propTypes = {
  /** Whether the institution has enabled AI coaching */
  enabled: PropTypes.bool,

  /** URL to launch the AI coaching experience */
  coachingUrl: PropTypes.string,

  /** Callback when user clicks the CTA in disabled state */
  onLearnMore: PropTypes.func,

  /** Additional CSS class appended to the root element */
  className: PropTypes.string,

  /** Overrides the default root CSS class entirely */
  rootClassName: PropTypes.string,
};

export default AICoachCard;
