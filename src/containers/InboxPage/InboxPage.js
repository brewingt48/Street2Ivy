import React from 'react';
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
import css from './InboxPage.module.css';

const INBOX_PAGE_SIZE = 10;

// Format a timestamp into a human-readable relative time (e.g. "2h ago", "3d ago")
const formatRelativeTime = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
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
 * The InboxItem component.
 *
 * @component
 * @param {Object} props
 * @param {TX_TRANSITION_ACTOR_CUSTOMER | TX_TRANSITION_ACTOR_PROVIDER} props.transactionRole - The transaction role
 * @param {propTypes.transaction} props.tx - The transaction
 * @param {intlShape} props.intl - The intl object
 * @param {stateDataShape} props.stateData - The state data
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

  const lineItems = tx.attributes?.lineItems || [];
  const hasPricingData = lineItems.length > 0;
  const unitLineItem = getUnitLineItem(lineItems);
  const quantity = hasPricingData && isPurchase ? unitLineItem?.quantity?.toString() : null;
  const showStock = stockType === STOCK_MULTIPLE_ITEMS || (quantity && unitLineItem?.quantity > 1);
  const otherUser = isCustomer ? provider : customer;
  const otherUserDisplayName = otherUser ? <UserDisplayName user={otherUser} intl={intl} /> : null;
  const isOtherUserBanned = otherUser?.attributes?.banned;

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

  // Format relative time for the transaction
  const lastTransitionedAt = tx.attributes?.lastTransitionedAt;
  const timeAgo = lastTransitionedAt ? formatRelativeTime(lastTransitionedAt) : '';

  return (
    <NamedLink
      className={css.itemCard}
      name={isCustomer ? 'OrderDetailsPage' : 'SaleDetailsPage'}
      params={{ id: tx.id.uuid }}
    >
      {/* Notification indicator bar */}
      {(isSaleNotification || isOrderNotification) && <div className={css.itemNotificationBar} />}

      <div className={css.itemCardContent}>
        {/* Left: Avatar */}
        <div className={css.itemAvatarWrapper}>
          <Avatar user={otherUser} className={css.itemAvatarImg} />
          {actionNeeded && <div className={css.itemAvatarBadge} />}
        </div>

        {/* Center: Info */}
        <div className={css.itemInfo}>
          <div className={css.itemInfoTop}>
            <span className={css.itemUserName}>{otherUserDisplayName}</span>
            <span className={css.itemTimestamp}>{timeAgo}</span>
          </div>
          <div className={css.itemProjectTitle}>{listing?.attributes?.title}</div>
          <div className={css.itemMeta}>
            {isBooking ? (
              <BookingTimeInfoMaybe transaction={tx} />
            ) : isPurchase && hasPricingData && showStock ? (
              <FormattedMessage id="InboxPage.quantity" values={{ quantity }} />
            ) : null}
            {availabilityType == AVAILABILITY_MULTIPLE_SEATS && unitLineItem?.seats ? (
              <span>
                <FormattedMessage id="InboxPage.seats" values={{ seats: unitLineItem.seats }} />
              </span>
            ) : null}
          </div>
        </div>

        {/* Right: Status badge */}
        <div className={css.itemStatusArea}>
          <div className={stateClasses}>
            <FormattedMessage
              id={`InboxPage.${processName}.${processState}.status`}
              values={{ transactionRole }}
            />
          </div>
          <span className={css.itemArrow}>→</span>
        </div>
      </div>
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
  } = props;
  const { tab } = params;
  const validTab = tab === 'orders' || tab === 'sales';
  if (!validTab) {
    return <NotFoundPage staticContext={props.staticContext} />;
  }

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

  const isOrders = tab === 'orders';
  const hasNoResults = !fetchInProgress && transactions.length === 0 && !fetchOrdersOrSalesError;
  const ordersTitle = intl.formatMessage({ id: 'InboxPage.ordersTitle' });
  const salesTitle = intl.formatMessage({ id: 'InboxPage.salesTitle' });
  const title = isOrders ? ordersTitle : salesTitle;
  const search = parse(location.search);

  const pickType = lt => conf => conf.listingType === lt;
  const findListingTypeConfig = publicData => {
    const listingTypeConfigs = config.listing?.listingTypes;
    const { listingType } = publicData || {};
    const foundConfig = listingTypeConfigs?.find(pickType(listingType));
    return foundConfig;
  };
  const toTxItem = tx => {
    const transactionRole = isOrders ? TX_TRANSITION_ACTOR_CUSTOMER : TX_TRANSITION_ACTOR_PROVIDER;
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
        />
      </li>
    ) : null;
  };

  const hasOrderOrSaleTransactions = (tx, isOrdersTab, user) => {
    return isOrdersTab
      ? user?.id && tx && tx.length > 0 && tx[0].customer.id.uuid === user?.id?.uuid
      : user?.id && tx && tx.length > 0 && tx[0].provider.id.uuid === user?.id?.uuid;
  };
  const hasTransactions =
    !fetchInProgress && hasOrderOrSaleTransactions(transactions, isOrders, currentUser);

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
          linkProps: {
            name: 'InboxPage',
            params: { tab: 'orders' },
          },
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
          linkProps: {
            name: 'InboxPage',
            params: { tab: 'sales' },
          },
        },
      ]
    : [];

  const tabs = [...ordersTabMaybe, ...salesTabMaybe];

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
        {/* Modern Inbox Header */}
        <div className={css.inboxHeader}>
          <div className={css.inboxHeaderInfo}>
            <h2 className={css.inboxHeaderTitle}>
              {isOrders
                ? intl.formatMessage({ id: 'InboxPage.ordersHeading' })
                : intl.formatMessage({ id: 'InboxPage.salesHeading' })}
            </h2>
            <p className={css.inboxHeaderSubtitle}>
              {isOrders
                ? intl.formatMessage({ id: 'InboxPage.ordersSubtitle' })
                : intl.formatMessage({ id: 'InboxPage.salesSubtitle' })}
            </p>
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

        {/* Transaction count */}
        {!fetchInProgress && transactions.length > 0 && (
          <div className={css.inboxCount}>
            {transactions.length} {transactions.length === 1 ? 'conversation' : 'conversations'}
            {pagination?.totalItems > INBOX_PAGE_SIZE && (
              <span className={css.inboxCountTotal}> of {pagination.totalItems}</span>
            )}
          </div>
        )}

        {fetchOrdersOrSalesError ? (
          <div className={css.errorCard}>
            <span className={css.errorIcon}>⚠</span>
            <FormattedMessage id="InboxPage.fetchFailed" />
          </div>
        ) : null}

        <div className={css.itemList}>
          {!fetchInProgress ? (
            transactions.map(toTxItem)
          ) : (
            <div className={css.loadingContainer}>
              <IconSpinner />
              <span className={css.loadingText}>Loading your inbox...</span>
            </div>
          )}
          {hasNoResults ? (
            <div className={css.emptyState}>
              <div className={css.emptyStateIcon}>📬</div>
              <h3 className={css.emptyStateTitle}>
                <FormattedMessage
                  id={isOrders ? 'InboxPage.noOrdersTitle' : 'InboxPage.noSalesTitle'}
                />
              </h3>
              <p className={css.emptyStateText}>
                <FormattedMessage
                  id={isOrders ? 'InboxPage.noOrdersFound' : 'InboxPage.noSalesFound'}
                />
              </p>
            </div>
          ) : null}
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
  const { fetchInProgress, fetchOrdersOrSalesError, pagination, transactionRefs } = state.InboxPage;
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
  };
};

const InboxPage = compose(connect(mapStateToProps))(InboxPageComponent);

export default InboxPage;
