import React from 'react';
import classNames from 'classnames';
import { useIntl } from '../../util/reactIntl';

import css from './GreetingHeader.module.css';

/**
 * GreetingHeader displays a time-of-day-aware greeting with user name and subtitle.
 *
 * @component
 * @param {Object} props
 * @param {string} props.firstName - User's first name
 * @param {string} [props.subtitle] - Contextual subtitle text
 * @param {string} [props.className] - Additional CSS class
 */
const GreetingHeader = props => {
  const { firstName, subtitle, className } = props;
  const intl = useIntl();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return intl.formatMessage({ id: 'GreetingHeader.morning' });
    }
    if (hour < 17) {
      return intl.formatMessage({ id: 'GreetingHeader.afternoon' });
    }
    return intl.formatMessage({ id: 'GreetingHeader.evening' });
  };

  const greeting = getGreeting();

  return (
    <div className={classNames(css.root, className)}>
      <div className={css.glassCard}>
        <div className={css.accentBar} />
        <div className={css.content}>
          <h1 className={css.greeting}>
            {greeting},{' '}
            <span className={css.name}>{firstName}</span>
          </h1>
          {subtitle && <p className={css.subtitle}>{subtitle}</p>}
        </div>
        <div className={css.dateInfo}>
          {intl.formatDate(new Date(), {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
};

export default GreetingHeader;
