/**
 * Export reducers from ducks modules of different containers (i.e. default export)
 * We are following Ducks module proposition:
 * https://github.com/erikras/ducks-modular-redux
 */
import AdminDashboardPage from './AdminDashboardPage/AdminDashboardPage.duck';
import CheckoutPage from './CheckoutPage/CheckoutPage.duck';
import ContactDetailsPage from './ContactDetailsPage/ContactDetailsPage.duck';
import CorporateDashboardPage from './CorporateDashboardPage/CorporateDashboardPage.duck';
import EditListingPage from './EditListingPage/EditListingPage.duck';
import EducationDashboardPage from './EducationDashboardPage/EducationDashboardPage.duck';
import InboxPage from './InboxPage/InboxPage.duck';
import ListingPage from './ListingPage/ListingPage.duck';
import MakeOfferPage from './MakeOfferPage/MakeOfferPage.duck';
import ManageListingsPage from './ManageListingsPage/ManageListingsPage.duck';
import PasswordChangePage from './PasswordChangePage/PasswordChangePage.duck';
import PasswordRecoveryPage from './PasswordRecoveryPage/PasswordRecoveryPage.duck';
import PasswordResetPage from './PasswordResetPage/PasswordResetPage.duck';
import PaymentMethodsPage from './PaymentMethodsPage/PaymentMethodsPage.duck';
import ManageAccountPage from './ManageAccountPage/ManageAccountPage.duck';
import ProfilePage from './ProfilePage/ProfilePage.duck';
import ProfileSettingsPage from './ProfileSettingsPage/ProfileSettingsPage.duck';
import ProjectWorkspacePage from './ProjectWorkspacePage/ProjectWorkspacePage.duck';
import RequestQuotePage from './RequestQuotePage/RequestQuotePage.duck';
import SearchCompaniesPage from './SearchCompaniesPage/SearchCompaniesPage.duck';
import SearchPage from './SearchPage/SearchPage.duck';
import SearchStudentsPage from './SearchStudentsPage/SearchStudentsPage.duck';
import StripePayoutPage from './StripePayoutPage/StripePayoutPage.duck';
import TransactionPage from './TransactionPage/TransactionPage.duck';

export {
  AdminDashboardPage,
  CheckoutPage,
  ContactDetailsPage,
  CorporateDashboardPage,
  EditListingPage,
  EducationDashboardPage,
  InboxPage,
  ListingPage,
  MakeOfferPage,
  ManageListingsPage,
  PasswordChangePage,
  PasswordRecoveryPage,
  PasswordResetPage,
  PaymentMethodsPage,
  ManageAccountPage,
  ProfilePage,
  ProfileSettingsPage,
  ProjectWorkspacePage,
  RequestQuotePage,
  SearchCompaniesPage,
  SearchPage,
  SearchStudentsPage,
  StripePayoutPage,
  TransactionPage,
};
