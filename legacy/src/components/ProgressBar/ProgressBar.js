import React from 'react';
import classNames from 'classnames';

import css from './ProgressBar.module.css';

/**
 * ProgressBar component displays a step-based progress indicator
 * with visual dots/circles for each step and connecting lines.
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
    <div className={classes}>
      <div className={css.progressContainer}>
        {/* Background track */}
        <div className={css.track} />

        {/* Filled progress */}
        <div
          className={css.progress}
          style={{ width: `${progressPercentage}%` }}
        />

        {/* Step dots */}
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
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Simple text indicator */}
      <div className={css.mobileIndicator}>
        <span className={css.mobileText}>
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className={css.mobileLabel}>{steps[currentStep]?.label}</span>
      </div>
    </div>
  );
};

export default ProgressBar;
