import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';

import css from './VerificationBadge.module.css';

/**
 * VerificationBadge - A trust signal component for verified users, institutions, and companies.
 *
 * @param {string} type - Type of verification: 'company', 'institution', 'user', 'identity'
 * @param {string} size - Badge size: 'small', 'medium', 'large'
 * @param {boolean} showLabel - Whether to show the text label
 * @param {string} className - Additional CSS class
 * @param {string} rootClassName - Root CSS class override
 */
const VerificationBadge = props => {
  const {
    type = 'company',
    size = 'medium',
    showLabel = true,
    className,
    rootClassName,
  } = props;

  const classes = classNames(rootClassName || css.root, className, {
    [css.small]: size === 'small',
    [css.medium]: size === 'medium',
    [css.large]: size === 'large',
    [css.company]: type === 'company',
    [css.institution]: type === 'institution',
    [css.user]: type === 'user',
    [css.identity]: type === 'identity',
  });

  // Get the appropriate message ID based on type
  const getMessageId = () => {
    switch (type) {
      case 'institution':
        return 'VerificationBadge.verifiedInstitution';
      case 'user':
        return 'VerificationBadge.verifiedUser';
      case 'identity':
        return 'VerificationBadge.identityVerified';
      case 'company':
      default:
        return 'VerificationBadge.verifiedCompany';
    }
  };

  return (
    <span className={classes} title={showLabel ? undefined : 'Verified'}>
      <svg
        className={css.icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield with checkmark for verification */}
        <path
          d="M12 2L4 5.5V11C4 15.52 7.23 19.74 12 21C16.77 19.74 20 15.52 20 11V5.5L12 2Z"
          fill="currentColor"
          opacity="0.2"
        />
        <path
          d="M12 2L4 5.5V11C4 15.52 7.23 19.74 12 21C16.77 19.74 20 15.52 20 11V5.5L12 2ZM12 19.5C8.05 18.47 6 14.92 6 11.5V7L12 4.5L18 7V11.5C18 14.92 15.95 18.47 12 19.5Z"
          fill="currentColor"
        />
        <path
          d="M10.5 14.5L7.5 11.5L8.91 10.09L10.5 11.67L15.09 7.09L16.5 8.5L10.5 14.5Z"
          fill="currentColor"
        />
      </svg>
      {showLabel && (
        <span className={css.label}>
          <FormattedMessage id={getMessageId()} />
        </span>
      )}
    </span>
  );
};

VerificationBadge.propTypes = {
  type: PropTypes.oneOf(['company', 'institution', 'user', 'identity']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  rootClassName: PropTypes.string,
};

export default VerificationBadge;
