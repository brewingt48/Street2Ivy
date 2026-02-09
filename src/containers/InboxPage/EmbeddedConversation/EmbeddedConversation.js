import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';
import { types as sdkTypes } from '../../../util/sdkLoader';
import {
  resolveLatestProcessName,
  getProcess,
  TX_TRANSITION_ACTOR_CUSTOMER,
} from '../../../transactions/transaction';

import { getMarketplaceEntities } from '../../../ducks/marketplaceData.duck';
import {
  fetchTransactionThunk,
  fetchMessagesThunk,
  fetchTransitionsThunk,
  sendMessageThunk,
  fetchMoreMessages,
} from '../../TransactionPage/TransactionPage.duck';
import { getStateData } from '../../TransactionPage/TransactionPage.stateData';

import ConversationHeader from './ConversationHeader';
import MessageThread from './MessageThread';
import ComposeArea from './ComposeArea';

import css from './EmbeddedConversation.module.css';

const { UUID } = sdkTypes;

/**
 * EmbeddedConversation — orchestrates the conversation view within the inbox split pane.
 *
 * Connects directly to state.TransactionPage for messages and transaction data.
 * On txId change: dispatches fetchTransaction, fetchMessages, and fetchTransitions.
 * Passes onSendMessage → dispatches sendMessage thunk.
 *
 * Components:
 * - ConversationHeader (avatar, name, project, status, "View project" link)
 * - MessageThread (messages + transitions, auto-scroll)
 * - ComposeArea (auto-expand textarea, Enter to send)
 *
 * All CSS uses --s2i-* design tokens for branding customization.
 */
const EmbeddedConversation = props => {
  const {
    txId,
    transactionRole,
    currentUser,
    onBack,
  } = props;

  const dispatch = useDispatch();
  const intl = useIntl();
  const config = useConfiguration();

  // ================ Redux selectors ================ //

  const transactionPageState = useSelector(state => state.TransactionPage);
  const {
    fetchTransactionInProgress,
    fetchTransactionError,
    transactionRef,
    fetchMessagesInProgress,
    totalMessagePages,
    oldestMessagePageFetched,
    messages,
    sendMessageInProgress,
    sendMessageError,
    transitionInProgress,
    transitionError,
    processTransitions,
  } = transactionPageState;

  // Denormalize transaction from marketplace data
  const transaction = useSelector(state => {
    if (!transactionRef) return null;
    const entities = getMarketplaceEntities(state, [transactionRef]);
    return entities.length > 0 ? entities[0] : null;
  });

  // ================ Load data on txId change ================ //

  useEffect(() => {
    if (txId) {
      const uuid = new UUID(txId);
      // Dispatch all three fetches in parallel
      dispatch(fetchTransactionThunk({ id: uuid, txRole: transactionRole, config }));
      dispatch(fetchMessagesThunk({ txId: uuid, page: 1, config }));
      dispatch(fetchTransitionsThunk({ id: uuid }));
    }
  }, [txId, transactionRole, config, dispatch]);

  // ================ Callbacks ================ //

  const handleSendMessage = useCallback(
    messageContent => {
      if (!txId) return;
      const uuid = new UUID(txId);
      dispatch(sendMessageThunk({ txId: uuid, message: messageContent, config }));
    },
    [txId, config, dispatch]
  );

  const handleShowOlderMessages = useCallback(() => {
    if (!txId) return;
    const uuid = new UUID(txId);
    dispatch(fetchMoreMessages(uuid, config));
  }, [txId, config, dispatch]);

  // ================ Derived state ================ //

  const hasOlderMessages = totalMessagePages > oldestMessagePageFetched;

  // Build stateData for the loaded transaction
  let stateData = null;
  if (transaction?.id) {
    try {
      const processName = resolveLatestProcessName(transaction.attributes.processName);
      const process = getProcess(processName);

      stateData = getStateData(
        {
          transaction,
          transactionRole,
          intl,
          transitionInProgress,
          transitionError,
          onTransition: () => {}, // No-op — transitions handled separately if needed
          sendReviewInProgress: false,
          sendReviewError: null,
        },
        process
      );
    } catch (e) {
      // Process not recognized — stateData stays null
      console.log('EmbeddedConversation: process not recognized', e);
    }
  }

  // ================ Render ================ //

  // Loading state
  if (fetchTransactionInProgress && !transaction) {
    return (
      <div className={css.root}>
        <div className={css.loadingContainer}>
          <div className={css.loadingSpinner} />
          <span className={css.loadingText}>Loading conversation...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchTransactionError && !transaction) {
    return (
      <div className={css.root}>
        <div className={css.errorContainer}>
          <div className={css.errorIcon}>⚠️</div>
          <p className={css.errorText}>Unable to load this conversation.</p>
          <button
            type="button"
            className={css.retryButton}
            onClick={() => {
              if (txId) {
                const uuid = new UUID(txId);
                dispatch(fetchTransactionThunk({ id: uuid, txRole: transactionRole, config }));
                dispatch(fetchMessagesThunk({ txId: uuid, page: 1, config }));
              }
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No transaction loaded yet
  if (!transaction) {
    return <div className={css.root} />;
  }

  return (
    <div className={css.root}>
      <ConversationHeader
        transaction={transaction}
        transactionRole={transactionRole}
        stateData={stateData}
        onBack={onBack}
      />

      <MessageThread
        messages={messages}
        transaction={transaction}
        stateData={stateData || {}}
        currentUser={currentUser}
        hasOlderMessages={hasOlderMessages}
        fetchMessagesInProgress={fetchMessagesInProgress}
        onShowOlderMessages={handleShowOlderMessages}
      />

      <ComposeArea
        onSendMessage={handleSendMessage}
        sendMessageInProgress={sendMessageInProgress}
        sendMessageError={sendMessageError}
      />
    </div>
  );
};

export default EmbeddedConversation;
