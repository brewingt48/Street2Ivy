import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './ApplicationCard.module.css';

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  'in-progress': 'In Progress',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
};

const STATUS_CLASSES = {
  pending: css.statusPending,
  accepted: css.statusAccepted,
  declined: css.statusDeclined,
  'in-progress': css.statusInProgress,
  completed: css.statusCompleted,
  withdrawn: css.statusWithdrawn,
};

/**
 * Formats a date value into a readable string (e.g. "Jan 15, 2026").
 * Accepts a Date object or a date string.
 */
const formatDate = dateValue => {
  if (!dateValue) return null;
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * ApplicationCard -- Displays a single project application in the student dashboard.
 *
 * Horizontal card layout with project info on the left, date applied in the center-right,
 * and a status badge with an optional action button on the right.
 * Stacks vertically on mobile viewports.
 *
 * @component
 * @param {Object} props
 * @param {string} props.projectTitle - Name of the project
 * @param {string} props.companyName - Name of the company
 * @param {string} [props.companyLink] - Href to the company profile page
 * @param {string|Date} [props.dateApplied] - When the application was submitted
 * @param {'pending'|'accepted'|'declined'|'in-progress'|'completed'|'withdrawn'} [props.status='pending'] - Application status
 * @param {string} [props.actionLabel] - Label for the optional action button
 * @param {Function} [props.onAction] - Click handler for the action button
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.rootClassName] - Override root CSS class
 * @returns {JSX.Element}
 */
const ApplicationCard = props => {
  const {
    projectTitle,
    companyName,
    companyLink,
    dateApplied,
    status = 'pending',
    actionLabel,
    onAction,
    className,
    rootClassName,
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const statusClass = STATUS_CLASSES[status] || STATUS_CLASSES.pending;
  const statusLabel = STATUS_LABELS[status] || STATUS_LABELS.pending;
  const formattedDate = formatDate(dateApplied);

  const companyElement = companyLink ? (
    <a href={companyLink} className={css.companyLink}>
      {companyName}
    </a>
  ) : (
    <span className={css.companyName}>{companyName}</span>
  );

  return (
    <div className={classes}>
      {/* Project info */}
      <div className={css.projectInfo}>
        <div className={css.projectTitle}>{projectTitle}</div>
        {companyElement}
      </div>

      {/* Date applied */}
      {formattedDate ? (
        <div className={css.dateApplied}>Applied {formattedDate}</div>
      ) : null}

      {/* Status badge + action */}
      <div className={css.rightSection}>
        <span className={classNames(css.statusBadge, statusClass)} role="status">
          {statusLabel}
        </span>

        {actionLabel && onAction ? (
          <button type="button" className={css.actionButton} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};

ApplicationCard.defaultProps = {
  companyLink: null,
  dateApplied: null,
  status: 'pending',
  actionLabel: null,
  onAction: null,
  className: null,
  rootClassName: null,
};

ApplicationCard.propTypes = {
  projectTitle: PropTypes.string.isRequired,
  companyName: PropTypes.string.isRequired,
  companyLink: PropTypes.string,
  dateApplied: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  status: PropTypes.oneOf([
    'pending',
    'accepted',
    'declined',
    'in-progress',
    'completed',
    'withdrawn',
  ]),
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  className: PropTypes.string,
  rootClassName: PropTypes.string,
};

export default ApplicationCard;
