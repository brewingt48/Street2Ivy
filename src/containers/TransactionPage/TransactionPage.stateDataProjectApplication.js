import {
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
  TX_TRANSITION_ACTOR_PROVIDER,
  TX_TRANSITION_ACTOR_CUSTOMER,
} from '../../transactions/transaction';

/**
 * Get UI data mapped to specific transaction state & role
 * for the Street2Ivy project application process.
 *
 * Simplified matching & reputation model:
 *   Apply → Accept/Decline → Handoff → Work off-platform → Complete → Reviews
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
      // Student sees "Application submitted" — can withdraw
      const secondaryButtonProps = actionButtonProps(transitions.WITHDRAW, 'customer');
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        secondaryButtonProps,
      };
    })
    .cond([states.ACCEPTED, TX_TRANSITION_ACTOR_PROVIDER], () => {
      // Corporate partner accepted — show Hand Off + Mark Completed buttons
      const primaryButtonProps = actionButtonProps(transitions.HAND_OFF, 'provider');
      const secondaryButtonProps = actionButtonProps(transitions.MARK_COMPLETED, 'provider');
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        showHandoffInfo: true,
        primaryButtonProps,
        secondaryButtonProps,
      };
    })
    .cond([states.ACCEPTED, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      // Student's application was accepted — show handoff info
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showHandoffInfo: true,
      };
    })
    .cond([states.HANDED_OFF, TX_TRANSITION_ACTOR_PROVIDER], () => {
      // Handoff complete — provider can mark completed or cancel
      const primaryButtonProps = actionButtonProps(transitions.MARK_COMPLETED, 'provider');
      const tertiaryButtonProps = actionButtonProps(transitions.CANCEL, 'provider');
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        showHandoffInfo: true,
        primaryButtonProps,
        tertiaryButtonProps,
      };
    })
    .cond([states.HANDED_OFF, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      // Student sees handoff info — work is happening off-platform
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showHandoffInfo: true,
      };
    })
    .cond([states.DECLINED, _], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
      };
    })
    .cond([states.WITHDRAWN, _], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
      };
    })
    .cond([states.CANCELLED, _], () => {
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
