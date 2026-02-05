import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { pathByRouteName } from '../../util/routes';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';

import { Page, LayoutSingleColumn, NamedLink, IconCheckmark, Avatar } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './OnboardingPage.module.css';

// ================ Onboarding Steps Configuration ================ //

const getOnboardingSteps = (userType, intl) => {
  const baseSteps = [
    {
      id: 'verify-email',
      title: intl.formatMessage({ id: 'OnboardingPage.step.verifyEmail.title' }),
      description: intl.formatMessage({ id: 'OnboardingPage.step.verifyEmail.description' }),
      icon: '✉️',
      action: 'verify-email',
      link: null,
    },
    {
      id: 'complete-profile',
      title: intl.formatMessage({ id: 'OnboardingPage.step.completeProfile.title' }),
      description: intl.formatMessage({ id: 'OnboardingPage.step.completeProfile.description' }),
      icon: '👤',
      action: 'complete-profile',
      link: 'ProfileSettingsPage',
    },
    {
      id: 'add-photo',
      title: intl.formatMessage({ id: 'OnboardingPage.step.addPhoto.title' }),
      description: intl.formatMessage({ id: 'OnboardingPage.step.addPhoto.description' }),
      icon: '📷',
      action: 'add-photo',
      link: 'ProfileSettingsPage',
    },
  ];

  // Add user-type specific steps
  if (userType === 'student') {
    return [
      ...baseSteps,
      {
        id: 'browse-projects',
        title: intl.formatMessage({ id: 'OnboardingPage.step.browseProjects.title' }),
        description: intl.formatMessage({ id: 'OnboardingPage.step.browseProjects.description' }),
        icon: '🔍',
        action: 'browse-projects',
        link: 'SearchPage',
      },
      {
        id: 'first-application',
        title: intl.formatMessage({ id: 'OnboardingPage.step.firstApplication.title' }),
        description: intl.formatMessage({ id: 'OnboardingPage.step.firstApplication.description' }),
        icon: '📝',
        action: 'first-application',
        link: 'SearchPage',
      },
    ];
  }

  if (userType === 'corporate-partner') {
    return [
      ...baseSteps,
      {
        id: 'create-project',
        title: intl.formatMessage({ id: 'OnboardingPage.step.createProject.title' }),
        description: intl.formatMessage({ id: 'OnboardingPage.step.createProject.description' }),
        icon: '📋',
        action: 'create-project',
        link: 'NewListingPage',
      },
      {
        id: 'find-students',
        title: intl.formatMessage({ id: 'OnboardingPage.step.findStudents.title' }),
        description: intl.formatMessage({ id: 'OnboardingPage.step.findStudents.description' }),
        icon: '👥',
        action: 'find-students',
        link: 'SearchStudentsPage',
      },
    ];
  }

  if (userType === 'educational-admin') {
    return [
      ...baseSteps,
      {
        id: 'view-dashboard',
        title: intl.formatMessage({ id: 'OnboardingPage.step.viewDashboard.title' }),
        description: intl.formatMessage({ id: 'OnboardingPage.step.viewDashboard.description' }),
        icon: '📊',
        action: 'view-dashboard',
        link: 'EducationDashboardPage',
      },
    ];
  }

  return baseSteps;
};

// ================ Progress Calculation ================ //

const calculateProgress = (currentUser, currentUserHasListings, currentUserHasOrders) => {
  if (!currentUser) return { completed: [], percentage: 0 };

  const completed = [];
  const userType = currentUser.attributes?.profile?.publicData?.userType;

  // Check email verification
  if (currentUser.attributes?.emailVerified) {
    completed.push('verify-email');
  }

  // Check profile completion (has bio and essential fields)
  const profile = currentUser.attributes?.profile || {};
  const publicData = profile.publicData || {};
  const hasBio = profile.bio && profile.bio.length > 20;
  const hasEssentialFields =
    userType === 'student'
      ? publicData.university && publicData.major
      : userType === 'corporate-partner'
      ? publicData.companyName && publicData.industry
      : true;

  if (hasBio && hasEssentialFields) {
    completed.push('complete-profile');
  }

  // Check profile photo
  if (currentUser.profileImage?.id) {
    completed.push('add-photo');
  }

  // User-type specific checks
  if (userType === 'student') {
    if (currentUserHasOrders) {
      completed.push('first-application');
      completed.push('browse-projects'); // Implied if they applied
    }
  }

  if (userType === 'corporate-partner') {
    if (currentUserHasListings) {
      completed.push('create-project');
    }
  }

  // Calculate percentage based on user type
  const totalSteps = userType === 'student' || userType === 'corporate-partner' ? 5 : 4;
  const percentage = Math.round((completed.length / totalSteps) * 100);

  return { completed, percentage };
};

// ================ Step Card Component ================ //

const StepCard = ({ step, isCompleted, isActive, onAction }) => {
  return (
    <div
      className={`${css.stepCard} ${isCompleted ? css.completed : ''} ${
        isActive ? css.active : ''
      }`}
    >
      <div className={css.stepIcon}>
        {isCompleted ? <span className={css.checkmark}>✓</span> : <span>{step.icon}</span>}
      </div>
      <div className={css.stepContent}>
        <h3 className={css.stepTitle}>{step.title}</h3>
        <p className={css.stepDescription}>{step.description}</p>
      </div>
      {!isCompleted && step.link && (
        <NamedLink name={step.link} className={css.stepAction}>
          <FormattedMessage id="OnboardingPage.startStep" />
        </NamedLink>
      )}
      {isCompleted && (
        <span className={css.completedBadge}>
          <FormattedMessage id="OnboardingPage.completed" />
        </span>
      )}
    </div>
  );
};

// ================ Progress Bar Component ================ //

const ProgressBar = ({ percentage }) => {
  return (
    <div className={css.progressContainer}>
      <div className={css.progressHeader}>
        <span className={css.progressLabel}>
          <FormattedMessage id="OnboardingPage.progress" />
        </span>
        <span className={css.progressPercentage}>{percentage}%</span>
      </div>
      <div className={css.progressBar}>
        <div className={css.progressFill} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

// ================ Welcome Section ================ //

const WelcomeSection = ({ currentUser, userType }) => {
  const firstName = currentUser?.attributes?.profile?.firstName || 'there';

  const getWelcomeMessage = () => {
    switch (userType) {
      case 'student':
        return 'OnboardingPage.welcome.student';
      case 'corporate-partner':
        return 'OnboardingPage.welcome.corporatePartner';
      case 'educational-admin':
        return 'OnboardingPage.welcome.educationalAdmin';
      default:
        return 'OnboardingPage.welcome.default';
    }
  };

  return (
    <div className={css.welcomeSection}>
      <div className={css.welcomeContent}>
        <Avatar user={currentUser} className={css.welcomeAvatar} disableProfileLink />
        <div className={css.welcomeText}>
          <h1 className={css.welcomeTitle}>
            <FormattedMessage id="OnboardingPage.welcomeTitle" values={{ name: firstName }} />
          </h1>
          <p className={css.welcomeSubtitle}>
            <FormattedMessage id={getWelcomeMessage()} />
          </p>
        </div>
      </div>
    </div>
  );
};

// ================ Quick Actions Section ================ //

const QuickActions = ({ userType }) => {
  if (userType === 'student') {
    return (
      <div className={css.quickActions}>
        <h2 className={css.quickActionsTitle}>
          <FormattedMessage id="OnboardingPage.quickActions" />
        </h2>
        <div className={css.quickActionsGrid}>
          <NamedLink name="SearchPage" className={css.quickActionCard}>
            <span className={css.quickActionIcon}>🔍</span>
            <span className={css.quickActionLabel}>
              <FormattedMessage id="OnboardingPage.action.browseProjects" />
            </span>
          </NamedLink>
          <NamedLink name="SearchCompaniesPage" className={css.quickActionCard}>
            <span className={css.quickActionIcon}>🏢</span>
            <span className={css.quickActionLabel}>
              <FormattedMessage id="OnboardingPage.action.exploreCompanies" />
            </span>
          </NamedLink>
          <NamedLink name="ProfileSettingsPage" className={css.quickActionCard}>
            <span className={css.quickActionIcon}>⚙️</span>
            <span className={css.quickActionLabel}>
              <FormattedMessage id="OnboardingPage.action.editProfile" />
            </span>
          </NamedLink>
        </div>
      </div>
    );
  }

  if (userType === 'corporate-partner') {
    return (
      <div className={css.quickActions}>
        <h2 className={css.quickActionsTitle}>
          <FormattedMessage id="OnboardingPage.quickActions" />
        </h2>
        <div className={css.quickActionsGrid}>
          <NamedLink name="NewListingPage" className={css.quickActionCard}>
            <span className={css.quickActionIcon}>➕</span>
            <span className={css.quickActionLabel}>
              <FormattedMessage id="OnboardingPage.action.postProject" />
            </span>
          </NamedLink>
          <NamedLink name="SearchStudentsPage" className={css.quickActionCard}>
            <span className={css.quickActionIcon}>👥</span>
            <span className={css.quickActionLabel}>
              <FormattedMessage id="OnboardingPage.action.findStudents" />
            </span>
          </NamedLink>
          <NamedLink name="CorporateDashboardPage" className={css.quickActionCard}>
            <span className={css.quickActionIcon}>📊</span>
            <span className={css.quickActionLabel}>
              <FormattedMessage id="OnboardingPage.action.viewDashboard" />
            </span>
          </NamedLink>
        </div>
      </div>
    );
  }

  return null;
};

// ================ Main Component ================ //

const OnboardingPageComponent = props => {
  const { scrollingDisabled, currentUser, currentUserHasListings, currentUserHasOrders } = props;

  const intl = useIntl();
  const routeConfiguration = useRouteConfiguration();
  const history = useHistory();

  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const steps = getOnboardingSteps(userType, intl);
  const { completed, percentage } = calculateProgress(
    currentUser,
    currentUserHasListings,
    currentUserHasOrders
  );

  // Find the first incomplete step
  const firstIncompleteIndex = steps.findIndex(step => !completed.includes(step.id));

  const title = intl.formatMessage({ id: 'OnboardingPage.title' });

  // Redirect if not logged in
  if (!currentUser) {
    return null;
  }

  // If onboarding is 100% complete, show completion message
  const isComplete = percentage === 100;

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.pageContent}>
          <WelcomeSection currentUser={currentUser} userType={userType} />

          <div className={css.mainContent}>
            {/* Progress Section */}
            <div className={css.progressSection}>
              <ProgressBar percentage={percentage} />
              {isComplete && (
                <div className={css.completionBanner}>
                  <span className={css.completionIcon}>🎉</span>
                  <div className={css.completionText}>
                    <h3>
                      <FormattedMessage id="OnboardingPage.complete.title" />
                    </h3>
                    <p>
                      <FormattedMessage id="OnboardingPage.complete.description" />
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Steps Section */}
            <div className={css.stepsSection}>
              <h2 className={css.stepsTitle}>
                <FormattedMessage id="OnboardingPage.stepsTitle" />
              </h2>
              <div className={css.stepsList}>
                {steps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    isCompleted={completed.includes(step.id)}
                    isActive={index === firstIncompleteIndex}
                    onAction={() => {}}
                  />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActions userType={userType} />

            {/* Skip Link */}
            <div className={css.skipSection}>
              <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.skipLink}>
                <FormattedMessage id="OnboardingPage.skipToInbox" />
              </NamedLink>
            </div>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser, currentUserHasListings, currentUserHasOrders } = state.user;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    currentUserHasListings,
    currentUserHasOrders,
  };
};

const OnboardingPage = compose(connect(mapStateToProps))(OnboardingPageComponent);

export default OnboardingPage;
