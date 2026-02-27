import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './ActionCard.module.css';

/**
 * ActionCard -- Generic CTA card component.
 *
 * Shows an icon/visual, title, description, and a primary action button.
 * Used for dashboard CTAs like "Post a Project", "Complete Your Profile", etc.
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} [props.icon] - Icon or visual element displayed above the title
 * @param {string} props.title - Card heading text
 * @param {string} props.description - Supporting description text
 * @param {string} props.actionLabel - Label shown inside the action button / link
 * @param {Function} [props.onAction] - Click handler when the action is a button
 * @param {string} [props.href] - When provided the action renders as an anchor tag
 * @param {'default'|'highlight'|'subtle'} [props.variant='default'] - Visual variant
 * @param {string} [props.className] - Additional CSS class appended to the root
 * @param {string} [props.rootClassName] - Overrides the default root CSS class
 * @returns {JSX.Element}
 */
const ActionCard = props => {
  const {
    icon,
    title,
    description,
    actionLabel,
    onAction,
    href,
    variant = 'default',
    className,
    rootClassName,
  } = props;

  const classes = classNames(
    rootClassName || css.root,
    {
      [css.highlight]: variant === 'highlight',
      [css.subtle]: variant === 'subtle',
    },
    className
  );

  const actionContent = (
    <>
      <span>{actionLabel}</span>
      <span className={css.actionArrow} aria-hidden="true">
        {'\u2192'}
      </span>
    </>
  );

  const renderAction = () => {
    if (href) {
      return (
        <a
          className={css.action}
          href={href}
          aria-label={actionLabel}
        >
          {actionContent}
        </a>
      );
    }

    return (
      <button
        type="button"
        className={css.action}
        onClick={onAction}
        aria-label={actionLabel}
      >
        {actionContent}
      </button>
    );
  };

  return (
    <div className={classes} aria-label={title}>
      {icon && (
        <div className={css.iconWrapper} aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className={css.title}>{title}</h3>
      <p className={css.description}>{description}</p>
      {renderAction()}
    </div>
  );
};

ActionCard.defaultProps = {
  icon: null,
  onAction: null,
  href: null,
  variant: 'default',
  className: null,
  rootClassName: null,
};

ActionCard.propTypes = {
  /** Icon or visual element displayed above the title */
  icon: PropTypes.node,

  /** Card heading text */
  title: PropTypes.string.isRequired,

  /** Supporting description text */
  description: PropTypes.string.isRequired,

  /** Label shown inside the action button / link */
  actionLabel: PropTypes.string.isRequired,

  /** Click handler when the action is a button (ignored when href is set) */
  onAction: PropTypes.func,

  /** When provided the action renders as an anchor tag instead of a button */
  href: PropTypes.string,

  /** Visual variant */
  variant: PropTypes.oneOf(['default', 'highlight', 'subtle']),

  /** Additional CSS class appended to the root element */
  className: PropTypes.string,

  /** Overrides the default root CSS class entirely */
  rootClassName: PropTypes.string,
};

export default ActionCard;
