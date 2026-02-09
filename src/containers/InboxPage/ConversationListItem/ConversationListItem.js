import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';
import { formatDateWithProximity } from '../../../util/dates';
import { TX_TRANSITION_ACTOR_CUSTOMER } from '../../../transactions/transaction';
import { Avatar, UserDisplayName, NamedLink } from '../../../components';

import css from './ConversationListItem.module.css';

/**
 * Determine user role type for badge display.
 * Falls back to null if role cannot be determined.
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
 * ConversationListItem — renders a single conversation in the inbox list.
 *
 * Enhanced version of the original InboxItem with:
 * - Role badge for the other party
 * - Status-based preview text (instead of booking details)
 * - Relative timestamp
 * - Active state highlight for split-pane selection
 * - Unread indicator dot
 *
 * All CSS uses --s2i-* design tokens for branding customization.
 */
const ConversationListItem = props => {
  const {
    transactionRole,
    tx,
    intl,
    stateData,
    isActive = false,
    onClick,
    isDesktop = false,
  } = props;

  const { customer, provider, listing } = tx;
  const {
    processName,
    processState,
    actionNeeded,
    isSaleNotification,
    isOrderNotification,
    isFinal,
  } = stateData;

  const isCustomer = transactionRole === TX_TRANSITION_ACTOR_CUSTOMER;
  const otherUser = isCustomer ? provider : customer;
  const isOtherUserBanned = otherUser?.attributes?.banned;
  const isUnread = isSaleNotification || isOrderNotification;
  const listingTitle = listing?.attributes?.title || '';

  // Relative timestamp from lastTransitionedAt
  const lastTransitionedAt = tx.attributes?.lastTransitionedAt;
  const todayString = intl.formatMessage({ id: 'TransactionPage.ActivityFeed.today' });
  const timestamp = lastTransitionedAt
    ? formatDateWithProximity(new Date(lastTransitionedAt), intl, todayString)
    : null;

  // Role badge for the other user
  const roleBadgeText = getUserRoleBadge(otherUser, intl);

  // Status text as preview (reuses existing translation keys)
  const statusTextId = `InboxPage.${processName}.${processState}.status`;

  // Style classes
  const rootClasses = classNames(css.root, {
    [css.rootActive]: isActive,
    [css.rootUnread]: isUnread,
    [css.rootBanned]: isOtherUserBanned,
    [css.rootFinal]: isFinal,
  });

  const nameClasses = classNames(css.userName, {
    [css.userNameUnread]: isUnread,
  });

  const statusClasses = classNames(css.status, {
    [css.statusActionNeeded]: actionNeeded,
    [css.statusNoAction]: !actionNeeded && !isFinal,
    [css.statusFinal]: isFinal,
  });

  // On desktop, clicking selects the conversation in the split pane.
  // On mobile, we render a NamedLink that navigates to the transaction page.
  const linkName = isCustomer ? 'OrderDetailsPage' : 'SaleDetailsPage';
  const linkParams = { id: tx.id.uuid };

  const handleClick = e => {
    if (isDesktop && onClick) {
      e.preventDefault();
      onClick(tx);
    }
  };

  return (
    <NamedLink
      className={rootClasses}
      name={linkName}
      params={linkParams}
      onClick={handleClick}
    >
      {/* Unread dot */}
      <div className={css.dotColumn}>
        {isUnread ? <div className={css.unreadDot} /> : null}
      </div>

      {/* Avatar */}
      <div className={css.avatarColumn}>
        <Avatar user={otherUser} className={css.avatar} disableProfileLink />
      </div>

      {/* Content */}
      <div className={css.content}>
        <div className={css.topRow}>
          <span className={nameClasses}>
            <UserDisplayName user={otherUser} intl={intl} />
          </span>
          {roleBadgeText ? (
            <span className={css.roleBadge}>{roleBadgeText}</span>
          ) : null}
          <span className={css.timestamp}>{timestamp}</span>
        </div>

        <div className={css.projectTitle}>{listingTitle}</div>

        <div className={css.bottomRow}>
          <span className={statusClasses}>
            <FormattedMessage
              id={statusTextId}
              values={{ transactionRole }}
            />
          </span>
        </div>
      </div>
    </NamedLink>
  );
};

export default ConversationListItem;
