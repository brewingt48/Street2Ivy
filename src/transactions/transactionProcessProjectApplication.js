/**
 * Transaction process graph for Street2Ivy project applications:
 *   - default-project-application
 *
 * Flow: Student applies → Corporate partner accepts/declines → Work completed → Reviews
 */

/**
 * Transitions
 *
 * These strings must sync with values defined in Marketplace API,
 * since transaction objects given by API contain info about last transitions.
 * All the actions in API side happen in transitions,
 * so we need to understand what those strings mean.
 */

export const transitions = {
  // A student (customer) applies to a project listing
  // Note: The Sharetribe Console process uses 'transition/inquire-without-payment'
  // as the initial transition (no-payment inquiry flow).
  APPLY: 'transition/inquire-without-payment',

  // Corporate partner (provider) accepts or declines the application
  ACCEPT: 'transition/accept',
  DECLINE: 'transition/decline',

  // Corporate partner marks the project as completed
  MARK_COMPLETED: 'transition/mark-completed',

  // Reviews are given through transaction transitions. Review 1 can be
  // by provider or customer, and review 2 will be the other party of
  // the transaction.
  REVIEW_1_BY_PROVIDER: 'transition/review-1-by-provider',
  REVIEW_1_BY_CUSTOMER: 'transition/review-1-by-customer',
  REVIEW_2_BY_PROVIDER: 'transition/review-2-by-provider',
  REVIEW_2_BY_CUSTOMER: 'transition/review-2-by-customer',
  EXPIRE_CUSTOMER_REVIEW_PERIOD: 'transition/expire-customer-review-period',
  EXPIRE_PROVIDER_REVIEW_PERIOD: 'transition/expire-provider-review-period',
  EXPIRE_REVIEW_PERIOD: 'transition/expire-review-period',
};

/**
 * States
 *
 * These constants are only for making it clear how transitions work together.
 * You should not use these constants outside of this file.
 *
 * Note: these states are not in sync with states used transaction process definitions
 *       in Marketplace API. Only last transitions are passed along transaction object.
 */
export const states = {
  INITIAL: 'initial',
  APPLIED: 'applied',
  DECLINED: 'declined',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  REVIEWED_BY_CUSTOMER: 'reviewed-by-customer',
  REVIEWED_BY_PROVIDER: 'reviewed-by-provider',
  REVIEWED: 'reviewed',
};

/**
 * Description of transaction process graph
 *
 * You should keep this in sync with transaction process defined in Marketplace API
 *
 * Note: we don't use yet any state machine library,
 *       but this description format is following Xstate (FSM library)
 *       https://xstate.js.org/docs/
 */
export const graph = {
  // id is defined only to support Xstate format.
  // However if you have multiple transaction processes defined,
  // it is best to keep them in sync with transaction process aliases.
  id: 'default-project-application/release-1',

  // This 'initial' state is a starting point for new transaction
  initial: states.INITIAL,

  // States
  states: {
    [states.INITIAL]: {
      on: {
        [transitions.APPLY]: states.APPLIED,
      },
    },
    [states.APPLIED]: {
      on: {
        [transitions.ACCEPT]: states.ACCEPTED,
        [transitions.DECLINE]: states.DECLINED,
      },
    },
    [states.DECLINED]: { type: 'final' },
    [states.ACCEPTED]: {
      on: {
        [transitions.MARK_COMPLETED]: states.COMPLETED,
      },
    },
    [states.COMPLETED]: {
      on: {
        [transitions.REVIEW_1_BY_PROVIDER]: states.REVIEWED_BY_PROVIDER,
        [transitions.REVIEW_1_BY_CUSTOMER]: states.REVIEWED_BY_CUSTOMER,
        [transitions.EXPIRE_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED_BY_CUSTOMER]: {
      on: {
        [transitions.REVIEW_2_BY_PROVIDER]: states.REVIEWED,
        [transitions.EXPIRE_PROVIDER_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED_BY_PROVIDER]: {
      on: {
        [transitions.REVIEW_2_BY_CUSTOMER]: states.REVIEWED,
        [transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED]: { type: 'final' },
  },
};

// Check if a transition is the kind that should be rendered
// when showing transition history (e.g. ActivityFeed)
// The first transition and most of the expiration transitions made by system are not relevant
export const isRelevantPastTransition = transition => {
  return [
    transitions.APPLY,
    transitions.ACCEPT,
    transitions.DECLINE,
    transitions.MARK_COMPLETED,
    transitions.REVIEW_1_BY_PROVIDER,
    transitions.REVIEW_1_BY_CUSTOMER,
    transitions.REVIEW_2_BY_PROVIDER,
    transitions.REVIEW_2_BY_CUSTOMER,
  ].includes(transition);
};

// Processes might be different on how reviews are handled.
// Default processes use two-sided diamond shape, where either party can make the review first
export const isCustomerReview = transition => {
  return [transitions.REVIEW_1_BY_CUSTOMER, transitions.REVIEW_2_BY_CUSTOMER].includes(transition);
};

// Processes might be different on how reviews are handled.
// Default processes use two-sided diamond shape, where either party can make the review first
export const isProviderReview = transition => {
  return [transitions.REVIEW_1_BY_PROVIDER, transitions.REVIEW_2_BY_PROVIDER].includes(transition);
};

// Check if the given transition is privileged.
//
// Privileged transitions need to be handled from a secure context,
// i.e. the backend. This helper is used to check if the transition
// should go through the local API endpoints, or if using JS SDK is
// enough.
// No privileged transitions for project applications (no payments)
export const isPrivileged = transition => {
  return false;
};

// Check when transaction is completed (project done, reviews possible)
export const isCompleted = transition => {
  const txCompletedTransitions = [
    transitions.MARK_COMPLETED,
    transitions.REVIEW_1_BY_CUSTOMER,
    transitions.REVIEW_1_BY_PROVIDER,
    transitions.REVIEW_2_BY_CUSTOMER,
    transitions.REVIEW_2_BY_PROVIDER,
    transitions.EXPIRE_REVIEW_PERIOD,
    transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD,
    transitions.EXPIRE_PROVIDER_REVIEW_PERIOD,
  ];
  return txCompletedTransitions.includes(transition);
};

// Check when transaction is refunded
// No refunds in project application process (no payments)
export const isRefunded = transition => {
  return false;
};

// States where provider (corporate partner) needs to take action
export const statesNeedingProviderAttention = [states.APPLIED, states.COMPLETED];

// States where customer (student) needs to take action
export const statesNeedingCustomerAttention = [states.ACCEPTED, states.COMPLETED];
