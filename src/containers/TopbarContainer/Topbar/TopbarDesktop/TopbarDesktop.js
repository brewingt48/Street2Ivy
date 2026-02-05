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
} from '../../../../components';

import TopbarSearchForm from '../TopbarSearchForm/TopbarSearchForm';
import CustomLinksMenu from './CustomLinksMenu/CustomLinksMenu';

import css from './TopbarDesktop.module.css';

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
  const notificationDot = notificationCount > 0 ? <div className={css.notificationDot} /> : null;
  return (
    <NamedLink
      id="inbox-link"
      className={css.topbarLink}
      name="InboxPage"
      params={{ tab: inboxTab }}
    >
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.inbox" />
        {notificationDot}
      </span>
    </NamedLink>
  );
};

// Admin Dashboard link for system admins
const AdminDashboardLink = ({ notificationCount }) => {
  const notificationDot = notificationCount > 0 ? <div className={css.notificationDot} /> : null;
  return (
    <NamedLink
      id="admin-dashboard-link"
      className={css.topbarLink}
      name="AdminDashboardPage"
    >
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.adminDashboard" />
        {notificationDot}
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
        {isSystemAdmin ? (
          <MenuItem key="AdminDashboardPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('AdminDashboardPage'))}
              name="AdminDashboardPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.adminDashboardLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        {isEducationalAdmin ? (
          <MenuItem key="EducationDashboardPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('EducationDashboardPage'))}
              name="EducationDashboardPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.educationDashboardLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        {showManageListingsLink ? (
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
        {isCorporatePartner ? (
          <MenuItem key="SearchStudentsPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('SearchStudentsPage'))}
              name="SearchStudentsPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.findStudentsLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        {isCorporatePartner ? (
          <MenuItem key="CorporateDashboardPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('CorporateDashboardPage'))}
              name="CorporateDashboardPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.dashboardLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        {isStudent ? (
          <MenuItem key="StudentDashboardPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('StudentDashboardPage'))}
              name="StudentDashboardPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.studentDashboardLink" />
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

  // Street2Ivy: Check if user is admin
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isSystemAdmin = userType === 'system-admin';
  const isEducationalAdmin = userType === 'educational-admin';
  const isAdmin = isSystemAdmin || isEducationalAdmin;

  const giveSpaceForSearch = customLinks == null || customLinks?.length === 0;
  const classes = classNames(rootClassName || css.root, className);

  // For admin users, show Admin Dashboard link instead of Inbox
  const inboxLinkMaybe = authenticatedOnClientSide ? (
    isAdmin ? (
      <AdminDashboardLink notificationCount={notificationCount} />
    ) : (
      <InboxLink notificationCount={notificationCount} inboxTab={inboxTab} />
    )
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
