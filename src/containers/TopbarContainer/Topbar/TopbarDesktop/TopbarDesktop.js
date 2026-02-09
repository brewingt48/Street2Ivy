import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import {
  Avatar,
  ExternalLink,
  InlineTextButton,
  LinkedLogo,
  Menu,
  MenuLabel,
  MenuContent,
  MenuItem,
  NamedLink,
  NotificationBadge,
} from '../../../../components';

import TopbarSearchForm from '../TopbarSearchForm/TopbarSearchForm';
import CustomLinksMenu from './CustomLinksMenu/CustomLinksMenu';

import css from './TopbarDesktop.module.css';

// Street2Ivy: Global "Back to Dashboard" link for all authenticated users
// Maps each user type to its appropriate dashboard page name
const DASHBOARD_BY_USER_TYPE = {
  student: 'LandingPage',
  'corporate-partner': 'LandingPage',
  alumni: 'LandingPage',
  'educational-admin': 'LandingPage',
  'system-admin': 'LandingPage',
};

const DashboardLink = ({ currentUser, currentPage }) => {
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const dashboardPage = DASHBOARD_BY_USER_TYPE[userType] || 'LandingPage';

  // Don't show on the dashboard itself
  if (currentPage === 'LandingPage') {
    return null;
  }

  return (
    <NamedLink className={css.dashboardLink} name={dashboardPage}>
      <span className={css.dashboardLinkArrow}>&larr;</span>
      <span className={css.dashboardLinkLabel}>
        <FormattedMessage id="TopbarDesktop.backToDashboard" />
      </span>
    </NamedLink>
  );
};

const SignupLink = () => {
  return (
    <NamedLink id="signup-link" name="SignupPage" className={css.topbarLink}>
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.signup" />
      </span>
    </NamedLink>
  );
};

const LoginLink = () => {
  return (
    <NamedLink id="login-link" name="LoginPage" className={css.topbarLink}>
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.login" />
      </span>
    </NamedLink>
  );
};

const InboxLink = ({ notificationCount, inboxTab }) => {
  const notificationBadge =
    notificationCount > 0 ? <NotificationBadge count={notificationCount} /> : null;
  return (
    <NamedLink
      id="inbox-link"
      className={css.topbarLink}
      name="InboxPage"
      params={{ tab: inboxTab }}
    >
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.inbox" />
        {notificationBadge}
      </span>
    </NamedLink>
  );
};

const ProfileMenu = ({
  currentPage,
  currentUser,
  onLogout,
  showManageListingsLink,
  intl,
  institutionInfo,
}) => {
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    return currentPage === page || isAccountSettingsPage ? css.currentPage : null;
  };

  // Street2Ivy: Determine user type for conditional navigation
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isCorporatePartner = userType === 'corporate-partner';
  const isStudent = userType === 'student';
  const isSystemAdmin = userType === 'system-admin';
  const isEducationalAdmin = userType === 'educational-admin';
  const isAdmin = isSystemAdmin || isEducationalAdmin;

  // AI Coaching link for students (if their institution has it enabled)
  const showAiCoachingLink =
    isStudent && institutionInfo?.aiCoachingEnabled && institutionInfo?.aiCoachingUrl;

  return (
    <Menu skipFocusOnNavigation={true}>
      <MenuLabel
        id="profile-menu-label"
        className={css.profileMenuLabel}
        isOpenClassName={css.profileMenuIsOpen}
        ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.profileMenu' })}
      >
        <Avatar className={css.avatar} user={currentUser} disableProfileLink />
      </MenuLabel>
      <MenuContent className={css.profileMenuContent}>
        {/* Street2Ivy: Single "Home" entry point — personalized dashboard for all roles */}
        <MenuItem key="HomePage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('LandingPage'))}
            name="LandingPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.homeLink" />
          </NamedLink>
        </MenuItem>
        {showManageListingsLink && !isAdmin ? (
          <MenuItem key="ManageListingsPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('ManageListingsPage'))}
              name="ManageListingsPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.yourListingsLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        {isStudent ? (
          <MenuItem key="SearchCompaniesPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('SearchCompaniesPage'))}
              name="SearchCompaniesPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.findCompaniesLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        {showAiCoachingLink ? (
          <MenuItem key="AiCoaching">
            <ExternalLink
              className={classNames(css.menuLink, css.aiCoachingLink)}
              href={institutionInfo.aiCoachingUrl}
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.aiCoachingLink" />
            </ExternalLink>
          </MenuItem>
        ) : null}
        <MenuItem key="ProfileSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('ProfileSettingsPage'))}
            name="ProfileSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.profileSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="AccountSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('AccountSettingsPage'))}
            name="AccountSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.accountSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="logout">
          <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.logout" />
          </InlineTextButton>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

/**
 * Topbar for desktop layout
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {CurrentUser} props.currentUser API entity
 * @param {string?} props.currentPage
 * @param {boolean} props.isAuthenticated
 * @param {number} props.notificationCount
 * @param {Function} props.onLogout
 * @param {Function} props.onSearchSubmit
 * @param {Object?} props.initialSearchFormValues
 * @param {Object} props.intl
 * @param {Object} props.config
 * @param {boolean} props.showSearchForm
 * @param {boolean} props.showCreateListingsLink
 * @param {string} props.inboxTab
 * @returns {JSX.Element} search icon
 */
const TopbarDesktop = props => {
  const {
    className,
    config,
    customLinks,
    currentUser,
    currentPage,
    rootClassName,
    notificationCount = 0,
    intl,
    isAuthenticated,
    onLogout,
    onSearchSubmit,
    initialSearchFormValues = {},
    showSearchForm,
    showCreateListingsLink,
    inboxTab,
    institutionInfo,
  } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const marketplaceName = config.marketplaceName;
  const authenticatedOnClientSide = mounted && isAuthenticated;
  const isAuthenticatedOrJustHydrated = isAuthenticated || !mounted;

  // Street2Ivy: Check if user is admin or corporate partner or student
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isSystemAdmin = userType === 'system-admin';
  const isEducationalAdmin = userType === 'educational-admin';
  const isCorporatePartner = userType === 'corporate-partner';
  const isStudent = userType === 'student';
  const isAdmin = isSystemAdmin || isEducationalAdmin;

  const giveSpaceForSearch = customLinks == null || customLinks?.length === 0;
  const classes = classNames(rootClassName || css.root, className);

  // Street2Ivy: Show inbox link for ALL authenticated users.
  // The split-pane messaging system is available to all user types.
  const inboxLinkMaybe = authenticatedOnClientSide ? (
    <InboxLink notificationCount={notificationCount} inboxTab={inboxTab} />
  ) : null;

  const profileMenuMaybe = authenticatedOnClientSide ? (
    <ProfileMenu
      currentPage={currentPage}
      currentUser={currentUser}
      onLogout={onLogout}
      showManageListingsLink={showCreateListingsLink}
      intl={intl}
      institutionInfo={institutionInfo}
    />
  ) : null;

  const dashboardLinkMaybe = authenticatedOnClientSide ? (
    <DashboardLink currentUser={currentUser} currentPage={currentPage} />
  ) : null;

  const signupLinkMaybe = isAuthenticatedOrJustHydrated ? null : <SignupLink />;
  const loginLinkMaybe = isAuthenticatedOrJustHydrated ? null : <LoginLink />;

  const searchFormMaybe = showSearchForm ? (
    <TopbarSearchForm
      className={classNames(css.searchLink, { [css.takeAvailableSpace]: giveSpaceForSearch })}
      desktopInputRoot={css.topbarSearchWithLeftPadding}
      onSubmit={onSearchSubmit}
      initialValues={initialSearchFormValues}
      appConfig={config}
    />
  ) : (
    <div
      className={classNames(css.spacer, css.topbarSearchWithLeftPadding, {
        [css.takeAvailableSpace]: giveSpaceForSearch,
      })}
    />
  );

  return (
    <nav
      className={classes}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.topbarNavigation' })}
    >
      <LinkedLogo
        id="logo-topbar-desktop"
        className={css.logoLink}
        layout="desktop"
        alt={intl.formatMessage({ id: 'TopbarDesktop.logo' }, { marketplaceName })}
        linkToExternalSite={config?.topbar?.logoLink}
      />
      {dashboardLinkMaybe}
      {searchFormMaybe}

      <CustomLinksMenu
        currentPage={currentPage}
        customLinks={customLinks}
        intl={intl}
        hasClientSideContentReady={authenticatedOnClientSide || !isAuthenticatedOrJustHydrated}
        showCreateListingsLink={showCreateListingsLink}
      />

      {inboxLinkMaybe}

      {profileMenuMaybe}
      {signupLinkMaybe}
      {loginLinkMaybe}
    </nav>
  );
};

export default TopbarDesktop;
