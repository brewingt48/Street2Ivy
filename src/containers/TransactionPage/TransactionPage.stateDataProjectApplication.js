import {
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
  TX_TRANSITION_ACTOR_PROVIDER,
  TX_TRANSITION_ACTOR_CUSTOMER,
} from '../../transactions/transaction';

/**
 * Get UI data mapped to specific transaction state & role
 * for the ProveGround project application process.
 *
 * Process flow: Apply → Accept/Decline → Mark Completed → Reviews
 */
export const getStateDataForProjectApplicationProcess = (txInfo, processInfo) => {
  const { transactionRole } = txInfo;
  const {
    processName,
    processState,
    states,
    transitions,
    isCustomer,
    actionButtonProps,
    leaveReviewProps,
  } = processInfo;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

  return new ConditionalResolver([processState, transactionRole])
    .cond([states.APPLIED, TX_TRANSITION_ACTOR_PROVIDER], () => {
      // Corporate partner sees Accept/Decline buttons
      const primaryButtonProps = actionButtonProps(transitions.ACCEPT, 'provider');
      const secondaryButtonProps = actionButtonProps(transitions.DECLINE, 'provider');
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps,
        secondaryButtonProps,
      };
    })
    .cond([states.APPLIED, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      // Student sees "Application submitted" - no action needed
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
      };
    })
    .cond([states.ACCEPTED, TX_TRANSITION_ACTOR_PROVIDER], () => {
      // Corporate partner can mark as completed
      const primaryButtonProps = actionButtonProps(transitions.MARK_COMPLETED, 'provider');
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps,
      };
    })
    .cond([states.ACCEPTED, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      // Student sees "Application accepted" - project in progress
      // Show link to secure project workspace
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showWorkspaceLink: true,
      };
    })
    .cond([states.DECLINED, _], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
      };
    })
    .cond([states.COMPLETED, _], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsFirstLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
        showWorkspaceLink: true,
      };
    })
    .cond([states.REVIEWED_BY_CUSTOMER, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviews: true,
      };
    })
    .cond([states.REVIEWED_BY_CUSTOMER, TX_TRANSITION_ACTOR_PROVIDER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_PROVIDER, TX_TRANSITION_ACTOR_PROVIDER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviews: true,
      };
    })
    .cond([states.REVIEWED_BY_PROVIDER, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED, _], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviews: true,
      };
    })
    .default(() => {
      // Default values for other states
      return { processName, processState, showDetailCardHeadings: true };
    })
    .resolve();
};
