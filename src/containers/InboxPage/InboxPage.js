import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { compose } from 'redux';
import { connect, useDispatch } from 'react-redux';
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
  Reviews,
  ReputationDashboard,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import NotFoundPage from '../../containers/NotFoundPage/NotFoundPage';

import { stateDataShape, getStateData } from './InboxPage.stateData';
import {
  setSelectedConversation,
  setFilter,
  setSearchQuery,
  clearInboxSelection,
  fetchReviewsThunk,
} from './InboxPage.duck';

import ConversationListItem from './ConversationListItem/ConversationListItem';
import InboxFilterBar from './InboxFilterBar/InboxFilterBar';
import InboxEmptyState from './InboxEmptyState/InboxEmptyState';
import { EmbeddedConversation } from './EmbeddedConversation';

import css from './InboxPage.module.css';

// ================ Helpers ================ //

// Check if the transaction line-items use booking-related units
const getUnitLineItem = lineItems => {
  const unitLineItem = lineItems?.find(
    item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal
  );
  return unitLineItem;
};

// Booking data (start & end)
const bookingData = (tx, lineItemUnitType, timeZone) => {
  const { start, end, displayStart, displayEnd } = tx.booking.attributes;
  const bookingStart = displayStart || start;
  const bookingEndRaw = displayEnd || end;
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

  if (isInquiry) return null;

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

// Build and push path for sort routing
const handleSortSelect = (tab, routeConfiguration, history) => urlParam => {
  const sortPath = createResourceLocatorString(
    'InboxPage',
    routeConfiguration,
    { tab },
    { sort: urlParam }
  );
  history.push(sortPath);
};

// Desktop detection (1024px breakpoint)
const useIsDesktop = () => {
  const hasMatchMedia =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function';

  const [isDesktop, setIsDesktop] = useState(
    hasMatchMedia ? window.matchMedia('(min-width: 1024px)').matches : false
  );

  useEffect(() => {
    if (!hasMatchMedia) return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = e => setIsDesktop(e.matches);
    // Modern API
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    // Legacy fallback
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [hasMatchMedia]);

  return isDesktop;
};

// ================ Legacy InboxItem (exported for test compatibility) ================ //

/**
 * The InboxItem component — preserved for backward compatibility.
 *
 * @component
 * @param {Object} props
 * @param {TX_TRANSITION_ACTOR_CUSTOMER | TX_TRANSITION_ACTOR_PROVIDER} props.transactionRole
 * @param {propTypes.transaction} props.tx
 * @param {intlShape} props.intl
 * @param {stateDataShape} props.stateData
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

  const lineItems = tx.attributes?.lineItems;
  const hasPricingData = lineItems.length > 0;
  const unitLineItem = getUnitLineItem(lineItems);
  const quantity = hasPricingData && isPurchase ? unitLineItem.quantity.toString() : null;
  const showStock = stockType === STOCK_MULTIPLE_ITEMS || (quantity && unitLineItem.quantity > 1);
  const otherUser = isCustomer ? provider : customer;
  const otherUserDisplayName = <UserDisplayName user={otherUser} intl={intl} />;
  const isOtherUserBanned = otherUser.attributes.banned;

  const rowNotificationDot =
    isSaleNotification || isOrderNotification ? <div className={css.notificationDot} /> : null;

  const linkClasses = classNames(css.itemLink, {
    [css.bannedUserLink]: isOtherUserBanned,
  });
  const stateClasses = classNames(css.stateName, {
    [css.stateConcluded]: isFinal,
    [css.stateActionNeeded]: actionNeeded,
    [css.stateNoActionNeeded]: !actionNeeded,
  });

  return (
    <div className={css.item}>
      <div className={css.itemAvatar}>
        <Avatar user={otherUser} />
      </div>
      <NamedLink
        className={linkClasses}
        name={isCustomer ? 'OrderDetailsPage' : 'SaleDetailsPage'}
        params={{ id: tx.id.uuid }}
      >
        <div className={css.rowNotificationDot}>{rowNotificationDot}</div>
        <div className={css.itemUsername}>{otherUserDisplayName}</div>
        <div className={css.itemTitle}>{listing?.attributes?.title}</div>
        <div className={css.itemDetails}>
          {isBooking ? (
            <BookingTimeInfoMaybe transaction={tx} />
          ) : isPurchase && hasPricingData && showStock ? (
            <FormattedMessage id="InboxPage.quantity" values={{ quantity }} />
          ) : null}
        </div>
        {availabilityType == AVAILABILITY_MULTIPLE_SEATS && unitLineItem?.seats ? (
          <div className={css.itemSeats}>
            <FormattedMessage id="InboxPage.seats" values={{ seats: unitLineItem.seats }} />
          </div>
        ) : null}
        <div className={css.itemState}>
          <div className={stateClasses}>
            <FormattedMessage
              id={`InboxPage.${processName}.${processState}.status`}
              values={{ transactionRole }}
            />
          </div>
        </div>
      </NamedLink>
    </div>
  );
};

// ================ InboxPage Component ================ //

/**
 * The InboxPage component — split-pane messaging redesign.
 *
 * Desktop (>=1024px): Left pane (conversation list) + Right pane (EmbeddedConversation)
 * Mobile (<1024px): Full-width conversation list, clicking navigates to TransactionPage
 */
export const InboxPageComponent = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();
  const intl = useIntl();
  const location = useLocation();
  const dispatch = useDispatch();
  const isDesktop = useIsDesktop();

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
    // Messaging redesign state from duck
    selectedTxId = null,
    filter = 'all',
    searchQuery = '',
    // Reviews tab state
    reviews = [],
    reviewsInProgress = false,
    reviewsError = null,
  } = props;

  // ---- View toggle: Messages vs Reviews (students only) ---- //
  const [inboxView, setInboxView] = useState('messages'); // 'messages' | 'reviews'

  const { tab } = params;
  const validTab = tab === 'orders' || tab === 'sales';
  if (!validTab) {
    return <NotFoundPage staticContext={props.staticContext} />;
  }

  const { customer: isCustomerUserType, provider: isProviderUserType } = getCurrentUserTypeRoles(
    config,
    currentUser
  );

  // ---- User type detection ---- //
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isStudent = userType === 'student';
  const isCorporatePartner = userType === 'corporate-partner';
  const isEducationalAdmin = userType === 'educational-admin';
  const hideInboxTabs = isStudent || isCorporatePartner || isEducationalAdmin;
  const getDashboardLink = () => {
    const dashMap = {
      'system-admin': { name: 'AdminDashboardPage', labelId: 'InboxPage.backToAdminDashboard' },
      'educational-admin': { name: 'EducationDashboardPage', labelId: 'InboxPage.backToEducationDashboard' },
      student: { name: 'StudentDashboardPage', labelId: 'InboxPage.backToStudentDashboard' },
      'corporate-partner': { name: 'CorporateDashboardPage', labelId: 'InboxPage.backToCorporateDashboard' },
    };
    const entry = dashMap[userType];
    if (!entry) return null;
    return { name: entry.name, label: intl.formatMessage({ id: entry.labelId }) };
  };
  const dashboardLink = getDashboardLink();

  const isOrders = tab === 'orders';
  const transactionRole = isOrders ? TX_TRANSITION_ACTOR_CUSTOMER : TX_TRANSITION_ACTOR_PROVIDER;
  const title = isStudent
    ? intl.formatMessage({ id: 'InboxPage.title' })
    : isOrders
    ? intl.formatMessage({ id: 'InboxPage.ordersTitle' })
    : intl.formatMessage({ id: 'InboxPage.salesTitle' });
  const search = parse(location.search);

  // ---- Clear selection on tab change ---- //
  useEffect(() => {
    dispatch(clearInboxSelection());
  }, [tab, dispatch]);

  // ---- Fetch reviews when switching to reviews view ---- //
  useEffect(() => {
    if (inboxView === 'reviews' && currentUser?.id?.uuid) {
      dispatch(fetchReviewsThunk({ userId: currentUser.id.uuid }));
    }
  }, [inboxView, currentUser?.id?.uuid, dispatch]);

  // ---- Transaction list with stateData ---- //
  const pickType = lt => conf => conf.listingType === lt;
  const findListingTypeConfig = publicData => {
    const listingTypeConfigs = config.listing?.listingTypes;
    const { listingType } = publicData || {};
    return listingTypeConfigs?.find(pickType(listingType));
  };

  // Compute stateData for each transaction
  const txWithStateData = useMemo(() => {
    return transactions.map(tx => {
      let stateData = null;
      try {
        stateData = getStateData({ transaction: tx, transactionRole, intl });
      } catch (error) {
        // Skip — stateData not available for this tx
      }
      return { tx, stateData };
    }).filter(item => item.stateData !== null);
  }, [transactions, transactionRole, intl]);

  // ---- Client-side filtering ---- //
  const filteredTxList = useMemo(() => {
    let list = txWithStateData;

    // Filter out transactions whose listing has been closed/deleted
    list = list.filter(({ tx }) => {
      const listingState = tx.listing?.attributes?.state;
      return listingState !== 'closed';
    });

    // "Unread" filter
    if (filter === 'unread') {
      list = list.filter(({ stateData }) =>
        stateData.isSaleNotification || stateData.isOrderNotification
      );
    }

    // Search filter (user name or listing title)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(({ tx }) => {
        const isCustomer = transactionRole === TX_TRANSITION_ACTOR_CUSTOMER;
        const otherUser = isCustomer ? tx.provider : tx.customer;
        const displayName = (otherUser?.attributes?.profile?.displayName || '').toLowerCase();
        const listingTitle = (tx.listing?.attributes?.title || '').toLowerCase();
        return displayName.includes(query) || listingTitle.includes(query);
      });
    }

    return list;
  }, [txWithStateData, filter, searchQuery, transactionRole]);

  // ---- Sort handling ---- //
  const handleSort = useCallback(
    sortValue => {
      handleSortSelect(tab, routeConfiguration, history)(sortValue);
    },
    [tab, routeConfiguration, history]
  );

  // ---- Conversation selection ---- //
  const handleSelectConversation = useCallback(
    tx => {
      dispatch(setSelectedConversation(tx.id.uuid));
    },
    [dispatch]
  );

  const handleClearSelection = useCallback(() => {
    dispatch(clearInboxSelection());
  }, [dispatch]);

  // ---- Filter / Search handlers ---- //
  const handleFilterChange = useCallback(
    value => {
      dispatch(setFilter(value));
    },
    [dispatch]
  );

  const handleSearchChange = useCallback(
    value => {
      dispatch(setSearchQuery(value));
    },
    [dispatch]
  );

  // ---- New Message dropdown (students only) ---- //
  const [showNewMessageDropdown, setShowNewMessageDropdown] = useState(false);

  // Street2Ivy: Build unique partner list from messageable transactions.
  // Available to ALL authenticated user types (not just students).
  // For customers: the partner is the provider (company/alumni).
  // For providers: the partner is the customer (student).
  const messageablePartners = useMemo(() => {
    const isCustomerRole = transactionRole === TX_TRANSITION_ACTOR_CUSTOMER;
    const partnerMap = new Map();
    txWithStateData.forEach(({ tx, stateData }) => {
      const { processState } = stateData;
      // Allow messaging for all non-terminal transaction states.
      // This includes 'applied' (so students can ask questions while pending)
      // as well as all active and post-completion states.
      const isMessageable = [
        'applied', 'accepted', 'handed-off', 'completed', 'reviewed',
        'reviewed-by-customer', 'reviewed-by-provider',
      ].includes(processState);
      if (!isMessageable) return;

      const partner = isCustomerRole ? tx.provider : tx.customer;
      if (!partner || partnerMap.has(partner.id.uuid)) return;
      partnerMap.set(partner.id.uuid, {
        user: partner,
        txId: tx.id.uuid,
        listingTitle: tx.listing?.attributes?.title,
      });
    });
    return Array.from(partnerMap.values());
  }, [txWithStateData, transactionRole]);

  const handleNewMessageSelect = useCallback(
    txId => {
      setShowNewMessageDropdown(false);
      setInboxView('messages');
      dispatch(setSelectedConversation(txId));
    },
    [dispatch]
  );

  // ---- Derived states ---- //
  const hasNoResults = !fetchInProgress && filteredTxList.length === 0 && !fetchOrdersOrSalesError;
  const hasTransactions = !fetchInProgress && filteredTxList.length > 0;
  const emptyVariant = fetchInProgress
    ? null
    : transactions.length === 0
    ? 'noConversations'
    : filteredTxList.length === 0
    ? 'noResults'
    : null;

  // ---- Tab config ---- //
  const ordersTabMaybe = isCustomerUserType
    ? [
        {
          text: (
            <span>
              <FormattedMessage id="InboxPage.ordersTabTitle" />
              {customerNotificationCount > 0 ? (
                <NotificationBadge count={customerNotificationCount} />
              ) : null}
            </span>
          ),
          selected: isOrders,
          linkProps: { name: 'InboxPage', params: { tab: 'orders' } },
        },
      ]
    : [];

  const salesTabMaybe = isProviderUserType
    ? [
        {
          text: (
            <span>
              <FormattedMessage id="InboxPage.salesTabTitle" />
              {providerNotificationCount > 0 ? (
                <NotificationBadge count={providerNotificationCount} />
              ) : null}
            </span>
          ),
          selected: !isOrders,
          linkProps: { name: 'InboxPage', params: { tab: 'sales' } },
        },
      ]
    : [];

  // Students, corporate partners, and education admins see a unified inbox — no tab distinction
  const tabs = hideInboxTabs ? [] : [...ordersTabMaybe, ...salesTabMaybe];

  // ================ Render ================ //

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <TopbarContainer
        mobileRootClassName={css.mobileTopbar}
        desktopClassName={css.desktopTopbar}
      />

      <div className={css.splitPaneContainer}>
        {/* ---- LEFT PANE: Conversation List ---- */}
        <div className={css.leftPane}>
          {/* Header */}
          <div className={css.leftPaneHeader}>
            {dashboardLink ? (
              <NamedLink name={dashboardLink.name} className={css.dashboardLink}>
                &larr; {dashboardLink.label}
              </NamedLink>
            ) : null}
            <div className={css.titleRow}>
              <H2 as="h1" className={css.title}>
                <FormattedMessage id="InboxPage.title" />
              </H2>
              {messageablePartners.length > 0 ? (
                <div className={css.newMessageContainer}>
                  <button
                    className={css.newMessageBtn}
                    onClick={() => setShowNewMessageDropdown(!showNewMessageDropdown)}
                  >
                    <FormattedMessage id="InboxPage.newMessage" />
                  </button>
                  {showNewMessageDropdown ? (
                    <div className={css.newMessageDropdown}>
                      <p className={css.newMessageDropdownTitle}>
                        <FormattedMessage id="InboxPage.newMessageSelectRecipient" />
                      </p>
                      {messageablePartners.map(({ user, txId, listingTitle }) => (
                        <button
                          key={txId}
                          className={css.newMessageDropdownItem}
                          onClick={() => handleNewMessageSelect(txId)}
                        >
                          <Avatar user={user} className={css.newMessageAvatar} disableProfileLink />
                          <div className={css.newMessageDropdownInfo}>
                            <span className={css.newMessageDropdownName}>
                              <UserDisplayName user={user} intl={intl} />
                            </span>
                            {listingTitle ? (
                              <span className={css.newMessageDropdownProject}>
                                {listingTitle}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Student view toggle: Messages | Reviews */}
          {isStudent ? (
            <div className={css.viewToggle}>
              <button
                className={classNames(css.viewToggleBtn, {
                  [css.viewToggleBtnActive]: inboxView === 'messages',
                })}
                onClick={() => setInboxView('messages')}
              >
                <FormattedMessage id="InboxPage.viewMessages" />
              </button>
              <button
                className={classNames(css.viewToggleBtn, {
                  [css.viewToggleBtnActive]: inboxView === 'reviews',
                })}
                onClick={() => setInboxView('reviews')}
              >
                <FormattedMessage id="InboxPage.viewReviews" />
              </button>
            </div>
          ) : null}

          {/* Tabs — hidden for students (unified inbox) */}
          {tabs.length > 0 ? (
            <div className={css.tabsRow}>
              <TabNav
                rootClassName={css.tabs}
                tabRootClassName={css.tab}
                tabs={tabs}
                ariaLabel={intl.formatMessage({ id: 'InboxPage.screenreader.sidenav' })}
              />
            </div>
          ) : null}

          {/* ---- MESSAGES VIEW ---- */}
          {inboxView === 'messages' ? (
            <>
              {/* Filter bar */}
              <InboxFilterBar
                filter={filter}
                onFilterChange={handleFilterChange}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                sortValue={search.sort || 'createdAt'}
                onSortChange={handleSort}
              />

              {/* Error */}
              {fetchOrdersOrSalesError ? (
                <p className={css.error}>
                  <FormattedMessage id="InboxPage.fetchFailed" />
                </p>
              ) : null}

              {/* Conversation list */}
              <ul className={css.conversationList}>
                {fetchInProgress ? (
                  <li className={css.listItemsLoading}>
                    <IconSpinner />
                  </li>
                ) : hasTransactions ? (
                  filteredTxList.map(({ tx, stateData }) => (
                    <li key={tx.id.uuid} className={css.listItem}>
                      <ConversationListItem
                        transactionRole={transactionRole}
                        tx={tx}
                        intl={intl}
                        stateData={stateData}
                        isActive={selectedTxId === tx.id.uuid}
                        onClick={handleSelectConversation}
                        isDesktop={isDesktop}
                      />
                    </li>
                  ))
                ) : null}
              </ul>

              {/* Empty state */}
              {!fetchInProgress && emptyVariant ? (
                <InboxEmptyState variant={emptyVariant} />
              ) : null}

              {/* Pagination */}
              {hasTransactions && pagination && pagination.totalPages > 1 ? (
                <PaginationLinks
                  className={css.pagination}
                  pageName="InboxPage"
                  pagePathParams={params}
                  pageSearchParams={search}
                  pagination={pagination}
                />
              ) : null}
            </>
          ) : (
            /* ---- REVIEWS VIEW (students only) ---- */
            <div className={css.reviewsPane}>
              {reviewsInProgress ? (
                <div className={css.listItemsLoading}>
                  <IconSpinner />
                </div>
              ) : reviewsError ? (
                <p className={css.error}>
                  <FormattedMessage id="InboxPage.reviewsLoadFailed" />
                </p>
              ) : reviews.length > 0 ? (
                <>
                  <ReputationDashboard reviews={reviews} />
                  <Reviews reviews={reviews} />
                </>
              ) : (
                <div className={css.reviewsEmpty}>
                  <p className={css.reviewsEmptyText}>
                    <FormattedMessage id="InboxPage.noReviewsYet" />
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---- RIGHT PANE: Conversation Detail (desktop only) ---- */}
        <div className={css.rightPane}>
          {inboxView === 'reviews' ? (
            <div className={css.reviewsRightPane}>
              <p className={css.reviewsRightPaneText}>
                <FormattedMessage id="InboxPage.reviewsRightPaneInfo" />
              </p>
            </div>
          ) : selectedTxId ? (
            <EmbeddedConversation
              txId={selectedTxId}
              transactionRole={transactionRole}
              currentUser={currentUser}
              onBack={handleClearSelection}
            />
          ) : (
            <InboxEmptyState variant="noSelection" />
          )}
        </div>
      </div>
    </Page>
  );
};

// ================ Redux ================ //

const mapStateToProps = state => {
  const {
    fetchInProgress,
    fetchOrdersOrSalesError,
    pagination,
    transactionRefs,
    // Messaging redesign state
    selectedTxId,
    filter,
    searchQuery,
    // Reviews tab state
    reviews,
    reviewsInProgress,
    reviewsError,
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
    selectedTxId,
    filter,
    searchQuery,
    reviews,
    reviewsInProgress,
    reviewsError,
  };
};

const InboxPage = compose(connect(mapStateToProps))(InboxPageComponent);

export default InboxPage;
