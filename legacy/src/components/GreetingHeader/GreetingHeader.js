import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import { useIntl } from '../../util/reactIntl';
import css from './GreetingHeader.module.css';

/**
 * Determines the time-of-day greeting key based on the current hour.
 *
 * @returns {string} Intl message id for the greeting
 */
const getGreetingKey = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'GreetingHeader.morning';
  } else if (hour < 18) {
    return 'GreetingHeader.afternoon';
  }
  return 'GreetingHeader.evening';
};

/**
 * Returns a default subtitle based on user type.
 *
 * @param {object} intl - react-intl intl object
 * @param {string} userType - the role of the current user
 * @returns {string} Localized subtitle string
 */
const getDefaultSubtitle = (intl, userType) => {
  const subtitleKey = {
    'student': 'GreetingHeader.subtitle.student',
    'corporate-partner': 'GreetingHeader.subtitle.corporatePartner',
    'educational-institution': 'GreetingHeader.subtitle.educationalInstitution',
    'educational-admin': 'GreetingHeader.subtitle.educationalAdmin',
    'system-admin': 'GreetingHeader.subtitle.systemAdmin',
  };

  const key = subtitleKey[userType] || 'GreetingHeader.subtitle.student';
  return intl.formatMessage({ id: key });
};

/**
 * GreetingHeader is a personalized dashboard greeting header.
 * Used at the top of each role-specific dashboard to welcome the user
 * with a time-of-day greeting, their name, and an encouraging subtitle.
 *
 * @component
 * @param {Object} props
 * @param {string} props.userName - The display name of the current user (required)
 * @param {string} [props.userType='student'] - Role type for subtitle selection
 * @param {string} [props.subtitle] - Optional custom subtitle override
 * @param {boolean} [props.loading=false] - When true, shows skeleton placeholders
 * @param {string} [props.className] - Custom class that extends the default class
 * @param {string} [props.rootClassName] - Custom class that overrides the default class
 * @returns {JSX.Element} GreetingHeader component
 */
const GreetingHeader = props => {
  const {
    userName,
    userType = 'student',
    subtitle,
    loading = false,
    className,
    rootClassName,
  } = props;

  const intl = useIntl();

  const classes = classNames(rootClassName || css.root, className);

  if (loading) {
    return (
      <header className={classes}>
        <div className={css.skeletonGreeting} />
        <div className={css.skeletonTitle} />
        <div className={css.skeletonSubtitle} />
      </header>
    );
  }

  const greetingKey = getGreetingKey();
  const greetingText = intl.formatMessage({ id: greetingKey });
  const welcomeText = intl.formatMessage(
    { id: 'GreetingHeader.welcomeBack' },
    { userName }
  );
  const subtitleText = subtitle || getDefaultSubtitle(intl, userType);

  return (
    <header className={classes}>
      <p className={css.greeting}>{greetingText}</p>
      <h1 className={css.title}>{welcomeText}</h1>
      <p className={css.subtitle}>{subtitleText}</p>
    </header>
  );
};

GreetingHeader.defaultProps = {
  userType: 'student',
  subtitle: null,
  loading: false,
  className: null,
  rootClassName: null,
};

GreetingHeader.propTypes = {
  userName: PropTypes.string.isRequired,
  userType: PropTypes.oneOf([
    'student',
    'corporate-partner',
    'educational-institution',
    'educational-admin',
    'system-admin',
  ]),
  subtitle: PropTypes.string,
  loading: PropTypes.bool,
  className: PropTypes.string,
  rootClassName: PropTypes.string,
};

export default GreetingHeader;
