import React from 'react';
import loadable from '@loadable/component';

import getPageDataLoadingAPI from '../containers/pageDataLoadingAPI';
import NotFoundPage from '../containers/NotFoundPage/NotFoundPage';
import PreviewResolverPage from '../containers/PreviewResolverPage/PreviewResolverPage';

// routeConfiguration needs to initialize containers first
// Otherwise, components will import form container eventually and
// at that point css bundling / imports will happen in wrong order.
import { NamedRedirect } from '../components';
import { connect } from 'react-redux';

// Unified inbox redirect: all users land on the "All Messages" view
const InboxRedirectComponent = ({ currentUser }) => {
  const tab = 'all';
  return <NamedRedirect name="InboxPage" params={{ tab }} />;
};
const InboxRedirect = connect(state => ({
  currentUser: state.user?.currentUser,
}))(InboxRedirectComponent);

const pageDataLoadingAPI = getPageDataLoadingAPI();

const AuthenticationPage = loadable(() => import(/* webpackChunkName: "AuthenticationPage" */ '../containers/AuthenticationPage/AuthenticationPage'));
const CheckoutPage = loadable(() => import(/* webpackChunkName: "CheckoutPage" */ '../containers/CheckoutPage/CheckoutPage'));
const CMSPage = loadable(() => import(/* webpackChunkName: "CMSPage" */ '../containers/CMSPage/CMSPage'));
const ContactDetailsPage = loadable(() => import(/* webpackChunkName: "ContactDetailsPage" */ '../containers/ContactDetailsPage/ContactDetailsPage'));
const EditListingPage = loadable(() => import(/* webpackChunkName: "EditListingPage" */ '../containers/EditListingPage/EditListingPage'));
const EmailVerificationPage = loadable(() => import(/* webpackChunkName: "EmailVerificationPage" */ '../containers/EmailVerificationPage/EmailVerificationPage'));
const InboxPage = loadable(() => import(/* webpackChunkName: "InboxPage" */ '../containers/InboxPage/InboxPage'));
const MakeOfferPage = loadable(() => import(/* webpackChunkName: "MakeOfferPage" */ '../containers/MakeOfferPage/MakeOfferPage'));
const LandingPage = loadable(() => import(/* webpackChunkName: "LandingPage" */ '../containers/LandingPage/LandingPage'));
const ListingPageCoverPhoto = loadable(() => import(/* webpackChunkName: "ListingPageCoverPhoto" */ /* webpackPrefetch: true */ '../containers/ListingPage/ListingPageCoverPhoto'));
const ListingPageCarousel = loadable(() => import(/* webpackChunkName: "ListingPageCarousel" */ /* webpackPrefetch: true */ '../containers/ListingPage/ListingPageCarousel'));
const ManageListingsPage = loadable(() => import(/* webpackChunkName: "ManageListingsPage" */ '../containers/ManageListingsPage/ManageListingsPage'));
const CorporateDashboardPage = loadable(() => import(/* webpackChunkName: "CorporateDashboardPage" */ '../containers/CorporateDashboardPage/CorporateDashboardPage'));
const ManageAccountPage = loadable(() => import(/* webpackChunkName: "ManageAccountPage" */ '../containers/ManageAccountPage/ManageAccountPage'));
const PasswordChangePage = loadable(() => import(/* webpackChunkName: "PasswordChangePage" */ '../containers/PasswordChangePage/PasswordChangePage'));
const PasswordRecoveryPage = loadable(() => import(/* webpackChunkName: "PasswordRecoveryPage" */ '../containers/PasswordRecoveryPage/PasswordRecoveryPage'));
const PasswordResetPage = loadable(() => import(/* webpackChunkName: "PasswordResetPage" */ '../containers/PasswordResetPage/PasswordResetPage'));
const PaymentMethodsPage = loadable(() => import(/* webpackChunkName: "PaymentMethodsPage" */ '../containers/PaymentMethodsPage/PaymentMethodsPage'));
const PrivacyPolicyPage = loadable(() => import(/* webpackChunkName: "PrivacyPolicyPage" */ '../containers/PrivacyPolicyPage/PrivacyPolicyPage'));
const ProfilePage = loadable(() => import(/* webpackChunkName: "ProfilePage" */ '../containers/ProfilePage/ProfilePage'));
const ProfileSettingsPage = loadable(() => import(/* webpackChunkName: "ProfileSettingsPage" */ '../containers/ProfileSettingsPage/ProfileSettingsPage'));
const ProjectWorkspacePage = loadable(() => import(/* webpackChunkName: "ProjectWorkspacePage" */ '../containers/ProjectWorkspacePage/ProjectWorkspacePage'));
const RequestQuotePage = loadable(() => import(/* webpackChunkName: "RequestQuotePage" */ '../containers/RequestQuotePage/RequestQuotePage'));
const SearchCompaniesPage = loadable(() => import(/* webpackChunkName: "SearchCompaniesPage" */ '../containers/SearchCompaniesPage/SearchCompaniesPage'));
const SearchPageWithMap = loadable(() => import(/* webpackChunkName: "SearchPageWithMap" */ /* webpackPrefetch: true */  '../containers/SearchPage/SearchPageWithMap'));
const SearchPageWithGrid = loadable(() => import(/* webpackChunkName: "SearchPageWithGrid" */ /* webpackPrefetch: true */  '../containers/SearchPage/SearchPageWithGrid'));
const SearchStudentsPage = loadable(() => import(/* webpackChunkName: "SearchStudentsPage" */ '../containers/SearchStudentsPage/SearchStudentsPage'));
const EducationDashboardPage = loadable(() => import(/* webpackChunkName: "EducationDashboardPage" */ '../containers/EducationDashboardPage/EducationDashboardPage'));
const EducationalAdminApplicationPage = loadable(() => import(/* webpackChunkName: "EducationalAdminApplicationPage" */ '../containers/EducationalAdminApplicationPage/EducationalAdminApplicationPage'));
const AdminDashboardPage = loadable(() => import(/* webpackChunkName: "AdminDashboardPage" */ '../containers/AdminDashboardPage/AdminDashboardPage'));
const ApplicationsPage = loadable(() => import(/* webpackChunkName: "ApplicationsPage" */ '../containers/ApplicationsPage/ApplicationsPage'));
const StudentDashboardPage = loadable(() => import(/* webpackChunkName: "StudentDashboardPage" */ '../containers/StudentDashboardPage/StudentDashboardPage'));
const OnboardingPage = loadable(() => import(/* webpackChunkName: "OnboardingPage" */ '../containers/OnboardingPage/OnboardingPage'));
const StripePayoutPage = loadable(() => import(/* webpackChunkName: "StripePayoutPage" */ '../containers/StripePayoutPage/StripePayoutPage'));
const TermsOfServicePage = loadable(() => import(/* webpackChunkName: "TermsOfServicePage" */ '../containers/TermsOfServicePage/TermsOfServicePage'));
const LegalPage = loadable(() => import(/* webpackChunkName: "LegalPage" */ '../containers/LegalPage/LegalPage'));
const BlogPage = loadable(() => import(/* webpackChunkName: "BlogPage" */ '../containers/BlogPage/BlogPage'));
const TransactionPage = loadable(() => import(/* webpackChunkName: "TransactionPage" */ '../containers/TransactionPage/TransactionPage'));
const NoAccessPage = loadable(() => import(/* webpackChunkName: "NoAccessPage" */ '../containers/NoAccessPage/NoAccessPage'));

// Styleguide helps you to review current components and develop new ones
const StyleguidePage = loadable(() => import(/* webpackChunkName: "StyleguidePage" */ '../containers/StyleguidePage/StyleguidePage'));

export const ACCOUNT_SETTINGS_PAGES = [
  'ContactDetailsPage',
  'PasswordChangePage',
  'StripePayoutPage',
  'PaymentMethodsPage',
  'ManageAccountPage'
];

// https://en.wikipedia.org/wiki/Universally_unique_identifier#Nil_UUID
const draftId = '00000000-0000-0000-0000-000000000000';
const draftSlug = 'draft';

const RedirectToLandingPage = () => <NamedRedirect name="LandingPage" />;

// NOTE: Most server-side endpoints are prefixed with /api. Requests to those
// endpoints are indended to be handled in the server instead of the browser and
// they will not render the application. So remember to avoid routes starting
// with /api and if you encounter clashing routes see server/index.js if there's
// a conflicting route defined there.

// Our routes are exact by default.
// See behaviour from Routes.js where Route is created.
const routeConfiguration = (layoutConfig, accessControlConfig) => {
  const isSearchPageWithMap = layoutConfig.searchPage?.variantType === 'map';
  const SearchPage = isSearchPageWithMap ? SearchPageWithMap : SearchPageWithGrid;
  const ListingPage = layoutConfig.listingPage?.variantType === 'carousel' 
    ? ListingPageCarousel 
    : ListingPageCoverPhoto;

  const isPrivateMarketplace = accessControlConfig?.marketplace?.private === true;
  const authForPrivateMarketplace = isPrivateMarketplace ? { auth: true } : {};
  
  return [
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPage,
      loadData: pageDataLoadingAPI.LandingPage.loadData,
    },
    {
      path: '/p/:pageId',
      name: 'CMSPage',
      component: CMSPage,
      loadData: pageDataLoadingAPI.CMSPage.loadData,
    },
    // NOTE: when the private marketplace feature is enabled, the '/s' route is disallowed by the robots.txt resource.
    // If you add new routes that start with '/s*' (e.g. /support), you should add them to the robotsPrivateMarketplace.txt file.
    {
      path: '/s',
      name: 'SearchPage',
      ...authForPrivateMarketplace,
      component: SearchPage,
      loadData: pageDataLoadingAPI.SearchPage.loadData,
      prioritizeMapLibraryLoading: isSearchPageWithMap,
    },
    {
      path: '/s/:listingType',
      name: 'SearchPageWithListingType',
      ...authForPrivateMarketplace,
      component: SearchPage,
      loadData: pageDataLoadingAPI.SearchPage.loadData,
      prioritizeMapLibraryLoading: isSearchPageWithMap,
    },
    {
      path: '/l',
      name: 'ListingBasePage',
      component: RedirectToLandingPage,
    },
    {
      path: '/l/:slug/:id',
      name: 'ListingPage',
      ...authForPrivateMarketplace,
      component: ListingPage,
      loadData: pageDataLoadingAPI.ListingPage.loadData,
      prioritizeMapLibraryLoading: true,
    },
    {
      path: '/l/:slug/:id/make-offer',
      name: 'MakeOfferPage',
      auth: true,
      component: MakeOfferPage,
      loadData: pageDataLoadingAPI.MakeOfferPage.loadData,
    },
    {
      path: '/l/:slug/:id/request-quote',
      name: 'RequestQuotePage',
      auth: true,
      component: RequestQuotePage,
      extraProps: { mode: 'request-quote' },
      loadData: pageDataLoadingAPI.RequestQuotePage.loadData,
    },
    {
      path: '/l/:slug/:id/checkout',
      name: 'CheckoutPage',
      auth: true,
      component: CheckoutPage,
      setInitialValues: pageDataLoadingAPI.CheckoutPage.setInitialValues,
    },
    {
      path: '/l/:slug/:id/:variant',
      name: 'ListingPageVariant',
      auth: true,
      authPage: 'LoginPage',
      component: ListingPage,
      loadData: pageDataLoadingAPI.ListingPage.loadData,
      prioritizeMapLibraryLoading: true,
    },
    {
      path: '/l/new',
      name: 'NewListingPage',
      auth: true,
      component: () => (
        <NamedRedirect
          name="EditListingPage"
          params={{ slug: draftSlug, id: draftId, type: 'new', tab: 'details' }}
        />
      ),
    },
    {
      path: '/l/:slug/:id/:type/:tab',
      name: 'EditListingPage',
      auth: true,
      component: EditListingPage,
      loadData: pageDataLoadingAPI.EditListingPage.loadData,
    },
    {
      path: '/l/:slug/:id/:type/:tab/:returnURLType',
      name: 'EditListingStripeOnboardingPage',
      auth: true,
      component: EditListingPage,
      loadData: pageDataLoadingAPI.EditListingPage.loadData,
    },

    // Canonical path should be after the `/l/new` path since they
    // conflict and `new` is not a valid listing UUID.
    {
      path: '/l/:id',
      name: 'ListingPageCanonical',
      ...authForPrivateMarketplace,
      component: ListingPage,
      loadData: pageDataLoadingAPI.ListingPage.loadData,
      prioritizeMapLibraryLoading: true,
    },
    {
      path: '/u',
      name: 'ProfileBasePage',
      component: RedirectToLandingPage,
    },
    {
      path: '/u/:id',
      name: 'ProfilePage',
      ...authForPrivateMarketplace,
      component: ProfilePage,
      loadData: pageDataLoadingAPI.ProfilePage.loadData,
    },
    {
      path: '/u/:id/:variant',
      name: 'ProfilePageVariant',
      auth: true,
      component: ProfilePage,
      loadData: pageDataLoadingAPI.ProfilePage.loadData,
    },
    {
      path: '/profile-settings',
      name: 'ProfileSettingsPage',
      auth: true,
      authPage: 'LoginPage',
      component: ProfileSettingsPage,
    },

    // Note: authenticating with IdP (e.g. Facebook) expects that /login path exists
    // so that in the error case users can be redirected back to the LoginPage
    // In case you change this, remember to update the route in server/api/auth/loginWithIdp.js
    {
      path: '/login',
      name: 'LoginPage',
      component: AuthenticationPage,
      extraProps: { tab: 'login' },
    },
    {
      path: '/signup',
      name: 'SignupPage',
      component: AuthenticationPage,
      extraProps: { tab: 'signup' },
      loadData: pageDataLoadingAPI.AuthenticationPage.loadData,
    },
    {
      path: '/signup/:userType',
      name: 'SignupForUserTypePage',
      component: AuthenticationPage,
      extraProps: { tab: 'signup' },
      loadData: pageDataLoadingAPI.AuthenticationPage.loadData,
    },
    // Admin portal - login only (no public signup)
    // Admin accounts can only be created by existing system admins via the Admin Dashboard
    {
      path: '/admin-portal',
      name: 'AdminPortalLoginPage',
      component: AuthenticationPage,
      extraProps: { tab: 'login', isAdminPortal: true },
    },
    {
      path: '/confirm',
      name: 'ConfirmPage',
      component: AuthenticationPage,
      extraProps: { tab: 'confirm' },
      loadData: pageDataLoadingAPI.AuthenticationPage.loadData,
    },
    {
      path: '/recover-password',
      name: 'PasswordRecoveryPage',
      component: PasswordRecoveryPage,
    },
    {
      path: '/inbox',
      name: 'InboxBasePage',
      auth: true,
      authPage: 'LoginPage',
      component: InboxRedirect,
    },
    {
      path: '/inbox/:tab',
      name: 'InboxPage',
      auth: true,
      authPage: 'LoginPage',
      component: InboxPage,
      loadData: pageDataLoadingAPI.InboxPage.loadData,
    },
    {
      path: '/application/:id',
      name: 'OrderDetailsPage',
      auth: true,
      authPage: 'LoginPage',
      component: TransactionPage,
      extraProps: { transactionRole: 'customer' },
      loadData: (params, ...rest) =>
        pageDataLoadingAPI.TransactionPage.loadData({ ...params, transactionRole: 'customer' }, ...rest),
      setInitialValues: pageDataLoadingAPI.TransactionPage.setInitialValues,
    },
    {
      // Legacy redirect: /order/:id → /application/:id
      path: '/order/:id',
      name: 'OrderDetailsPageRedirect',
      auth: true,
      authPage: 'LoginPage',
      component: props => <NamedRedirect name="OrderDetailsPage" params={{ id: props.params?.id }} />,
    },
    {
      path: '/review/:id',
      name: 'SaleDetailsPage',
      auth: true,
      authPage: 'LoginPage',
      component: TransactionPage,
      extraProps: { transactionRole: 'provider' },
      loadData: pageDataLoadingAPI.TransactionPage.loadData,
    },
    {
      // Legacy redirect: /sale/:id → /review/:id
      path: '/sale/:id',
      name: 'SaleDetailsPageRedirect',
      auth: true,
      authPage: 'LoginPage',
      component: props => <NamedRedirect name="SaleDetailsPage" params={{ id: props.params?.id }} />,
    },
    {
      path: '/dashboard',
      name: 'CorporateDashboardPage',
      auth: true,
      authPage: 'LoginPage',
      allowedRoles: ['corporate-partner'],
      component: CorporateDashboardPage,
      loadData: pageDataLoadingAPI.CorporateDashboardPage.loadData,
    },
    {
      path: '/dashboard/applications',
      name: 'ApplicationsPage',
      auth: true,
      authPage: 'LoginPage',
      allowedRoles: ['corporate-partner'],
      component: ApplicationsPage,
    },
    {
      path: '/project-workspace/:id',
      name: 'ProjectWorkspacePage',
      auth: true,
      authPage: 'LoginPage',
      component: ProjectWorkspacePage,
      loadData: pageDataLoadingAPI.ProjectWorkspacePage.loadData,
    },
    {
      path: '/search/students',
      name: 'SearchStudentsPage',
      auth: true,
      authPage: 'LoginPage',
      component: SearchStudentsPage,
      loadData: pageDataLoadingAPI.SearchStudentsPage.loadData,
    },
    {
      path: '/search/companies',
      name: 'SearchCompaniesPage',
      auth: true,
      authPage: 'LoginPage',
      component: SearchCompaniesPage,
      loadData: pageDataLoadingAPI.SearchCompaniesPage.loadData,
    },
    {
      path: '/student/dashboard',
      name: 'StudentDashboardPage',
      auth: true,
      authPage: 'LoginPage',
      allowedRoles: ['student'],
      component: StudentDashboardPage,
    },
    {
      path: '/education/dashboard',
      name: 'EducationDashboardPage',
      auth: true,
      authPage: 'LoginPage',
      allowedRoles: ['educational-admin'],
      component: EducationDashboardPage,
      loadData: pageDataLoadingAPI.EducationDashboardPage.loadData,
    },
    {
      path: '/for-universities',
      name: 'EducationalAdminApplicationPage',
      component: EducationalAdminApplicationPage,
    },
    {
      path: '/admin',
      name: 'AdminDashboardPage',
      auth: true,
      authPage: 'LoginPage',
      allowedRoles: ['system-admin'],
      component: AdminDashboardPage,
      loadData: pageDataLoadingAPI.AdminDashboardPage.loadData,
    },
    {
      path: '/admin/:tab',
      name: 'AdminDashboardTabPage',
      auth: true,
      authPage: 'LoginPage',
      allowedRoles: ['system-admin'],
      component: AdminDashboardPage,
      loadData: pageDataLoadingAPI.AdminDashboardPage.loadData,
    },
    {
      path: '/onboarding',
      name: 'OnboardingPage',
      auth: true,
      authPage: 'LoginPage',
      component: OnboardingPage,
    },
    {
      path: '/listings',
      name: 'ManageListingsPage',
      auth: true,
      authPage: 'LoginPage',
      component: ManageListingsPage,
      loadData: pageDataLoadingAPI.ManageListingsPage.loadData,
    },
    {
      path: '/account',
      name: 'AccountSettingsPage',
      auth: true,
      authPage: 'LoginPage',
      component: () => <NamedRedirect name="ContactDetailsPage" />,
    },
    {
      path: '/account/contact-details',
      name: 'ContactDetailsPage',
      auth: true,
      authPage: 'LoginPage',
      component: ContactDetailsPage,
      loadData: pageDataLoadingAPI.ContactDetailsPage.loadData,
    },
    {
      path: '/account/change-password',
      name: 'PasswordChangePage',
      auth: true,
      authPage: 'LoginPage',
      component: PasswordChangePage,
    },
    {
      path: '/account/payments',
      name: 'StripePayoutPage',
      auth: true,
      authPage: 'LoginPage',
      component: StripePayoutPage,
      loadData: pageDataLoadingAPI.StripePayoutPage.loadData,
    },
    {
      path: '/account/payments/:returnURLType',
      name: 'StripePayoutOnboardingPage',
      auth: true,
      authPage: 'LoginPage',
      component: StripePayoutPage,
      loadData: pageDataLoadingAPI.StripePayoutPage.loadData,
    },
    {
      path: '/account/payment-methods',
      name: 'PaymentMethodsPage',
      auth: true,
      authPage: 'LoginPage',
      component: PaymentMethodsPage,
      loadData: pageDataLoadingAPI.PaymentMethodsPage.loadData,
    },
    {
      path: '/account/manage',
      name: 'ManageAccountPage',
      auth: true,
      authPage: 'LoginPage',
      component: ManageAccountPage,
    },
    {
      path: '/terms-of-service',
      name: 'TermsOfServicePage',
      component: TermsOfServicePage,
      loadData: pageDataLoadingAPI.TermsOfServicePage.loadData,
    },
    {
      path: '/privacy-policy',
      name: 'PrivacyPolicyPage',
      component: PrivacyPolicyPage,
      loadData: pageDataLoadingAPI.PrivacyPolicyPage.loadData,
    },
    {
      path: '/legal/:slug',
      name: 'LegalPage',
      component: LegalPage,
    },
    {
      path: '/blog',
      name: 'BlogPage',
      component: BlogPage,
    },
    {
      path: '/blog/:slug',
      name: 'BlogPostPage',
      component: BlogPage,
    },
    {
      path: '/styleguide',
      name: 'Styleguide',
      auth: true,
      allowedRoles: ['system-admin'],
      component: StyleguidePage,
    },
    {
      path: '/styleguide/g/:group',
      name: 'StyleguideGroup',
      auth: true,
      allowedRoles: ['system-admin'],
      component: StyleguidePage,
    },
    {
      path: '/styleguide/c/:component',
      name: 'StyleguideComponent',
      auth: true,
      allowedRoles: ['system-admin'],
      component: StyleguidePage,
    },
    {
      path: '/styleguide/c/:component/:example',
      name: 'StyleguideComponentExample',
      auth: true,
      allowedRoles: ['system-admin'],
      component: StyleguidePage,
    },
    {
      path: '/styleguide/c/:component/:example/raw',
      name: 'StyleguideComponentExampleRaw',
      auth: true,
      allowedRoles: ['system-admin'],
      component: StyleguidePage,
      extraProps: { raw: true },
    },
    {
      path: '/no-:missingAccessRight',
      name: 'NoAccessPage',
      component: NoAccessPage,
    },
    {
      path: '/notfound',
      name: 'NotFoundPage',
      component: props => <NotFoundPage {...props} />,
    },

    // Do not change this path!
    //
    // The API expects that the application implements /reset-password endpoint
    {
      path: '/reset-password',
      name: 'PasswordResetPage',
      component: PasswordResetPage ,
    },

    // Do not change this path!
    //
    // The API expects that the application implements /verify-email endpoint
    {
      path: '/verify-email',
      name: 'EmailVerificationPage',
      auth: true,
      authPage: 'LoginPage',
      component: EmailVerificationPage,
      loadData: pageDataLoadingAPI.EmailVerificationPage.loadData,
    },
    // Do not change this path!
    //
    // The API expects that the application implements /preview endpoint
    {
      path: '/preview',
      name: 'PreviewResolverPage',
      component: PreviewResolverPage ,
    },
  ];
};

export default routeConfiguration;
