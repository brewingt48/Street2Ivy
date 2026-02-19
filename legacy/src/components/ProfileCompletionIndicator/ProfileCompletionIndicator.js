import React from 'react';
import classNames from 'classnames';

import { NamedLink } from '../../components';
import css from './ProfileCompletionIndicator.module.css';

/**
 * ProfileCompletionIndicator shows a visual progress ring indicating profile completeness
 * with a list of missing fields and links to complete them.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class
 * @param {string} [props.rootClassName] - Custom class that overrides the default class
 * @param {number} props.completedCount - Number of completed fields
 * @param {number} props.totalCount - Total number of fields to complete
 * @param {Array<{id: string, label: string, completed: boolean, link?: Object}>} [props.fields] - Fields with completion status
 * @param {'compact' | 'detailed'} [props.variant='detailed'] - Display variant
 * @param {'student' | 'corporate'} [props.userType='student'] - User type for styling
 * @returns {JSX.Element} ProfileCompletionIndicator component
 */
const ProfileCompletionIndicator = props => {
  const {
    className,
    rootClassName,
    completedCount = 0,
    totalCount = 0,
    fields = [],
    variant = 'detailed',
    userType = 'student',
  } = props;

  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = percentage === 100;

  const classes = classNames(
    rootClassName || css.root,
    {
      [css.compact]: variant === 'compact',
      [css.detailed]: variant === 'detailed',
      [css.userStudent]: userType === 'student',
      [css.userCorporate]: userType === 'corporate',
      [css.complete]: isComplete,
    },
    className
  );

  // Calculate SVG circle properties
  const size = variant === 'compact' ? 48 : 80;
  const strokeWidth = variant === 'compact' ? 4 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const incompleteFields = fields.filter(f => !f.completed);

  return (
    <div className={classes}>
      <div className={css.progressContainer}>
        {/* Progress Ring */}
        <svg className={css.progressRing} width={size} height={size}>
          {/* Background circle */}
          <circle
            className={css.progressBg}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            className={css.progressFill}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        {/* Percentage text */}
        <div className={css.percentageText}>
          {isComplete ? (
            <span className={css.checkmark}>✓</span>
          ) : (
            <>
              <span className={css.percentageNumber}>{percentage}</span>
              <span className={css.percentageSymbol}>%</span>
            </>
          )}
        </div>
      </div>

      {/* Details section */}
      {variant === 'detailed' && (
        <div className={css.details}>
          <div className={css.statusText}>
            {isComplete ? (
              <span className={css.completeText}>Profile Complete!</span>
            ) : (
              <span className={css.incompleteText}>
                {completedCount} of {totalCount} complete
              </span>
            )}
          </div>

          {/* Missing fields list */}
          {!isComplete && incompleteFields.length > 0 && (
            <div className={css.missingFields}>
              <span className={css.missingLabel}>Complete your profile:</span>
              <ul className={css.fieldsList}>
                {incompleteFields.slice(0, 3).map(field => (
                  <li key={field.id} className={css.fieldItem}>
                    {field.link ? (
                      <NamedLink className={css.fieldLink} {...field.link}>
                        <span className={css.fieldIcon}>○</span>
                        {field.label}
                      </NamedLink>
                    ) : (
                      <span className={css.fieldText}>
                        <span className={css.fieldIcon}>○</span>
                        {field.label}
                      </span>
                    )}
                  </li>
                ))}
                {incompleteFields.length > 3 && (
                  <li className={css.fieldItem}>
                    <NamedLink className={css.fieldLink} name="ProfileSettingsPage">
                      +{incompleteFields.length - 3} more...
                    </NamedLink>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Compact variant shows just the ring */}
      {variant === 'compact' && !isComplete && (
        <NamedLink className={css.compactLink} name="ProfileSettingsPage">
          Complete profile
        </NamedLink>
      )}
    </div>
  );
};

export default ProfileCompletionIndicator;
