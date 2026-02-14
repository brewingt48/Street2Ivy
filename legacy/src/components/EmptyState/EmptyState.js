import React from 'react';
import classNames from 'classnames';

import { NamedLink, PrimaryButton, SecondaryButton } from '../../components';
import css from './EmptyState.module.css';

/**
 * EmptyState component displays a friendly message when there's no data to show,
 * with optional icon, title, description, and action buttons.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class
 * @param {string} [props.rootClassName] - Custom class that overrides the default class
 * @param {string} [props.icon] - Emoji or icon character to display
 * @param {React.ReactNode} [props.iconComponent] - Custom icon component
 * @param {string} props.title - Main heading text
 * @param {string} [props.description] - Secondary description text
 * @param {Object} [props.primaryAction] - Primary action button config { label, link, onClick }
 * @param {Object} [props.secondaryAction] - Secondary action button config { label, link, onClick }
 * @param {'small' | 'medium' | 'large'} [props.size='medium'] - Size variant
 * @param {'default' | 'muted' | 'illustrated'} [props.variant='default'] - Visual variant
 * @returns {JSX.Element} EmptyState component
 */
const EmptyState = props => {
  const {
    className,
    rootClassName,
    icon,
    iconComponent,
    title,
    description,
    primaryAction,
    secondaryAction,
    size = 'medium',
    variant = 'default',
  } = props;

  const classes = classNames(
    rootClassName || css.root,
    {
      [css.sizeSmall]: size === 'small',
      [css.sizeMedium]: size === 'medium',
      [css.sizeLarge]: size === 'large',
      [css.variantDefault]: variant === 'default',
      [css.variantMuted]: variant === 'muted',
      [css.variantIllustrated]: variant === 'illustrated',
    },
    className
  );

  const renderActionButton = (action, isPrimary) => {
    if (!action) return null;

    const { label, link, onClick } = action;
    const ButtonComponent = isPrimary ? PrimaryButton : SecondaryButton;
    const buttonClass = isPrimary ? css.primaryButton : css.secondaryButton;

    if (link) {
      return (
        <NamedLink className={buttonClass} {...link}>
          {label}
        </NamedLink>
      );
    }

    return (
      <ButtonComponent className={buttonClass} onClick={onClick} type="button">
        {label}
      </ButtonComponent>
    );
  };

  return (
    <div className={classes}>
      {/* Icon */}
      {(icon || iconComponent) && (
        <div className={css.iconWrapper}>
          {iconComponent || <span className={css.icon}>{icon}</span>}
        </div>
      )}

      {/* Content */}
      <div className={css.content}>
        <h3 className={css.title}>{title}</h3>
        {description && <p className={css.description}>{description}</p>}
      </div>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className={css.actions}>
          {renderActionButton(primaryAction, true)}
          {renderActionButton(secondaryAction, false)}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
