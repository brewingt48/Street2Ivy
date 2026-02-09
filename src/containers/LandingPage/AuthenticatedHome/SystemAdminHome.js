import React from 'react';
import { useIntl } from '../../../util/reactIntl';
import { StatCard, ActionCard, GreetingHeader, EmptyState } from '../../../components';

import css from './AuthenticatedHome.module.css';

const SystemAdminHome = props => {
  const { firstName, data } = props;
  const intl = useIntl();

  const adminData = data?.data || data || {};
  const totalUsers = adminData.totalUsers || 0;
  const totalTenants = adminData.totalTenants || 0;
  const activeTenants = adminData.activeTenants || 0;
  const pendingRequests = adminData.pendingRequests || [];

  return (
    <div className={css.homeContainer}>
      {/* Greeting */}
      <GreetingHeader
        firstName={firstName}
        subtitle={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.subtitle' })}
      />

      {/* Pending Approvals Alert */}
      {pendingRequests.length > 0 && (
        <div className={css.alertBanner}>
          <span className={css.alertIcon}>⚡</span>
          <div className={css.alertContent}>
            <h4 className={css.alertTitle}>
              {pendingRequests.length} pending approval{pendingRequests.length !== 1 ? 's' : ''} require your attention
            </h4>
            <p className={css.alertDescription}>
              Review and process tenant requests to keep the platform running smoothly.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={css.statsGridFive}>
        <StatCard
          icon="👤"
          value={totalUsers}
          label={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.stat.totalUsers' })}
          colorScheme="teal"
          animationDelay={0}
        />
        <StatCard
          icon="🏛️"
          value={activeTenants}
          label={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.stat.activeTenants' })}
          colorScheme="emerald"
          animationDelay={50}
        />
        <StatCard
          icon="⏳"
          value={pendingRequests.length}
          label={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.stat.pendingApprovals' })}
          colorScheme={pendingRequests.length > 0 ? 'amber' : 'teal'}
          animationDelay={100}
        />
        <StatCard
          icon="📊"
          value={totalTenants}
          label={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.stat.activeProjects' })}
          colorScheme="navy"
          animationDelay={150}
        />
        <StatCard
          icon="✅"
          value="OK"
          label={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.stat.systemHealth' })}
          colorScheme="emerald"
          animationDelay={200}
        />
      </div>

      {/* Quick Actions */}
      <div className={css.actionsGrid}>
        <ActionCard
          icon="🏛️"
          title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.manageTenants' })}
          description={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.manageTenantsDesc' })}
          linkProps={{ name: 'AdminDashboardTabPage', params: { tab: 'tenants' } }}
          colorScheme="teal"
          animationDelay={0}
        />
        <ActionCard
          icon="👥"
          title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.userManagement' })}
          description={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.userManagementDesc' })}
          linkProps={{ name: 'AdminDashboardTabPage', params: { tab: 'users' } }}
          colorScheme="emerald"
          animationDelay={50}
        />
        <ActionCard
          icon="📝"
          title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.approvals' })}
          description={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.approvalsDesc' })}
          linkProps={{ name: 'AdminDashboardTabPage', params: { tab: 'institutions' } }}
          colorScheme="amber"
          animationDelay={100}
        />
        <ActionCard
          icon="📈"
          title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.reports' })}
          description={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.reportsDesc' })}
          linkProps={{ name: 'AdminDashboardTabPage', params: { tab: 'reports' } }}
          colorScheme="navy"
          animationDelay={150}
        />
        <ActionCard
          icon="💬"
          title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.messages' })}
          description={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.messagesDesc' })}
          linkProps={{ name: 'AdminDashboardTabPage', params: { tab: 'messages' } }}
          colorScheme="coral"
          animationDelay={200}
        />
        <ActionCard
          icon="📰"
          title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.blog' })}
          description={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.blogDesc' })}
          linkProps={{ name: 'AdminDashboardTabPage', params: { tab: 'blog' } }}
          colorScheme="amber"
          animationDelay={250}
        />
        <ActionCard
          icon="📝"
          title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.content' })}
          description={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.contentDesc' })}
          linkProps={{ name: 'AdminDashboardTabPage', params: { tab: 'content' } }}
          colorScheme="emerald"
          animationDelay={300}
        />
        <ActionCard
          icon="🤖"
          title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.coaching' })}
          description={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.action.coachingDesc' })}
          linkProps={{ name: 'AdminDashboardTabPage', params: { tab: 'coaching' } }}
          colorScheme="teal"
          animationDelay={350}
        />
      </div>

      {/* Pending Approvals Detail or Empty State */}
      <div className={css.contentSection}>
        {pendingRequests.length > 0 ? (
          <>
            <div className={css.sectionHeader}>
              <h3 className={css.sectionTitle}>
                {intl.formatMessage({ id: 'LandingPage.home.sysAdmin.section.pendingApprovals' })}
              </h3>
            </div>
            <div className={css.activityList}>
              {pendingRequests.slice(0, 5).map((request, index) => (
                <div key={index} className={css.activityItem}>
                  <div className={css.activityDot} />
                  <span className={css.activityText}>
                    {request.institutionName || request.name || 'Tenant Request'} — {request.domain || ''}
                  </span>
                  <span className={css.activityTime}>
                    {request.requestedAt || request.createdAt || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon="✅"
            title={intl.formatMessage({ id: 'LandingPage.home.sysAdmin.section.noPending' })}
            description="All tenant requests have been processed. The platform is running smoothly."
            size="medium"
            variant="muted"
          />
        )}
      </div>
    </div>
  );
};

export default SystemAdminHome;
