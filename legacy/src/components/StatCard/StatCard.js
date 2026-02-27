import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './StatCard.module.css';

/**
 * StatCard — Dashboard metric display card.
 *
 * Displays a key metric with optional icon, label, trend indicator,
 * and click interaction. Follows the design system card pattern.
 *
 * @component
 * @param {Object} props
 * @param {string|number} props.value - The primary metric value
 * @param {string} props.label - Label describing the metric
 * @param {React.ReactNode} [props.icon] - Icon or emoji to display
 * @param {'teal'|'amber'|'navy'|'emerald'|'coral'} [props.iconColor='teal'] - Icon background color
 * @param {string} [props.trend] - Trend text (e.g., "+12%")
 * @param {'up'|'down'|'neutral'} [props.trendDirection='neutral'] - Trend direction for color
 * @param {boolean} [props.interactive=false] - Enable hover/click behavior
 * @param {Function} [props.onClick] - Click handler
 * @param {boolean} [props.loading=false] - Show skeleton loading state
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.rootClassName] - Override root CSS class
 * @returns {JSX.Element}
 */
const StatCard = props => {
  const {
    value,
    label,
    icon,
    iconColor = 'teal',
    trend,
    trendDirection = 'neutral',
    interactive = false,
    onClick,
    loading = false,
    className,
    rootClassName,
  } = props;

  const iconColorClasses = {
    teal: css.iconTeal,
    amber: css.iconAmber,
    navy: css.iconNavy,
    emerald: css.iconEmerald,
    coral: css.iconCoral,
  };

  const trendClasses = {
    up: css.trendUp,
    down: css.trendDown,
    neutral: css.trendNeutral,
  };

  const trendArrows = {
    up: '\u2191',
    down: '\u2193',
    neutral: '\u2192',
  };

  const classes = classNames(
    rootClassName || css.root,
    {
      [css.interactive]: interactive || onClick,
    },
    className
  );

  const handleClick = () => {
    if (onClick) onClick();
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  if (loading) {
    return (
      <div className={classes}>
        {icon && <div className={classNames(css.iconWrapper, css.skeleton, css.skeletonIcon)} />}
        <div className={classNames(css.skeleton, css.skeletonValue)} />
        <div className={classNames(css.skeleton, css.skeletonLabel)} />
      </div>
    );
  }

  return (
    <div
      className={classes}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {icon && (
        <div className={classNames(css.iconWrapper, iconColorClasses[iconColor])}>
          <span className={css.iconContent} aria-hidden="true">{icon}</span>
        </div>
      )}
      <div className={css.value}>{value}</div>
      <div className={css.label}>{label}</div>
      {trend && (
        <div className={classNames(css.trend, trendClasses[trendDirection])}>
          <span aria-hidden="true">{trendArrows[trendDirection]}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

StatCard.defaultProps = {
  icon: null,
  iconColor: 'teal',
  trend: null,
  trendDirection: 'neutral',
  interactive: false,
  onClick: null,
  loading: false,
  className: null,
  rootClassName: null,
};

StatCard.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.node,
  iconColor: PropTypes.oneOf(['teal', 'amber', 'navy', 'emerald', 'coral']),
  trend: PropTypes.string,
  trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
  interactive: PropTypes.bool,
  onClick: PropTypes.func,
  loading: PropTypes.bool,
  className: PropTypes.string,
  rootClassName: PropTypes.string,
};

export default StatCard;
