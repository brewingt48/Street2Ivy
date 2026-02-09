import React from 'react';
import { useIntl } from '../../../util/reactIntl';
import { TX_TRANSITION_ACTOR_CUSTOMER } from '../../../transactions/transaction';
import { Avatar, UserDisplayName, NamedLink } from '../../../components';

import css from './ConversationHeader.module.css';

/**
 * Determine user role type for badge display.
 */
const getUserRoleBadge = (user, intl) => {
  const userType = user?.attributes?.profile?.publicData?.userType;
  if (!userType) return null;

  const roleMap = {
    student: 'student',
    'corporate-partner': 'corporatePartner',
    alumni: 'alumni',
    'educational-admin': 'educationalAdmin',
    'system-admin': 'systemAdmin',
  };

  const roleKey = roleMap[userType];
  if (!roleKey) return null;

  return intl.formatMessage({ id: `ConversationListItem.roleBadge.${roleKey}` });
};

/**
 * ConversationHeader — displays the header of the embedded conversation view.
 *
 * Shows:
 * - Back button (mobile only)
 * - Avatar of the other party
 * - User name + role badge
 * - Project title + status
 * - "View project" link
 *
 * All CSS uses --s2i-* design tokens for branding customization.
 */
const ConversationHeader = props => {
  const {
    transaction,
    transactionRole,
    stateData,
    onBack,
  } = props;

  const intl = useIntl();

  if (!transaction?.id) {
    return null;
  }

  const { customer, provider, listing } = transaction;
  const isCustomer = transactionRole === TX_TRANSITION_ACTOR_CUSTOMER;
  const otherUser = isCustomer ? provider : customer;
  const listingTitle = listing?.attributes?.title || '';
  const listingId = listing?.id?.uuid;
  const listingSlug = listingTitle ? listingTitle.toLowerCase().replace(/\s+/g, '-') : '';

  const { processName, processState } = stateData || {};

  // Role badge
  const roleBadgeText = getUserRoleBadge(otherUser, intl);

  // Status text
  const statusText = processName && processState
    ? intl.formatMessage(
        { id: `InboxPage.${processName}.${processState}.status` },
        { transactionRole }
      )
    : null;

  return (
    <div className={css.root}>
      {/* Back button (visible on mobile via CSS) */}
      {onBack ? (
        <button
          type="button"
          className={css.backButton}
          onClick={onBack}
          aria-label={intl.formatMessage({ id: 'ConversationHeader.backToInbox' })}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.67"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      {/* Avatar */}
      <Avatar user={otherUser} className={css.avatar} disableProfileLink />

      {/* Info */}
      <div className={css.info}>
        <div className={css.nameRow}>
          <span className={css.userName}>
            <UserDisplayName user={otherUser} intl={intl} />
          </span>
          {roleBadgeText ? (
            <span className={css.roleBadge}>{roleBadgeText}</span>
          ) : null}
        </div>
        <div className={css.detailRow}>
          {listingTitle ? (
            <span className={css.projectTitle}>{listingTitle}</span>
          ) : null}
          {listingTitle && statusText ? (
            <span className={css.separator}>&middot;</span>
          ) : null}
          {statusText ? (
            <span className={css.statusBadge}>{statusText}</span>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div className={css.actions}>
        {listingId ? (
          <NamedLink
            className={css.viewProjectLink}
            name="ListingPage"
            params={{ id: listingId, slug: listingSlug }}
          >
            {intl.formatMessage({ id: 'ConversationHeader.viewProject' })}
          </NamedLink>
        ) : null}
      </div>
    </div>
  );
};

export default ConversationHeader;
