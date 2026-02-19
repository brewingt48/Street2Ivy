import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useIntl } from '../../util/reactIntl';

import css from './StatusBadge.module.css';

/**
 * StatusBadge — Color-coded status pill component.
 *
 * Consistent status indicators used across all pages:
 * pending (amber), accepted (green), declined (red),
 * in-progress (blue/teal), completed (gray), withdrawn (muted).
 *
 * @component
 * @param {Object} props
 * @param {'pending'|'accepted'|'declined'|'in-progress'|'completed'|'withdrawn'|'new'|'active'} props.status - Status type
 * @param {string} [props.label] - Custom label override (defaults to status name)
 * @param {'sm'|'md'} [props.size='md'] - Badge size
 * @param {boolean} [props.dot=false] - Show status dot indicator
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.rootClassName] - Override root CSS class
 * @returns {JSX.Element}
 */
const StatusBadge = props => {
  const {
    status = 'pending',
    label,
    size = 'md',
    dot = false,
    className,
    rootClassName,
  } = props;

  const intl = useIntl();

  const statusClasses = {
    pending: css.statusPending,
    accepted: css.statusAccepted,
    declined: css.statusDeclined,
    'in-progress': css.statusInProgress,
    completed: css.statusCompleted,
    withdrawn: css.statusWithdrawn,
    new: css.statusNew,
    active: css.statusActive,
  };

  const statusLabels = {
    pending: 'StatusBadge.pending',
    accepted: 'StatusBadge.accepted',
    declined: 'StatusBadge.declined',
    'in-progress': 'StatusBadge.inProgress',
    completed: 'StatusBadge.completed',
    withdrawn: 'StatusBadge.withdrawn',
    new: 'StatusBadge.new',
    active: 'StatusBadge.active',
  };

  const sizeClass = size === 'sm' ? css.sizeSm : css.sizeMd;
  const statusClass = statusClasses[status] || css.statusPending;

  const displayLabel = label || intl.formatMessage({ id: statusLabels[status] || statusLabels.pending });

  const classes = classNames(
    rootClassName || css.root,
    statusClass,
    sizeClass,
    className
  );

  return (
    <span className={classes} role="status">
      {dot && <span className={css.dot} aria-hidden="true" />}
      <span className={css.label}>{displayLabel}</span>
    </span>
  );
};

StatusBadge.defaultProps = {
  status: 'pending',
  label: null,
  size: 'md',
  dot: false,
  className: null,
  rootClassName: null,
};

StatusBadge.propTypes = {
  status: PropTypes.oneOf([
    'pending',
    'accepted',
    'declined',
    'in-progress',
    'completed',
    'withdrawn',
    'new',
    'active',
  ]),
  label: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md']),
  dot: PropTypes.bool,
  className: PropTypes.string,
  rootClassName: PropTypes.string,
};

export default StatusBadge;
