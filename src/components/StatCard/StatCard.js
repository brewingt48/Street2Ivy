import React from 'react';
import classNames from 'classnames';

import css from './StatCard.module.css';

/**
 * StatCard displays a single metric with icon, value, label, and optional trend.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.icon] - Emoji or character icon
 * @param {React.ReactNode} [props.iconComponent] - Custom icon component
 * @param {string|number} props.value - The metric value to display
 * @param {string} props.label - Label describing the metric
 * @param {string} [props.trend] - Trend text (e.g., "+12%")
 * @param {'up'|'down'|'neutral'} [props.trendDirection='neutral'] - Direction of trend
 * @param {'teal'|'amber'|'emerald'|'coral'|'navy'} [props.colorScheme='teal'] - Accent color
 * @param {string} [props.className] - Additional CSS class
 * @param {number} [props.animationDelay=0] - Stagger delay in ms for fade-in animation
 */
const StatCard = props => {
  const {
    icon,
    iconComponent,
    value,
    label,
    trend,
    trendDirection = 'neutral',
    colorScheme = 'teal',
    className,
    animationDelay = 0,
  } = props;

  const classes = classNames(css.root, css[`color${colorScheme}`], className);

  const trendClasses = classNames(css.trend, {
    [css.trendUp]: trendDirection === 'up',
    [css.trendDown]: trendDirection === 'down',
    [css.trendNeutral]: trendDirection === 'neutral',
  });

  const trendArrow =
    trendDirection === 'up' ? '\u2191' : trendDirection === 'down' ? '\u2193' : '';

  return (
    <div
      className={classes}
      style={animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      {(icon || iconComponent) && (
        <div className={css.iconWrapper}>
          {iconComponent || <span className={css.icon}>{icon}</span>}
        </div>
      )}
      <div className={css.content}>
        <div className={css.value}>{value}</div>
        <div className={css.label}>{label}</div>
        {trend && (
          <div className={trendClasses}>
            {trendArrow} {trend}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
