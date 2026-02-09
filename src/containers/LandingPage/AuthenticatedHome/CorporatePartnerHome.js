import React from 'react';
import { useIntl } from '../../../util/reactIntl';
import { StatCard, ActionCard, GreetingHeader, EmptyState } from '../../../components';

import css from './AuthenticatedHome.module.css';

const CorporatePartnerHome = props => {
  const { firstName, data } = props;
  const intl = useIntl();

  const stats = data?.data || data || {};
  const activeProjects = stats.activeProjects || stats.totalListings || 0;
  const totalApplications = stats.totalApplications || stats.pendingApplications || 0;
  const studentsHired = stats.studentsHired || stats.acceptedApplications || 0;
  const totalSpend = stats.totalSpend || stats.totalRevenue || 0;

  const formatCurrency = value => {
    if (!value || value === 0) return '$0';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value}`;
  };

  return (
    <div className={css.homeContainer}>
      {/* Greeting */}
      <GreetingHeader
        firstName={firstName}
        subtitle={intl.formatMessage({ id: 'LandingPage.home.corporate.subtitle' })}
      />

      {/* Stats */}
      <div className={css.statsGrid}>
        <StatCard
          icon="📊"
          value={activeProjects}
          label={intl.formatMessage({ id: 'LandingPage.home.corporate.stat.activeProjects' })}
          colorScheme="teal"
          animationDelay={0}
        />
        <StatCard
          icon="📬"
          value={totalApplications}
          label={intl.formatMessage({ id: 'LandingPage.home.corporate.stat.applications' })}
          colorScheme="amber"
          animationDelay={50}
        />
        <StatCard
          icon="🤝"
          value={studentsHired}
          label={intl.formatMessage({ id: 'LandingPage.home.corporate.stat.studentsHired' })}
          colorScheme="emerald"
          animationDelay={100}
        />
        <StatCard
          icon="💰"
          value={formatCurrency(totalSpend)}
          label={intl.formatMessage({ id: 'LandingPage.home.corporate.stat.totalSpend' })}
          colorScheme="navy"
          animationDelay={150}
        />
      </div>

      {/* Quick Actions */}
      <div className={css.actionsGrid}>
        <ActionCard
          icon="➕"
          title={intl.formatMessage({ id: 'LandingPage.home.corporate.action.postProject' })}
          description={intl.formatMessage({ id: 'LandingPage.home.corporate.action.postProjectDesc' })}
          linkProps={{ name: 'NewListingPage' }}
          colorScheme="teal"
          animationDelay={0}
        />
        <ActionCard
          icon="📋"
          title={intl.formatMessage({ id: 'LandingPage.home.corporate.action.reviewApplications' })}
          description={intl.formatMessage({ id: 'LandingPage.home.corporate.action.reviewApplicationsDesc' })}
          linkProps={{ name: 'InboxPage', params: { tab: 'sales' } }}
          colorScheme="amber"
          animationDelay={50}
        />
        <ActionCard
          icon="🔍"
          title={intl.formatMessage({ id: 'LandingPage.home.corporate.action.browseTalent' })}
          description={intl.formatMessage({ id: 'LandingPage.home.corporate.action.browseTalentDesc' })}
          linkProps={{ name: 'SearchStudentsPage' }}
          colorScheme="emerald"
          animationDelay={100}
        />
        <ActionCard
          icon="📂"
          title={intl.formatMessage({ id: 'LandingPage.home.corporate.action.manageListings' })}
          description={intl.formatMessage({ id: 'LandingPage.home.corporate.action.manageListingsDesc' })}
          linkProps={{ name: 'ManageListingsPage' }}
          colorScheme="navy"
          animationDelay={150}
        />
        <ActionCard
          icon="⚙️"
          title={intl.formatMessage({ id: 'LandingPage.home.corporate.action.profileSettings' })}
          description={intl.formatMessage({ id: 'LandingPage.home.corporate.action.profileSettingsDesc' })}
          linkProps={{ name: 'ProfileSettingsPage' }}
          colorScheme="coral"
          animationDelay={200}
        />
      </div>

      {/* Get Started Section */}
      {activeProjects === 0 && (
        <div className={css.contentSection}>
          <EmptyState
            icon="🏢"
            title={intl.formatMessage({ id: 'LandingPage.home.corporate.section.getStarted' })}
            description={intl.formatMessage({ id: 'LandingPage.home.corporate.section.getStartedDesc' })}
            primaryAction={{
              label: intl.formatMessage({ id: 'LandingPage.home.corporate.action.postProject' }),
              link: { name: 'NewListingPage' },
            }}
            size="large"
            variant="muted"
          />
        </div>
      )}
    </div>
  );
};

export default CorporatePartnerHome;
