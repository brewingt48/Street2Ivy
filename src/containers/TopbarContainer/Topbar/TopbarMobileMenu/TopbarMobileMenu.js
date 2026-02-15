/**
 *  TopbarMobileMenu prints the menu content for authenticated user or
 * shows login actions for those who are not authenticated.
 */
import React from 'react';
import classNames from 'classnames';

import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import { FormattedMessage } from '../../../../util/reactIntl';
import { ensureCurrentUser } from '../../../../util/data';

import {
  AvatarLarge,
  ExternalLink,
  InlineTextButton,
  NamedLink,
  NotificationBadge,
} from '../../../../components';

import css from './TopbarMobileMenu.module.css';

const CustomLinkComponent = ({ linkConfig, currentPage }) => {
  const { group, text, type, href, route } = linkConfig;
  const getCurrentPageClass = page => {
    const hasPageName = name => currentPage?.indexOf(name) === 0;
    const isCMSPage = pageId => hasPageName('CMSPage') && currentPage === `${page}:${pageId}`;
    const isInboxPage = tab => hasPageName('InboxPage') && currentPage === `${page}:${tab}`;
    const isCurrentPage = currentPage === page;

    return isCMSPage(route?.params?.pageId) || isInboxPage(route?.params?.tab) || isCurrentPage
      ? css.currentPage
      : null;
  };

  // Note: if the config contains 'route' keyword,
  // then in-app linking config has been resolved already.
  if (type === 'internal' && route) {
    // Internal link
    const { name, params, to } = route || {};
    const className = classNames(css.navigationLink, getCurrentPageClass(name));
    return (
      <li className={className}>
        <NamedLink name={name} params={params} to={to}>
          <span className={css.menuItemBorder} />
          {text}
        </NamedLink>
      </li>
    );
  }
  return (
    <li className={css.navigationLink}>
      <ExternalLink href={href}>
        <span className={css.menuItemBorder} />
        {text}
      </ExternalLink>
    </li>
  );
};

/**
 * Menu for mobile layout (opens through hamburger icon)
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isAuthenticated
 * @param {string?} props.currentPage
 * @param {boolean} props.currentUserHasListings
 * @param {Object?} props.currentUser API entity
 * @param {number} props.notificationCount
 * @param {Array<Object>} props.customLinks Contains object like { group, text, type, href, route }
 * @param {Function} props.onLogout
 * @returns {JSX.Element} search icon
 */
const TopbarMobileMenu = props => {
  const {
    isAuthenticated,
    currentPage,
    inboxTab,
    currentUser,
    notificationCount = 0,
    customLinks,
    onLogout,
    showCreateListingsLink,
    institutionInfo,
  } = props;

  const user = ensureCurrentUser(currentUser);

  const extraLinks = customLinks.map((linkConfig, index) => {
    return (
      <CustomLinkComponent
        key={`${linkConfig.text}_${index}`}
        linkConfig={linkConfig}
        currentPage={currentPage}
      />
    );
  });

  const createListingsLinkMaybe = showCreateListingsLink ? (
    <NamedLink className={css.createNewListingLink} name="NewListingPage">
      <FormattedMessage id="TopbarMobileMenu.newListingLink" />
    </NamedLink>
  ) : null;

  if (!isAuthenticated) {
    const signup = (
      <NamedLink name="SignupPage" className={css.signupLink}>
        <FormattedMessage id="TopbarMobileMenu.signupLink" />
      </NamedLink>
    );

    const login = (
      <NamedLink name="LoginPage" className={css.loginLink}>
        <FormattedMessage id="TopbarMobileMenu.loginLink" />
      </NamedLink>
    );

    const signupOrLogin = (
      <span className={css.authenticationLinks}>
        <FormattedMessage
          id="TopbarMobileMenu.signupOrLogin"
          values={{ lineBreak: <br />, signup, login }}
        />
      </span>
    );
    return (
      <nav className={css.root}>
        <div className={css.content}>
          <div className={css.authenticationGreeting}>
            <FormattedMessage
              id="TopbarMobileMenu.unauthorizedGreeting"
              values={{ lineBreak: <br />, signupOrLogin }}
            />
          </div>

          <div className={css.customLinksWrapper}>{extraLinks}</div>

          <div className={css.spacer} />
        </div>
        <div className={css.footer}>{createListingsLinkMaybe}</div>
      </nav>
    );
  }

  const notificationCountBadge =
    notificationCount > 0 ? (
      <NotificationBadge className={css.notificationBadge} count={notificationCount} />
    ) : null;

  const displayName = user.attributes.profile.firstName;
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    const isInboxPage = currentPage?.indexOf('InboxPage') === 0 && page?.indexOf('InboxPage') === 0;
    return currentPage === page || isAccountSettingsPage || isInboxPage ? css.currentPage : null;
  };

  // ProveGround: Determine user type for conditional navigation
  const userType = user?.attributes?.profile?.publicData?.userType;
  const isCorporatePartner = userType === 'corporate-partner';
  const isStudent = userType === 'student';
  const isSystemAdmin = userType === 'system-admin';
  const isEducationalAdmin = userType === 'educational-admin';
  const isAdmin = isSystemAdmin || isEducationalAdmin;

  // System and educational admins don't have listings, so hide this link for them
  const manageListingsLinkMaybe = showCreateListingsLink && !isAdmin ? (
    <li className={classNames(css.navigationLink, currentPageClass('ManageListingsPage'))}>
      <NamedLink name="ManageListingsPage">
        <FormattedMessage id="TopbarMobileMenu.yourListingsLink" />
      </NamedLink>
    </li>
  ) : null;

  // Removed: Search Students link for corporate partners
  const findStudentsLinkMaybe = null;

  const dashboardLinkMaybe = isCorporatePartner ? (
    <li className={classNames(css.navigationLink, currentPageClass('CorporateDashboardPage'))}>
      <NamedLink name="CorporateDashboardPage">
        <FormattedMessage id="TopbarMobileMenu.dashboardLink" />
      </NamedLink>
    </li>
  ) : null;

  const studentDashboardLinkMaybe = isStudent ? (
    <li className={classNames(css.navigationLink, currentPageClass('StudentDashboardPage'))}>
      <NamedLink name="StudentDashboardPage">
        <FormattedMessage id="TopbarMobileMenu.studentDashboardLink" />
      </NamedLink>
    </li>
  ) : null;

  const findCompaniesLinkMaybe = isStudent ? (
    <li className={classNames(css.navigationLink, currentPageClass('SearchCompaniesPage'))}>
      <NamedLink name="SearchCompaniesPage">
        <FormattedMessage id="TopbarMobileMenu.findCompaniesLink" />
      </NamedLink>
    </li>
  ) : null;

  // AI Coaching link for students (if their institution has it enabled)
  const showAiCoachingLink =
    isStudent && institutionInfo?.aiCoachingEnabled && institutionInfo?.aiCoachingUrl;

  const aiCoachingLinkMaybe = showAiCoachingLink ? (
    <li className={css.navigationLink}>
      <ExternalLink href={institutionInfo.aiCoachingUrl} className={css.aiCoachingLink}>
        <FormattedMessage id="TopbarMobileMenu.aiCoachingLink" />
      </ExternalLink>
    </li>
  ) : null;

  // Admin dashboard links
  const adminDashboardLinkMaybe = isSystemAdmin ? (
    <li className={classNames(css.inbox, currentPageClass('AdminDashboardPage'))}>
      <NamedLink name="AdminDashboardPage">
        <FormattedMessage id="TopbarMobileMenu.adminDashboardLink" />
        {notificationCountBadge}
      </NamedLink>
    </li>
  ) : null;

  const educationDashboardLinkMaybe = isEducationalAdmin ? (
    <li className={classNames(css.inbox, currentPageClass('EducationDashboardPage'))}>
      <NamedLink name="EducationDashboardPage">
        <FormattedMessage id="TopbarMobileMenu.educationDashboardLink" />
        {notificationCountBadge}
      </NamedLink>
    </li>
  ) : null;

  return (
    <div className={css.root}>
      <AvatarLarge className={css.avatar} user={currentUser} />
      <div className={css.content}>
        <span className={css.greeting}>
          <FormattedMessage id="TopbarMobileMenu.greeting" values={{ displayName }} />
        </span>
        <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
          <FormattedMessage id="TopbarMobileMenu.logoutLink" />
        </InlineTextButton>

        <ul className={css.accountLinksWrapper}>
          {/* Show Admin Dashboard link for admins, hide inbox for corporate partners and students (they have it in their dashboards), show inbox for others */}
          {isAdmin ? (
            <>
              {adminDashboardLinkMaybe}
              {educationDashboardLinkMaybe}
            </>
          ) : (isCorporatePartner || isStudent) ? (
            null /* Corporate partners and students have messages built into their dashboards */
          ) : (
            <li className={classNames(css.inbox, currentPageClass(`InboxPage:${inboxTab}`))}>
              <NamedLink name="InboxPage" params={{ tab: inboxTab }}>
                <FormattedMessage id="TopbarMobileMenu.inboxLink" />
                {notificationCountBadge}
              </NamedLink>
            </li>
          )}
          {manageListingsLinkMaybe}
          {findStudentsLinkMaybe}
          {dashboardLinkMaybe}
          {studentDashboardLinkMaybe}
          {findCompaniesLinkMaybe}
          {aiCoachingLinkMaybe}
          <li className={classNames(css.navigationLink, currentPageClass('ProfileSettingsPage'))}>
            <NamedLink name="ProfileSettingsPage">
              <FormattedMessage id="TopbarMobileMenu.profileSettingsLink" />
            </NamedLink>
          </li>
          <li className={classNames(css.navigationLink, currentPageClass('AccountSettingsPage'))}>
            <NamedLink name="AccountSettingsPage">
              <FormattedMessage id="TopbarMobileMenu.accountSettingsLink" />
            </NamedLink>
          </li>
        </ul>
        <ul className={css.customLinksWrapper}>{extraLinks}</ul>
        <div className={css.spacer} />
      </div>
      <div className={css.footer}>{createListingsLinkMaybe}</div>
    </div>
  );
};

export default TopbarMobileMenu;
