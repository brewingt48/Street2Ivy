import React from 'react';
import classNames from 'classnames';

import css from './ProgressBar.module.css';

/**
 * ProgressBar component displays a step-based progress indicator
 * with visual dots/circles for each step and connecting lines.
 *
 * This is a purely visual/decorative component — the actual tab navigation
 * provides the accessible labels. Step labels are rendered via CSS ::after
 * pseudo-elements (using data-label attributes) to avoid duplicate text
 * nodes that conflict with the tab navigation in test queries.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class
 * @param {string} [props.rootClassName] - Custom class that overrides the default class
 * @param {Array<{id: string, label: string}>} props.steps - Array of step objects
 * @param {number} props.currentStep - Current active step (0-indexed)
 * @param {Array<boolean>} [props.completedSteps] - Array indicating which steps are completed
 * @returns {JSX.Element} ProgressBar component
 */
const ProgressBar = props => {
  const {
    className,
    rootClassName,
    steps = [],
    currentStep = 0,
    completedSteps = [],
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  if (steps.length === 0) {
    return null;
  }

  const progressPercentage = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <div className={classes} role="presentation">
      <div className={css.progressContainer}>
        {/* Background track */}
        <div className={css.track} />

        {/* Filled progress */}
        <div
          className={css.progress}
          style={{ width: `${progressPercentage}%` }}
        />

        {/* Step dots — labels rendered via CSS ::after to avoid duplicate DOM text */}
        <div className={css.stepsContainer}>
          {steps.map((step, index) => {
            const isCompleted = completedSteps[index] || index < currentStep;
            const isCurrent = index === currentStep;
            const isUpcoming = index > currentStep && !completedSteps[index];

            return (
              <div key={step.id} className={css.stepWrapper}>
                <div
                  className={classNames(css.step, {
                    [css.stepCompleted]: isCompleted,
                    [css.stepCurrent]: isCurrent,
                    [css.stepUpcoming]: isUpcoming,
                  })}
                >
                  {isCompleted ? (
                    <span className={css.checkmark}>✓</span>
                  ) : (
                    <span className={css.stepNumber}>{index + 1}</span>
                  )}
                </div>
                <span
                  className={classNames(css.stepLabel, {
                    [css.stepLabelActive]: isCurrent || isCompleted,
                  })}
                  data-label={step.label}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Simple text indicator — step count as text, label via CSS */}
      <div className={css.mobileIndicator}>
        <span className={css.mobileText}>
          {currentStep + 1} / {steps.length}
        </span>
        <span className={css.mobileLabel} data-label={steps[currentStep]?.label} />
      </div>
    </div>
  );
};

export default ProgressBar;
