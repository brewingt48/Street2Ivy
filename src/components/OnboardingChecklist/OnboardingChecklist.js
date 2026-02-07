import React, { useState } from 'react';
import classNames from 'classnames';

import { NamedLink } from '../../components';
import css from './OnboardingChecklist.module.css';

/**
 * OnboardingChecklist component displays a checklist of onboarding tasks
 * with progress tracking and links to complete each task.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class
 * @param {string} [props.rootClassName] - Custom class that overrides the default class
 * @param {string} props.title - Title for the checklist
 * @param {string} [props.subtitle] - Optional subtitle/description
 * @param {Array<{id: string, label: string, completed: boolean, link?: Object, action?: Function, description?: string}>} props.items - Checklist items
 * @param {Function} [props.onDismiss] - Callback when user dismisses the checklist
 * @param {boolean} [props.dismissible=true] - Whether the checklist can be dismissed
 * @param {'student' | 'corporate' | 'educational'} [props.variant='student'] - Visual variant
 * @returns {JSX.Element} OnboardingChecklist component
 */
const OnboardingChecklist = props => {
  const {
    className,
    rootClassName,
    title,
    subtitle,
    items = [],
    onDismiss,
    dismissible = true,
    variant = 'student',
  } = props;

  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount;

  const classes = classNames(
    rootClassName || css.root,
    {
      [css.variantStudent]: variant === 'student',
      [css.variantCorporate]: variant === 'corporate',
      [css.variantEducational]: variant === 'educational',
      [css.collapsed]: !isExpanded,
    },
    className
  );

  if (totalCount === 0) {
    return null;
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const renderItem = (item, index) => {
    const itemClasses = classNames(css.item, {
      [css.itemCompleted]: item.completed,
    });

    const content = (
      <>
        <div className={css.checkbox}>
          {item.completed ? (
            <span className={css.checkmark}>✓</span>
          ) : (
            <span className={css.stepNumber}>{index + 1}</span>
          )}
        </div>
        <div className={css.itemContent}>
          <span className={css.itemLabel}>{item.label}</span>
          {item.description && !item.completed && (
            <span className={css.itemDescription}>{item.description}</span>
          )}
        </div>
        {!item.completed && <span className={css.arrow}>→</span>}
      </>
    );

    if (item.completed) {
      return (
        <div key={item.id} className={itemClasses}>
          {content}
        </div>
      );
    }

    if (item.link) {
      return (
        <NamedLink key={item.id} className={itemClasses} {...item.link}>
          {content}
        </NamedLink>
      );
    }

    if (item.action) {
      return (
        <button
          key={item.id}
          type="button"
          className={itemClasses}
          onClick={item.action}
        >
          {content}
        </button>
      );
    }

    return (
      <div key={item.id} className={itemClasses}>
        {content}
      </div>
    );
  };

  return (
    <div className={classes}>
      <div className={css.header}>
        <div className={css.headerMain}>
          <button
            type="button"
            className={css.toggleButton}
            onClick={handleToggle}
            aria-expanded={isExpanded}
          >
            <span className={css.toggleIcon}>{isExpanded ? '−' : '+'}</span>
          </button>
          <div className={css.titleSection}>
            <h3 className={css.title}>
              {allCompleted ? '🎉 ' : ''}{title}
            </h3>
            {subtitle && <p className={css.subtitle}>{subtitle}</p>}
          </div>
        </div>

        <div className={css.headerRight}>
          <div className={css.progressInfo}>
            <span className={css.progressText}>
              {completedCount} of {totalCount} complete
            </span>
          </div>
          {dismissible && allCompleted && (
            <button
              type="button"
              className={css.dismissButton}
              onClick={onDismiss}
              aria-label="Dismiss checklist"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className={css.progressBar}>
        <div
          className={css.progressFill}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Checklist items */}
      {isExpanded && (
        <div className={css.items}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      )}

      {/* Completion message */}
      {allCompleted && isExpanded && (
        <div className={css.completionMessage}>
          <p>Great job! You've completed all the onboarding tasks.</p>
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;
