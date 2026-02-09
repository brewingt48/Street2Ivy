import React from 'react';
import { DashboardErrorBoundary, EmptyState, HomeSkeletonLoader } from '../../../components';

import StudentHome from './StudentHome';
import CorporatePartnerHome from './CorporatePartnerHome';
import AlumniHome from './AlumniHome';
import EducationalAdminHome from './EducationalAdminHome';
import SystemAdminHome from './SystemAdminHome';

import css from './AuthenticatedHome.module.css';

/**
 * AuthenticatedHome routes to the appropriate role-specific home view
 * based on the current user's type.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.currentUser - The authenticated user object
 * @param {string} props.userType - The user's role type
 * @param {Object} props.homeData - Fetched home data (contains { role, data })
 * @param {boolean} props.homeDataLoading - Whether data is being fetched
 * @param {Object} props.homeDataError - Any error from data fetching
 */
const AuthenticatedHome = props => {
  const {
    currentUser,
    userType,
    homeData,
    homeDataLoading,
    homeDataError,
    coachingConfig,
    institutionInfo,
    isLoadingInstitution,
  } = props;

  const firstName = currentUser?.attributes?.profile?.firstName || '';
  const data = homeData?.data || null;

  // Loading state
  if (homeDataLoading && !homeData) {
    return <HomeSkeletonLoader />;
  }

  // Error state
  if (homeDataError && !homeData) {
    return (
      <div className={css.homeContainer}>
        <div className={css.errorContainer}>
          <EmptyState
            icon="⚠️"
            title="Unable to load dashboard"
            description="We couldn't load your home data. Please try refreshing the page."
            primaryAction={{
              label: 'Refresh',
              onClick: () => window.location.reload(),
            }}
            size="large"
          />
        </div>
      </div>
    );
  }

  // Render role-specific view
  const renderRoleView = () => {
    switch (userType) {
      case 'student':
        return (
          <StudentHome
            currentUser={currentUser}
            firstName={firstName}
            data={data}
            loading={homeDataLoading}
            coachingConfig={coachingConfig}
            institutionInfo={institutionInfo}
            isLoadingInstitution={isLoadingInstitution}
          />
        );
      case 'corporate-partner':
        return (
          <CorporatePartnerHome
            currentUser={currentUser}
            firstName={firstName}
            data={data}
            loading={homeDataLoading}
          />
        );
      case 'alumni':
        return (
          <AlumniHome
            currentUser={currentUser}
            firstName={firstName}
            data={data}
            loading={homeDataLoading}
          />
        );
      case 'educational-admin':
        return (
          <EducationalAdminHome
            currentUser={currentUser}
            firstName={firstName}
            data={data}
            loading={homeDataLoading}
          />
        );
      case 'system-admin':
        return (
          <SystemAdminHome
            currentUser={currentUser}
            firstName={firstName}
            data={data}
            loading={homeDataLoading}
          />
        );
      default:
        // Default to student view for unknown types
        return (
          <StudentHome
            currentUser={currentUser}
            firstName={firstName}
            data={data}
            loading={homeDataLoading}
            coachingConfig={coachingConfig}
            institutionInfo={institutionInfo}
            isLoadingInstitution={isLoadingInstitution}
          />
        );
    }
  };

  return (
    <DashboardErrorBoundary pageName="AuthenticatedHome">
      {renderRoleView()}
    </DashboardErrorBoundary>
  );
};

export default AuthenticatedHome;
