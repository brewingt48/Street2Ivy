import React, { useEffect, useRef } from 'react';
import { useIntl, FormattedMessage } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';
import { formatDateWithProximity } from '../../../util/dates';
import { formatMoney } from '../../../util/currency';
import { richText } from '../../../util/richText';
import { types as sdkTypes } from '../../../util/sdkLoader';
import {
  getProcess,
  getUserTxRole,
  TX_TRANSITION_ACTOR_PROVIDER,
  TX_TRANSITION_ACTOR_SYSTEM,
  TX_TRANSITION_ACTOR_OPERATOR,
} from '../../../transactions/transaction';

import { Avatar, UserDisplayName } from '../../../components';

import css from './MessageThread.module.css';

const { Money } = sdkTypes;
const MIN_LENGTH_FOR_LONG_WORDS = 20;

// ================ Helpers ================ //

const isMessage = item => item && item.type === 'message';

const compareItems = (a, b) => {
  const itemDate = item => (isMessage(item) ? item.attributes.createdAt : item.createdAt);
  return itemDate(a) - itemDate(b);
};

const organizedItems = (messages, transitions, hideOldTransitions) => {
  const items = messages.concat(transitions).sort(compareItems);
  if (hideOldTransitions) {
    const firstMessageIndex = items.findIndex(i => isMessage(i));
    return firstMessageIndex >= 0 ? items.slice(firstMessageIndex) : [];
  }
  return items;
};

/**
 * Get message content — replaces text if sender is banned.
 */
const getMessageContent = (message, transaction, intl) => {
  const { customer, provider } = transaction;
  const customerBannedUuid = customer?.attributes?.banned ? customer?.id?.uuid : '';
  const providerBannedUuid = provider?.attributes?.banned ? provider?.id?.uuid : '';

  const isBannedSender = [customerBannedUuid, providerBannedUuid].includes(
    message.sender?.id?.uuid
  );
  const content = isBannedSender
    ? intl.formatMessage({ id: 'TransactionPage.messageSenderBanned' })
    : message.attributes.content;

  return richText(content, {
    linkify: true,
    longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
    longWordClass: css.longWord,
  });
};

// ================ Sub-components ================ //

/**
 * ReceivedMessage — left-aligned bubble with avatar.
 */
const ReceivedMessage = ({ message, formattedDate, transaction, intl }) => {
  const content = getMessageContent(message, transaction, intl);
  return (
    <div className={css.messageRowReceived}>
      <Avatar className={css.messageAvatar} user={message.sender} disableProfileLink />
      <div>
        <div className={css.messageBubbleReceived}>{content}</div>
        <p className={css.messageTimestampReceived}>{formattedDate}</p>
      </div>
    </div>
  );
};

/**
 * SentMessage — right-aligned bubble, no avatar.
 */
const SentMessage = ({ message, formattedDate, transaction, intl }) => {
  const content = getMessageContent(message, transaction, intl);
  return (
    <div className={css.messageRowSent}>
      <div>
        <div className={css.messageBubbleSent}>{content}</div>
        <p className={css.messageTimestampSent}>{formattedDate}</p>
      </div>
    </div>
  );
};

/**
 * TransitionItem — centered system message.
 */
const TransitionItem = ({ transition, transaction, stateData, currentUser, intl, config }) => {
  const { processName, processState } = stateData;
  const process = getProcess(processName);
  const nextState = process.getStateAfterTransition(transition.transition);
  const todayString = intl.formatMessage({ id: 'TransactionPage.ActivityFeed.today' });
  const formattedDate = formatDateWithProximity(transition.createdAt, intl, todayString);

  const { customer, provider, listing } = transaction || {};

  if (!currentUser?.id || !customer?.id || !provider?.id) {
    return null;
  }

  const ownRole = getUserTxRole(currentUser.id, transaction);
  const otherUser = ownRole === TX_TRANSITION_ACTOR_PROVIDER ? customer : provider;
  const stateStatus = nextState === processState ? 'current' : 'past';

  const actor =
    transition.by === ownRole
      ? 'you'
      : [TX_TRANSITION_ACTOR_SYSTEM, TX_TRANSITION_ACTOR_OPERATOR].includes(transition.by)
      ? transition.by
      : intl.formatMessage(
          { id: 'UserDisplayName.banned' },
          { name: otherUser?.attributes?.profile?.displayName || '' }
        );

  const listingTitle = listing?.attributes?.deleted
    ? intl.formatMessage({ id: 'TransactionPage.ActivityFeed.deletedListing' })
    : listing?.attributes?.title || '';

  const currency =
    transaction?.attributes?.payinTotal?.currency ||
    transaction?.listing?.attributes?.price?.currency ||
    config.currency;

  const offers = transaction?.attributes?.metadata?.offers;
  const offerInSubunits = transition.offerInSubunits;
  const negotiationOffer = offerInSubunits
    ? formatMoney(intl, new Money(offerInSubunits, currency))
    : null;

  // Check for transition-specific message
  const messageConfig = stateData.transitionMessages?.find(
    m => m.transition === transition.transition
  );

  const messageValues = {
    actor,
    otherUsersName: otherUser?.attributes?.profile?.displayName || '',
    listingTitle,
    deliveryMethod: transaction.attributes?.protectedData?.deliveryMethod || 'none',
    stateStatus,
    negotiationOffer: negotiationOffer || '-',
  };

  const transitionText = messageConfig
    ? intl.formatMessage({ id: messageConfig.translationId }, messageValues)
    : intl.formatMessage(
        { id: `TransactionPage.ActivityFeed.${processName}.${nextState}` },
        messageValues
      );

  return (
    <div className={css.transitionRow}>
      <div>
        <div className={css.transitionContent}>{transitionText}</div>
        <p className={css.transitionDate}>{formattedDate}</p>
      </div>
    </div>
  );
};

// ================ Main Component ================ //

/**
 * MessageThread — renders messages and transitions in a scrollable area.
 *
 * Reuses ActivityFeed's data-merging logic (messages + transitions sorted chronologically).
 * Styled with --s2i-* tokens for sent/received/system bubble variants.
 * Auto-scrolls to newest message on load.
 */
const MessageThread = props => {
  const {
    messages = [],
    transaction = {},
    stateData = {},
    currentUser,
    hasOlderMessages,
    fetchMessagesInProgress,
    onShowOlderMessages,
  } = props;

  const intl = useIntl();
  const config = useConfiguration();
  const scrollAnchorRef = useRef(null);
  const rootRef = useRef(null);

  const processName = stateData.processName;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (!processName) {
    return (
      <div className={css.root}>
        <div className={css.loadingSpinner}>
          <FormattedMessage id="MessageThread.showOlderMessages" defaultMessage="Loading..." />
        </div>
      </div>
    );
  }

  const process = getProcess(processName);
  const transitions = transaction?.attributes?.transitions || [];

  // Enhance transitions with negotiation offers if applicable
  const offers = transaction?.attributes?.metadata?.offers;
  const enhancedTransitions =
    offers && process.getTransitionsWithMatchingOffers
      ? process.getTransitionsWithMatchingOffers(transitions, offers)
      : transitions;

  const relevantTransitions = enhancedTransitions.filter(t =>
    process.isRelevantPastTransition(t.transition)
  );

  const todayString = intl.formatMessage({ id: 'TransactionPage.ActivityFeed.today' });
  const hideOldTransitions = hasOlderMessages || fetchMessagesInProgress;
  const items = organizedItems(messages, relevantTransitions, hideOldTransitions);

  return (
    <div className={css.root} ref={rootRef}>
      {/* Show older messages button */}
      {hasOlderMessages ? (
        <div className={css.showOlderWrapper}>
          <button
            type="button"
            className={css.showOlderButton}
            onClick={onShowOlderMessages}
            disabled={fetchMessagesInProgress}
          >
            <FormattedMessage id="MessageThread.showOlderMessages" />
          </button>
        </div>
      ) : null}

      {/* Loading spinner */}
      {fetchMessagesInProgress && items.length === 0 ? (
        <div className={css.loadingSpinner}>
          <FormattedMessage id="MessageThread.showOlderMessages" defaultMessage="Loading..." />
        </div>
      ) : null}

      {/* Empty state */}
      {!fetchMessagesInProgress && items.length === 0 ? (
        <div className={css.emptyMessages}>
          <div className={css.emptyMessagesIcon}>💬</div>
          <p className={css.emptyMessagesText}>
            <FormattedMessage
              id="InboxEmptyState.noConversations.description"
              defaultMessage="No messages yet. Start the conversation!"
            />
          </p>
        </div>
      ) : null}

      {/* Messages + transitions */}
      {items.map(item => {
        if (isMessage(item)) {
          const formattedDate = formatDateWithProximity(
            item.attributes.createdAt,
            intl,
            todayString
          );
          const isOwnMessage =
            currentUser?.id && item?.sender?.id?.uuid === currentUser.id?.uuid;

          return isOwnMessage ? (
            <SentMessage
              key={item.id.uuid}
              message={item}
              formattedDate={formattedDate}
              transaction={transaction}
              intl={intl}
            />
          ) : (
            <ReceivedMessage
              key={item.id.uuid}
              message={item}
              formattedDate={formattedDate}
              transaction={transaction}
              intl={intl}
            />
          );
        } else {
          return (
            <TransitionItem
              key={`${item.transition}-${item.createdAt}`}
              transition={item}
              transaction={transaction}
              stateData={stateData}
              currentUser={currentUser}
              intl={intl}
              config={config}
            />
          );
        }
      })}

      {/* Scroll anchor */}
      <div className={css.scrollAnchor} ref={scrollAnchorRef} />
    </div>
  );
};

export default MessageThread;
