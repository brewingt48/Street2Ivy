import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames';

import css from './HelpTip.module.css';

/**
 * HelpTip component displays a help icon that shows a tooltip on hover/focus.
 * Used for providing contextual help for form fields.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class
 * @param {string} [props.rootClassName] - Custom class that overrides the default class
 * @param {string} props.content - The help text to display in the tooltip
 * @param {string} [props.title] - Optional title for the tooltip
 * @param {'top' | 'bottom' | 'left' | 'right'} [props.position='top'] - Tooltip position
 * @param {'small' | 'medium' | 'large'} [props.size='medium'] - Tooltip size
 * @param {string} [props.icon] - Custom icon character/emoji (default: '?')
 * @returns {JSX.Element} HelpTip component
 */
const HelpTip = props => {
  const {
    className,
    rootClassName,
    content,
    title,
    position = 'top',
    size = 'medium',
    icon = '?',
  } = props;

  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Adjust tooltip position if it would overflow viewport
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newPosition = position;

      // Check vertical overflow
      if (position === 'top' && triggerRect.top - tooltipRect.height < 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height > viewportHeight - 10) {
        newPosition = 'top';
      }

      // Check horizontal overflow
      if (position === 'left' && triggerRect.left - tooltipRect.width < 10) {
        newPosition = 'right';
      } else if (position === 'right' && triggerRect.right + tooltipRect.width > viewportWidth - 10) {
        newPosition = 'left';
      }

      if (newPosition !== tooltipPosition) {
        setTooltipPosition(newPosition);
      }
    }
  }, [isVisible, position, tooltipPosition]);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);
  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  const classes = classNames(rootClassName || css.root, className);
  const tooltipClasses = classNames(css.tooltip, {
    [css.tooltipVisible]: isVisible,
    [css.tooltipTop]: tooltipPosition === 'top',
    [css.tooltipBottom]: tooltipPosition === 'bottom',
    [css.tooltipLeft]: tooltipPosition === 'left',
    [css.tooltipRight]: tooltipPosition === 'right',
    [css.tooltipSmall]: size === 'small',
    [css.tooltipMedium]: size === 'medium',
    [css.tooltipLarge]: size === 'large',
  });

  return (
    <div className={classes}>
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-describedby={isVisible ? 'help-tooltip' : undefined}
        aria-label="Help"
      >
        <span className={css.icon}>{icon}</span>
      </button>

      <div
        ref={tooltipRef}
        id="help-tooltip"
        role="tooltip"
        className={tooltipClasses}
        aria-hidden={!isVisible}
      >
        <div className={css.tooltipArrow} />
        <div className={css.tooltipContent}>
          {title && <div className={css.tooltipTitle}>{title}</div>}
          <div className={css.tooltipText}>{content}</div>
        </div>
      </div>
    </div>
  );
};

export default HelpTip;
