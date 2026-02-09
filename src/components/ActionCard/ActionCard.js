import React from 'react';
import classNames from 'classnames';

import { NamedLink } from '../../components';
import css from './ActionCard.module.css';

/**
 * ActionCard displays a quick action with icon, title, description, and navigation.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.icon] - Emoji or character icon
 * @param {React.ReactNode} [props.iconComponent] - Custom icon component
 * @param {string} props.title - Action title
 * @param {string} [props.description] - Short description of the action
 * @param {Object} [props.linkProps] - Props for NamedLink (name, params, to, etc.)
 * @param {Function} [props.onClick] - Click handler (used instead of link)
 * @param {string} [props.href] - External URL (opens in new tab)
 * @param {string} [props.className] - Additional CSS class
 * @param {'teal'|'amber'|'emerald'|'coral'|'navy'} [props.colorScheme='teal'] - Icon accent
 * @param {number} [props.animationDelay=0] - Stagger delay in ms for fade-in animation
 */
const ActionCard = props => {
  const {
    icon,
    iconComponent,
    title,
    description,
    linkProps,
    onClick,
    href,
    className,
    colorScheme = 'teal',
    animationDelay = 0,
  } = props;

  const classes = classNames(css.root, css[`color${colorScheme}`], className);
  const style = animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined;

  const content = (
    <>
      <div className={css.iconWrapper}>
        {iconComponent || <span className={css.icon}>{icon}</span>}
      </div>
      <div className={css.content}>
        <h4 className={css.title}>{title}</h4>
        {description && <p className={css.description}>{description}</p>}
      </div>
      <div className={css.arrow}>&rarr;</div>
    </>
  );

  // External link
  if (href) {
    return (
      <a
        className={classes}
        style={style}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  // Button with onClick
  if (onClick) {
    return (
      <button className={classes} style={style} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  // NamedLink (default)
  if (linkProps) {
    return (
      <NamedLink className={classes} style={style} {...linkProps}>
        {content}
      </NamedLink>
    );
  }

  // Fallback: static card
  return (
    <div className={classes} style={style}>
      {content}
    </div>
  );
};

export default ActionCard;
