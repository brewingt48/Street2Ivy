import React, { useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';

import { FormattedMessage, intlShape, useIntl } from '../../util/reactIntl';
import { parse } from '../../util/urlHelpers';
import { getCurrentUserTypeRoles } from '../../util/userHelpers';
import {
  propTypes,
  DATE_TYPE_DATE,
  DATE_TYPE_DATETIME,
  LINE_ITEM_DAY,
  LINE_ITEM_HOUR,
  LISTING_UNIT_TYPES,
  STOCK_MULTIPLE_ITEMS,
  AVAILABILITY_MULTIPLE_SEATS,
  LINE_ITEM_FIXED,
} from '../../util/types';
import { subtractTime } from '../../util/dates';
import { createResourceLocatorString } from '../../util/routes';
import {
  TX_TRANSITION_ACTOR_CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER,
  resolveLatestProcessName,
  getProcess,
  isBookingProcess,
  isPurchaseProcess,
  isNegotiationProcess,
} from '../../transactions/transaction';

import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  H2,
  Avatar,
  NamedLink,
  NotificationBadge,
  Page,
  PaginationLinks,
  TabNav,
  IconSpinner,
  TimeRange,
  UserDisplayName,
  LayoutSideNavigation,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import NotFoundPage from '../../containers/NotFoundPage/NotFoundPage';
import InboxSearchForm from './InboxSearchForm/InboxSearchForm';

import { stateDataShape, getStateData } from './InboxPage.stateData';
import ComposeMessageModal from './ComposeMessageModal';
import css from './InboxPage.module.css';

const INBOX_PAGE_SIZE = 10;
const MESSAGES_PAGE_SIZE = 20;

// Format a timestamp into a human-readable relative time (e.g. "2h ago", "3d ago")
const formatRelativeTime = (dateString, intl) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return intl.formatMessage({ id: 'InboxPage.timeJustNow' });
  if (diffMins < 60) return intl.formatMessage({ id: 'InboxPage.timeMinutesAgo' }, { minutes: diffMins });
  if (diffHours < 24) return intl.formatMessage({ id: 'InboxPage.timeHoursAgo' }, { hours: diffHours });
  if (diffDays < 7) return intl.formatMessage({ id: 'InboxPage.timeDaysAgo' }, { days: diffDays });
  if (diffDays < 30) return intl.formatMessage({ id: 'InboxPage.timeWeeksAgo' }, { weeks: Math.floor(diffDays / 7) });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Check if the transaction line-items use booking-related units
const getUnitLineItem = lineItems => {
  const unitLineItem = lineItems?.find(
    item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal
  );
  return unitLineItem;
};

// Booking data (start & end) are bit different depending on display times and
// if "end" refers to last day booked or the first exclusive day
const bookingData = (tx, lineItemUnitType, timeZone) => {
  // Attributes: displayStart and displayEnd can be used to differentiate shown time range
  // from actual start and end times used for availability reservation. It can help in situations
  // where there are preparation time needed between bookings.
  // Read more: https://www.sharetribe.com/api-reference/marketplace.html#bookings
  const { start, end, displayStart, displayEnd } = tx.booking.attributes;
  const bookingStart = displayStart || start;
  const bookingEndRaw = displayEnd || end;

  // LINE_ITEM_DAY uses exclusive end day, so we subtract one day from the end date
  const isDayBooking = [LINE_ITEM_DAY].includes(lineItemUnitType);
  const bookingEnd = isDayBooking
    ? subtractTime(bookingEndRaw, 1, 'days', timeZone)
    : bookingEndRaw;

  return { bookingStart, bookingEnd };
};

const BookingTimeInfoMaybe = props => {
  const { transaction, ...rest } = props;
  const processName = resolveLatestProcessName(transaction?.attributes?.processName);
  const process = getProcess(processName);
  const isInquiry = process.getState(transaction) === process.states.INQUIRY;

  if (isInquiry) {
    return null;
  }

  const hasLineItems = transaction?.attributes?.lineItems?.length > 0;
  const unitLineItem = hasLineItems
    ? transaction.attributes?.lineItems?.find(
        item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal
      )
    : null;

  const lineItemUnitType = unitLineItem ? unitLineItem.code : null;
  const dateType = [LINE_ITEM_HOUR, LINE_ITEM_FIXED].includes(lineItemUnitType)
    ? DATE_TYPE_DATETIME
    : DATE_TYPE_DATE;

  const timeZone = transaction?.listing?.attributes?.availabilityPlan?.timezone || 'Etc/UTC';
  const { bookingStart, bookingEnd } = bookingData(transaction, lineItemUnitType, timeZone);

  return (
    <TimeRange
      startDate={bookingStart}
      endDate={bookingEnd}
      dateType={dateType}
      timeZone={timeZone}
      {...rest}
    />
  );
};

// Build and push path string for routing - based on sort selection as selected in InboxSearchForm
const handleSortSelect = (tab, routeConfiguration, history) => urlParam => {
  const pathParams = {
    tab: tab,
  };
  const searchParams = {
    sort: urlParam,
  };

  const sortPath = createResourceLocatorString(
    'InboxPage',
    routeConfiguration,
    pathParams,
    searchParams
  );

  history.push(sortPath);
};

/**
 * ConversationItem — renders a single inbox row for custom messaging conversations.
 * Used on the "Messages" tab which fetches from our custom API (not Sharetribe).
 */
const ConversationItem = ({ conversation, currentUserId, intl }) => {
  // Handle direct message threads (conversationType === 'direct')
  if (conversation.conversationType === 'direct') {
    const {
      threadId,
      otherUserName,
      otherUserType,
      subject,
      lastMessageContent: dmContent,
      lastMessageSender: dmSender,
      lastMessageAt: dmAt,
      unreadCount: dmUnread,
    } = conversation;

    const preview = dmContent
      ? `${dmSender ? dmSender + ': ' : ''}${dmContent.substring(0, 80)}${dmContent.length > 80 ? '...' : ''}`
      : '';
    const timeAgo = dmAt ? formatRelativeTime(dmAt, intl) : '';
    const rowClasses = classNames(css.emailRow, { [css.emailRowUnread]: dmUnread > 0 });

    const typeBadge = (otherUserType === 'educational-admin' || otherUserType === 'system-admin')
      ? 'Admin'
      : otherUserType === 'corporate-partner'
      ? 'Partner'
      : otherUserType === 'student'
      ? 'Student'
      : '';

    return (
      <NamedLink className={rowClasses} name="DirectConversationPage" params={{ threadId }}>
        {dmUnread > 0 && <div className={css.itemNotificationBar} />}
        <div className={css.emailFrom}>
          <div className={css.emailAvatar} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: typeBadge === 'Admin' ? '#6366f1' : 'var(--s2i-teal-500)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 14, fontWeight: 600, flexShrink: 0,
          }}>
            {(otherUserName || '?')[0]?.toUpperCase()}
          </div>
          <div className={css.emailFromInfo}>
            <span className={css.emailFromName}>
              {otherUserName || 'User'}
              {typeBadge && (
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 600,
                  padding: '1px 6px', borderRadius: 8,
                  background: typeBadge === 'Admin' ? '#eef2ff' : '#f0fdfa',
                  color: typeBadge === 'Admin' ? '#4f46e5' : '#0d9488',
                }}>
                  {typeBadge}
                </span>
              )}
              {dmUnread > 0 && (
                <span style={{
                  marginLeft: 6, background: 'var(--s2i-coral-500)', color: 'white',
                  fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 5px',
                }}>
                  {dmUnread}
                </span>
              )}
            </span>
            <span className={css.emailFromProjectMobile}>{subject || 'Direct Message'}</span>
          </div>
        </div>
        <div className={css.emailSubject}>
          <span className={css.emailSubjectTitle}>{subject || 'Direct Message'}</span>
          {preview && <span className={css.emailSubjectPreview}>{preview}</span>}
        </div>
        <div className={css.emailStatus}>
          <div className={css.stateName} style={{ background: '#eef2ff', color: '#4f46e5' }}>Direct</div>
        </div>
        <div className={css.emailDate}>{timeAgo}</div>
      </NamedLink>
    );
  }

  // Regular application conversation
  const {
    id,
    studentId,
    studentName,
    corporateName,
    listingTitle,
    status,
    lastMessageContent,
    lastMessageSender,
    lastMessageAt,
    unreadCount,
    totalMessages,
    initiatedBy,
  } = conversation;

  const isStudent = studentId === currentUserId;
  const otherPartyName = isStudent ? (corporateName || 'Corporate Partner') : (studentName || 'Student');

  // Status badge styling
  const statusBadgeClass = classNames(css.stateName, {
    [css.stateActionNeeded]: status === 'pending' || status === 'invited',
    [css.stateNoActionNeeded]: status === 'accepted' || status === 'student_accepted',
    [css.stateConcluded]: status === 'completed' || status === 'withdrawn' || status === 'rejected' || status === 'declined',
  });

  // Status display text
  const statusLabelMap = {
    pending: 'Pending',
    invited: 'Invited',
    accepted: 'Accepted',
    student_accepted: 'Accepted',
    rejected: 'Declined',
    declined: 'Declined',
    withdrawn: 'Withdrawn',
    completed: 'Completed',
  };
  const statusLabel = statusLabelMap[status] || status;

  // Preview snippet: show last message or a placeholder
  const preview = lastMessageContent
    ? `${lastMessageSender ? lastMessageSender + ': ' : ''}${lastMessageContent.substring(0, 80)}${lastMessageContent.length > 80 ? '...' : ''}`
    : totalMessages === 0
    ? intl.formatMessage({ id: 'InboxPage.messagesNoMessagesYet' })
    : '';

  const timeAgo = lastMessageAt ? formatRelativeTime(lastMessageAt, intl) : formatRelativeTime(conversation.submittedAt, intl);

  const rowClasses = classNames(css.emailRow, {
    [css.emailRowUnread]: unreadCount > 0,
  });

  // Direction badge
  const directionBadge = (
    <span className={isStudent ? css.directionBadgeSent : css.directionBadgeReceived}>
      {isStudent
        ? intl.formatMessage({ id: 'InboxPage.directionSent' })
        : intl.formatMessage({ id: 'InboxPage.directionReceived' })}
    </span>
  );

  return (
    <NamedLink
      className={rowClasses}
      name="ConversationPage"
      params={{ id }}
    >
      {unreadCount > 0 && <div className={css.itemNotificationBar} />}

      {/* From / To column */}
      <div className={css.emailFrom}>
        <div className={css.emailAvatar} style={{
          width: 32, height: 32, borderRadius: '50%', background: 'var(--s2i-teal-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 14, fontWeight: 600, flexShrink: 0,
        }}>
          {(otherPartyName || '?')[0]?.toUpperCase()}
        </div>
        <div className={css.emailFromInfo}>
          <span className={css.emailFromName}>
            {otherPartyName}
            {directionBadge}
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 6, background: 'var(--s2i-coral-500)', color: 'white',
                fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 5px',
              }}>
                {unreadCount}
              </span>
            )}
          </span>
          <span className={css.emailFromProjectMobile}>{listingTitle || 'Project'}</span>
        </div>
      </div>

      {/* Subject / Project column */}
      <div className={css.emailSubject}>
        <span className={css.emailSubjectTitle}>{listingTitle || 'Project'}</span>
        {preview && <span className={css.emailSubjectPreview}>{preview}</span>}
      </div>

      {/* Status column */}
      <div className={css.emailStatus}>
        <div className={statusBadgeClass}>{statusLabel}</div>
      </div>

      {/* Date column */}
      <div className={css.emailDate}>{timeAgo}</div>
    </NamedLink>
  );
};

/**
 * The InboxItem component — email-table-row style matching admin MessagesPanel.
 *
 * @component
 * @param {Object} props
 * @param {TX_TRANSITION_ACTOR_CUSTOMER | TX_TRANSITION_ACTOR_PROVIDER} props.transactionRole - The transaction role
 * @param {propTypes.transaction} props.tx - The transaction
 * @param {intlShape} props.intl - The intl object
 * @param {stateDataShape} props.stateData - The state data
 * @param {boolean} [props.showDirection] - Whether to show Sent/Received direction badge
 * @returns {JSX.Element} inbox item component
 */
export const InboxItem = props => {
  const {
    transactionRole,
    tx,
    intl,
    stateData,
    isBooking,
    isPurchase,
    availabilityType,
    stockType = STOCK_MULTIPLE_ITEMS,
    showDirection = false,
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

  const lineItems = tx.attributes?.lineItems || [];
  const hasPricingData = lineItems.length > 0;
  const unitLineItem = getUnitLineItem(lineItems);
  const quantity = hasPricingData && isPurchase ? unitLineItem?.quantity?.toString() : null;
  const showStock = stockType === STOCK_MULTIPLE_ITEMS || (quantity && unitLineItem?.quantity > 1);
  const otherUser = isCustomer ? provider : customer;
  const otherUserDisplayName = otherUser ? <UserDisplayName user={otherUser} intl={intl} /> : null;
  const isOtherUserBanned = otherUser?.attributes?.banned;

  const stateClasses = classNames(css.stateName, {
    [css.stateConcluded]: isFinal,
    [css.stateActionNeeded]: actionNeeded,
    [css.stateNoActionNeeded]: !actionNeeded,
  });

  // Format relative time for the transaction
  const lastTransitionedAt = tx.attributes?.lastTransitionedAt;
  const timeAgo = lastTransitionedAt ? formatRelativeTime(lastTransitionedAt, intl) : '';

  // Generate a preview snippet based on state
  const getPreviewSnippet = () => {
    if (processName === 'default-project-application') {
      if (processState === 'applied' && !isCustomer) return intl.formatMessage({ id: 'InboxPage.previewAppliedProvider' });
      if (processState === 'applied' && isCustomer) return intl.formatMessage({ id: 'InboxPage.previewAppliedCustomer' });
      if (processState === 'accepted' && isCustomer) return intl.formatMessage({ id: 'InboxPage.previewAcceptedCustomer' });
      if (processState === 'accepted' && !isCustomer) return intl.formatMessage({ id: 'InboxPage.previewAcceptedProvider' });
      if (processState === 'declined') return intl.formatMessage({ id: 'InboxPage.previewDeclined' });
      if (processState === 'completed') return intl.formatMessage({ id: 'InboxPage.previewCompleted' });
      if (processState?.includes('reviewed')) return intl.formatMessage({ id: 'InboxPage.previewReviewed' });
    }
    return null;
  };
  const previewSnippet = getPreviewSnippet();

  // Direction badge for the "All Messages" tab
  const directionBadge = showDirection ? (
    <span className={isCustomer ? css.directionBadgeSent : css.directionBadgeReceived}>
      {isCustomer
        ? intl.formatMessage({ id: 'InboxPage.directionSent' })
        : intl.formatMessage({ id: 'InboxPage.directionReceived' })}
    </span>
  ) : null;

  const rowClasses = classNames(css.emailRow, {
    [css.emailRowUnread]: actionNeeded,
    [css.bannedUserLink]: isOtherUserBanned,
  });

  // On mobile: render as a card. On desktop: renders as a table row via CSS.
  return (
    <NamedLink
      className={rowClasses}
      name={isCustomer ? 'OrderDetailsPage' : 'SaleDetailsPage'}
      params={{ id: tx.id.uuid }}
    >
      {/* Unread indicator bar */}
      {(isSaleNotification || isOrderNotification) && <div className={css.itemNotificationBar} />}

      {/* From / To column */}
      <div className={css.emailFrom}>
        <Avatar user={otherUser} className={css.emailAvatar} />
        <div className={css.emailFromInfo}>
          <span className={css.emailFromName}>
            {otherUserDisplayName}
            {directionBadge}
          </span>
          {/* Mobile-only: show project title under name */}
          <span className={css.emailFromProjectMobile}>{listing?.attributes?.title}</span>
        </div>
      </div>

      {/* Subject / Project column */}
      <div className={css.emailSubject}>
        <span className={css.emailSubjectTitle}>{listing?.attributes?.title}</span>
        {previewSnippet && <span className={css.emailSubjectPreview}>{previewSnippet}</span>}
      </div>

      {/* Status column */}
      <div className={css.emailStatus}>
        <div className={stateClasses}>
          <FormattedMessage
            id={`InboxPage.${processName}.${processState}.status`}
            values={{ transactionRole }}
          />
        </div>
      </div>

      {/* Date column */}
      <div className={css.emailDate}>{timeAgo}</div>
    </NamedLink>
  );
};

/**
 * The InboxPage component.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.currentUser - The current user
 * @param {boolean} props.fetchInProgress - Whether the fetch is in progress
 * @param {propTypes.error} props.fetchOrdersOrSalesError - The fetch orders or sales error
 * @param {propTypes.pagination} props.pagination - The pagination object
 * @param {Object} props.params - The params object
 * @param {string} props.params.tab - The tab
 * @param {number} props.providerNotificationCount - The provider notification count
 * @param {number} props.customerNotificationCount - The customer notification count
 * @param {boolean} props.scrollingDisabled - Whether scrolling is disabled
 * @param {Array<propTypes.transaction>} props.transactions - The transactions array
 * @param {Object} props.intl - The intl object
 * @returns {JSX.Element} inbox page component
 */
export const InboxPageComponent = props => {
  const [composeOpen, setComposeOpen] = useState(false);
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();
  const intl = useIntl();
  const location = useLocation();
  const {
    currentUser,
    fetchInProgress,
    fetchOrdersOrSalesError,
    pagination,
    params,
    providerNotificationCount = 0,
    customerNotificationCount = 0,
    scrollingDisabled,
    transactions,
    conversations = [],
    conversationsPagination,
  } = props;
  const { tab } = params;
  const validTab = tab === 'all' || tab === 'messages' || tab === 'applications' || tab === 'received' || tab === 'orders' || tab === 'sales';
  if (!validTab) {
    return <NotFoundPage staticContext={props.staticContext} />;
  }

  // Normalize legacy tab names → new names
  const isAllTab = tab === 'all';
  const isMessagesTab = tab === 'messages';
  const isApplicationsTab = tab === 'applications' || tab === 'orders';
  const isReceivedTab = tab === 'received' || tab === 'sales';

  const { customer: isCustomerUserType, provider: isProviderUserType } = getCurrentUserTypeRoles(
    config,
    currentUser
  );

  // Check user type for dashboard link
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isSystemAdmin = userType === 'system-admin';
  const isEducationalAdmin = userType === 'educational-admin';
  const isStudent = userType === 'student';
  const isCorporatePartner = userType === 'corporate-partner';

  // Determine which dashboard link to show
  const getDashboardLink = () => {
    if (isSystemAdmin) {
      return { name: 'AdminDashboardPage', label: intl.formatMessage({ id: 'InboxPage.backToAdminDashboard' }) };
    }
    if (isEducationalAdmin) {
      return { name: 'EducationDashboardPage', label: intl.formatMessage({ id: 'InboxPage.backToEducationDashboard' }) };
    }
    if (isStudent) {
      return { name: 'StudentDashboardPage', label: intl.formatMessage({ id: 'InboxPage.backToStudentDashboard' }) };
    }
    if (isCorporatePartner) {
      return { name: 'CorporateDashboardPage', label: intl.formatMessage({ id: 'InboxPage.backToCorporateDashboard' }) };
    }
    return null;
  };

  const dashboardLink = getDashboardLink();

  const itemCount = isMessagesTab ? conversations.length : transactions.length;
  const hasNoResults = !fetchInProgress && itemCount === 0 && !fetchOrdersOrSalesError;
  const ordersTitle = intl.formatMessage({ id: 'InboxPage.ordersTitle' });
  const salesTitle = intl.formatMessage({ id: 'InboxPage.salesTitle' });
  const allTitle = intl.formatMessage({ id: 'InboxPage.allMessagesHeading' });
  const messagesTitle = intl.formatMessage({ id: 'InboxPage.messagesHeading' });
  const title = isMessagesTab ? messagesTitle : isAllTab ? allTitle : isApplicationsTab ? ordersTitle : salesTitle;
  const search = parse(location.search);

  const pickType = lt => conf => conf.listingType === lt;
  const findListingTypeConfig = publicData => {
    const listingTypeConfigs = config.listing?.listingTypes;
    const { listingType } = publicData || {};
    const foundConfig = listingTypeConfigs?.find(pickType(listingType));
    return foundConfig;
  };
  const toTxItem = tx => {
    // For the "All" tab, resolve role per-transaction based on who the current user is
    let transactionRole;
    if (isAllTab) {
      transactionRole = tx.customer?.id?.uuid === currentUser?.id?.uuid
        ? TX_TRANSITION_ACTOR_CUSTOMER
        : TX_TRANSITION_ACTOR_PROVIDER;
    } else {
      transactionRole = isApplicationsTab ? TX_TRANSITION_ACTOR_CUSTOMER : TX_TRANSITION_ACTOR_PROVIDER;
    }

    let stateData = null;
    try {
      stateData = getStateData({ transaction: tx, transactionRole, intl });
    } catch (error) {
      // If stateData is missing, omit the transaction from InboxItem list.
    }

    const publicData = tx?.listing?.attributes?.publicData || {};
    const foundListingTypeConfig = findListingTypeConfig(publicData);
    const { transactionType, stockType, availabilityType } = foundListingTypeConfig || {};
    const process = tx?.attributes?.processName || transactionType?.transactionType;
    const transactionProcess = resolveLatestProcessName(process);
    const isBooking = isBookingProcess(transactionProcess);
    const isPurchase = isPurchaseProcess(transactionProcess);
    const isNegotiation = isNegotiationProcess(transactionProcess);

    // Render InboxItem only if the latest transition of the transaction is handled in the `txState` function.
    return stateData ? (
      <li key={tx.id.uuid} className={css.listItem}>
        <InboxItem
          transactionRole={transactionRole}
          tx={tx}
          intl={intl}
          stateData={stateData}
          stockType={stockType}
          availabilityType={availabilityType}
          isBooking={isBooking}
          isPurchase={isPurchase}
          showDirection={isAllTab}
        />
      </li>
    ) : null;
  };

  const hasOrderOrSaleTransactions = (tx, isAppTab, user) => {
    return isAppTab
      ? user?.id && tx && tx.length > 0 && tx[0].customer.id.uuid === user?.id?.uuid
      : user?.id && tx && tx.length > 0 && tx[0].provider.id.uuid === user?.id?.uuid;
  };

  // For the "All" tab, just check if there are any transactions
  const hasTransactions = isMessagesTab
    ? !fetchInProgress && conversations.length > 0
    : isAllTab
    ? !fetchInProgress && transactions.length > 0
    : !fetchInProgress && hasOrderOrSaleTransactions(transactions, isApplicationsTab, currentUser);

  // Build tabs — "All Messages" is always visible, role-specific tabs based on user roles
  const totalNotifications = customerNotificationCount + providerNotificationCount;

  const allMessagesTab = {
    text: (
      <span>
        <FormattedMessage id="InboxPage.allMessagesTab" />
        {totalNotifications > 0 ? (
          <NotificationBadge count={totalNotifications} />
        ) : null}
      </span>
    ),
    selected: isAllTab,
    linkProps: {
      name: 'InboxPage',
      params: { tab: 'all' },
    },
  };

  // Use role-aware labels with education-appropriate tab names
  const applicationsTabMaybe = isCustomerUserType
    ? [
        {
          text: (
            <span>
              {isStudent ? <FormattedMessage id="InboxPage.studentOrdersTab" /> : <FormattedMessage id="InboxPage.ordersTabTitle" />}
              {customerNotificationCount > 0 ? (
                <NotificationBadge count={customerNotificationCount} />
              ) : null}
            </span>
          ),
          selected: isApplicationsTab,
          linkProps: {
            name: 'InboxPage',
            params: { tab: 'applications' },
          },
        },
      ]
    : [];

  const receivedTabMaybe = isProviderUserType
    ? [
        {
          text: (
            <span>
              {isCorporatePartner ? <FormattedMessage id="InboxPage.corporateSalesTab" /> : <FormattedMessage id="InboxPage.salesTabTitle" />}
              {providerNotificationCount > 0 ? (
                <NotificationBadge count={providerNotificationCount} />
              ) : null}
            </span>
          ),
          selected: isReceivedTab,
          linkProps: {
            name: 'InboxPage',
            params: { tab: 'received' },
          },
        },
      ]
    : [];

  const messagesTab = {
    text: (
      <span>
        <FormattedMessage id="InboxPage.messagesTab" />
      </span>
    ),
    selected: isMessagesTab,
    linkProps: {
      name: 'InboxPage',
      params: { tab: 'messages' },
    },
  };

  const tabs = [allMessagesTab, messagesTab, ...applicationsTabMaybe, ...receivedTabMaybe];

  // Determine heading and subtitle based on active tab
  const getHeading = () => {
    if (isAllTab) return intl.formatMessage({ id: 'InboxPage.allMessagesHeading' });
    if (isMessagesTab) return intl.formatMessage({ id: 'InboxPage.messagesHeading' });
    if (isStudent && isApplicationsTab) return intl.formatMessage({ id: 'InboxPage.studentOrdersHeading' });
    if (isCorporatePartner && isReceivedTab) return intl.formatMessage({ id: 'InboxPage.corporateSalesHeading' });
    return intl.formatMessage({ id: isApplicationsTab ? 'InboxPage.ordersHeading' : 'InboxPage.salesHeading' });
  };
  const getSubtitle = () => {
    if (isAllTab) return intl.formatMessage({ id: 'InboxPage.allMessagesSubtitle' });
    if (isMessagesTab) return intl.formatMessage({ id: 'InboxPage.messagesSubtitle' });
    if (isStudent && isApplicationsTab) return intl.formatMessage({ id: 'InboxPage.studentOrdersSubtitle' });
    if (isCorporatePartner && isReceivedTab) return intl.formatMessage({ id: 'InboxPage.corporateSalesSubtitle' });
    return intl.formatMessage({ id: isApplicationsTab ? 'InboxPage.ordersSubtitle' : 'InboxPage.salesSubtitle' });
  };

  // Determine empty state messages based on tab
  const getEmptyStateTitle = () => {
    if (isAllTab) return 'InboxPage.noAllMessagesTitle';
    if (isMessagesTab) return 'InboxPage.noMessagesTitle';
    return isApplicationsTab ? 'InboxPage.noOrdersTitle' : 'InboxPage.noSalesTitle';
  };
  const getEmptyStateText = () => {
    if (isAllTab) return 'InboxPage.noAllMessagesFound';
    if (isMessagesTab) return 'InboxPage.noMessagesFound';
    return isApplicationsTab ? 'InboxPage.noOrdersFound' : 'InboxPage.noSalesFound';
  };

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSideNavigation
        sideNavClassName={css.navigation}
        topbar={
          <TopbarContainer
            mobileRootClassName={css.mobileTopbar}
            desktopClassName={css.desktopTopbar}
          />
        }
        sideNav={
          <>
            {dashboardLink && (
              <NamedLink name={dashboardLink.name} className={css.dashboardLink}>
                ← {dashboardLink.label}
              </NamedLink>
            )}
            <H2 as="h1" className={css.title}>
              <FormattedMessage id="InboxPage.title" />
            </H2>
            <TabNav
              rootClassName={css.tabs}
              tabRootClassName={css.tab}
              tabs={tabs}
              ariaLabel={intl.formatMessage({ id: 'InboxPage.screenreader.sidenav' })}
            />{' '}
          </>
        }
        footer={<FooterContainer />}
      >
        {/* Compose Message Modal */}
        <ComposeMessageModal
          isOpen={composeOpen}
          onClose={() => setComposeOpen(false)}
          onSuccess={(result) => {
            // Navigate to the new conversation
            if (result.conversationType === 'direct') {
              history.push(`/inbox/direct/${result.conversationId}`);
            } else {
              history.push(`/inbox/conversation/${result.conversationId}`);
            }
          }}
        />

        {/* Email-style Inbox Header */}
        <div className={css.inboxHeader}>
          <div className={css.inboxHeaderInfo}>
            <h2 className={css.inboxHeaderTitle}>{getHeading()}</h2>
            <p className={css.inboxHeaderSubtitle}>{getSubtitle()}</p>
          </div>
          <div className={css.inboxHeaderActions}>
            <button
              className={css.composeButton}
              onClick={() => setComposeOpen(true)}
            >
              <FormattedMessage id="InboxPage.composeButton" />
            </button>
          </div>
          <InboxSearchForm
            onSubmit={() => {}}
            onSelect={handleSortSelect(tab, routeConfiguration, history)}
            intl={intl}
            tab={tab}
            routeConfiguration={routeConfiguration}
            history={history}
          />
        </div>

        {/* Message count bar */}
        {!fetchInProgress && itemCount > 0 && (
          <div className={css.inboxCount}>
            {intl.formatMessage({ id: 'InboxPage.messageCount' }, { count: itemCount })}
            {!isMessagesTab && pagination?.totalItems > INBOX_PAGE_SIZE && (
              <span className={css.inboxCountTotal}>
                {intl.formatMessage({ id: 'InboxPage.messageCountTotal' }, { total: pagination.totalItems })}
              </span>
            )}
          </div>
        )}

        {fetchOrdersOrSalesError ? (
          <div className={css.errorCard}>
            <span className={css.errorIcon}>⚠</span>
            <FormattedMessage id="InboxPage.fetchFailed" />
          </div>
        ) : null}

        {/* Email-table layout matching admin MessagesPanel */}
        <div className={css.emailListContainer}>
          {/* Table header row (desktop only) */}
          {!fetchInProgress && itemCount > 0 && (
            <div className={css.emailTableHeader}>
              <div className={css.emailHeaderFrom}>
                <FormattedMessage id="InboxPage.columnFrom" />
              </div>
              <div className={css.emailHeaderSubject}>
                <FormattedMessage id="InboxPage.columnProject" />
              </div>
              <div className={css.emailHeaderStatus}>
                <FormattedMessage id="InboxPage.columnStatus" />
              </div>
              <div className={css.emailHeaderDate}>
                <FormattedMessage id="InboxPage.columnDate" />
              </div>
            </div>
          )}

          <div className={css.emailListBody}>
            {!fetchInProgress ? (
              isMessagesTab ? (
                conversations.map(conv => (
                  <li key={conv.id} className={css.listItem}>
                    <ConversationItem
                      conversation={conv}
                      currentUserId={currentUser?.id?.uuid}
                      intl={intl}
                    />
                  </li>
                ))
              ) : (
                transactions.map(toTxItem)
              )
            ) : (
              <div className={css.loadingContainer}>
                <IconSpinner />
                <span className={css.loadingText}>
                  <FormattedMessage id="InboxPage.loading" />
                </span>
              </div>
            )}
            {hasNoResults ? (
              <div className={css.emptyState}>
                <div className={css.emptyStateIcon}>📬</div>
                <h3 className={css.emptyStateTitle}>
                  <FormattedMessage id={getEmptyStateTitle()} />
                </h3>
                <p className={css.emptyStateText}>
                  <FormattedMessage id={getEmptyStateText()} />
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {hasTransactions && pagination && pagination.totalPages > 1 ? (
          <PaginationLinks
            className={css.pagination}
            pageName="InboxPage"
            pagePathParams={params}
            pageSearchParams={search}
            pagination={pagination}
          />
        ) : null}
      </LayoutSideNavigation>
    </Page>
  );
};

const mapStateToProps = state => {
  const {
    fetchInProgress,
    fetchOrdersOrSalesError,
    pagination,
    transactionRefs,
    conversations,
    conversationsPagination,
  } = state.InboxPage;
  const {
    currentUser,
    currentUserSaleNotificationCount,
    currentUserOrderNotificationCount,
  } = state.user;
  return {
    currentUser,
    fetchInProgress,
    fetchOrdersOrSalesError,
    pagination,
    providerNotificationCount: currentUserSaleNotificationCount,
    customerNotificationCount: currentUserOrderNotificationCount,
    scrollingDisabled: isScrollingDisabled(state),
    transactions: getMarketplaceEntities(state, transactionRefs),
    conversations,
    conversationsPagination,
  };
};

const InboxPage = compose(connect(mapStateToProps))(InboxPageComponent);

export default InboxPage;
