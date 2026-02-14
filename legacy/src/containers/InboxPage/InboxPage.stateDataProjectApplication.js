import {
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
  TX_TRANSITION_ACTOR_PROVIDER,
  TX_TRANSITION_ACTOR_CUSTOMER,
} from '../../transactions/transaction';

/**
 * Get UI data mapped to specific transaction state & role
 * for the Street2Ivy project application process (InboxPage).
 */
export const getStateDataForProjectApplicationProcess = (txInfo, processInfo) => {
  const { transactionRole } = txInfo;
  const { processName, processState, states } = processInfo;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

  return new ConditionalResolver([processState, transactionRole])
    .cond([states.APPLIED, TX_TRANSITION_ACTOR_PROVIDER], () => {
      // Corporate partner needs to review application
      return { processName, processState, actionNeeded: true, isSaleNotification: true };
    })
    .cond([states.APPLIED, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      // Student is waiting for response
      return { processName, processState };
    })
    .cond([states.ACCEPTED, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      // Student's application was accepted
      return { processName, processState, actionNeeded: true };
    })
    .cond([states.ACCEPTED, TX_TRANSITION_ACTOR_PROVIDER], () => {
      return { processName, processState };
    })
    .cond([states.DECLINED, _], () => {
      return { processName, processState, isFinal: true };
    })
    .cond([states.COMPLETED, _], () => {
      // Both parties should leave reviews
      return { processName, processState, actionNeeded: true };
    })
    .cond([states.REVIEWED_BY_CUSTOMER, TX_TRANSITION_ACTOR_PROVIDER], () => {
      return { processName, processState, actionNeeded: true };
    })
    .cond([states.REVIEWED_BY_PROVIDER, TX_TRANSITION_ACTOR_CUSTOMER], () => {
      return { processName, processState, actionNeeded: true };
    })
    .cond([states.REVIEWED, _], () => {
      return { processName, processState, isFinal: true };
    })
    .default(() => {
      return { processName, processState };
    })
    .resolve();
};
