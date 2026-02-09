import React from 'react';
import { useIntl } from '../../../util/reactIntl';
import { StatCard, ActionCard, GreetingHeader, EmptyState } from '../../../components';

import css from './AuthenticatedHome.module.css';

const AlumniHome = props => {
  const { firstName, data } = props;
  const intl = useIntl();

  const alumniData = data?.data || data || {};
  const stats = alumniData.stats || {};
  const recentActivity = alumniData.recentActivity || [];

  return (
    <div className={css.homeContainer}>
      {/* Greeting */}
      <GreetingHeader
        firstName={firstName}
        subtitle={intl.formatMessage({ id: 'LandingPage.home.alumni.subtitle' })}
      />

      {/* Stats */}
      <div className={css.statsGrid}>
        <StatCard
          icon="🎯"
          value={stats.mentorshipProjects || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.alumni.stat.mentorshipProjects' })}
          colorScheme="teal"
          animationDelay={0}
        />
        <StatCard
          icon="👥"
          value={stats.studentsConnected || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.alumni.stat.studentsConnected' })}
          colorScheme="emerald"
          animationDelay={50}
        />
        <StatCard
          icon="⭐"
          value={stats.activityScore || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.alumni.stat.activityScore' })}
          colorScheme="amber"
          animationDelay={100}
        />
      </div>

      {/* Quick Actions */}
      <div className={css.actionsGrid}>
        <ActionCard
          icon="➕"
          title={intl.formatMessage({ id: 'LandingPage.home.alumni.action.createProject' })}
          description={intl.formatMessage({ id: 'LandingPage.home.alumni.action.createProjectDesc' })}
          linkProps={{ name: 'NewListingPage' }}
          colorScheme="teal"
          animationDelay={0}
        />
        <ActionCard
          icon="🔍"
          title={intl.formatMessage({ id: 'LandingPage.home.alumni.action.browseStudents' })}
          description={intl.formatMessage({ id: 'LandingPage.home.alumni.action.browseStudentsDesc' })}
          linkProps={{ name: 'SearchStudentsPage' }}
          colorScheme="emerald"
          animationDelay={50}
        />
        <ActionCard
          icon="🌐"
          title={intl.formatMessage({ id: 'LandingPage.home.alumni.action.network' })}
          description={intl.formatMessage({ id: 'LandingPage.home.alumni.action.networkDesc' })}
          linkProps={{ name: 'SearchPage' }}
          colorScheme="navy"
          animationDelay={100}
        />
        <ActionCard
          icon="✏️"
          title={intl.formatMessage({ id: 'LandingPage.home.alumni.action.profileSettings' })}
          description={intl.formatMessage({ id: 'LandingPage.home.alumni.action.profileSettingsDesc' })}
          linkProps={{ name: 'ProfileSettingsPage' }}
          colorScheme="amber"
          animationDelay={150}
        />
        <ActionCard
          icon="💬"
          title={intl.formatMessage({ id: 'LandingPage.home.alumni.action.messages' })}
          description={intl.formatMessage({ id: 'LandingPage.home.alumni.action.messagesDesc' })}
          linkProps={{ name: 'InboxPage', params: { tab: 'sales' } }}
          colorScheme="coral"
          animationDelay={200}
        />
        <ActionCard
          icon="📂"
          title={intl.formatMessage({ id: 'LandingPage.home.corporate.action.manageListings' })}
          description={intl.formatMessage({ id: 'LandingPage.home.alumni.action.createProjectDesc' })}
          linkProps={{ name: 'ManageListingsPage' }}
          colorScheme="emerald"
          animationDelay={250}
        />
      </div>

      {/* Recent Activity or Get Started */}
      <div className={css.contentSection}>
        {recentActivity.length > 0 ? (
          <>
            <div className={css.sectionHeader}>
              <h3 className={css.sectionTitle}>
                {intl.formatMessage({ id: 'LandingPage.home.alumni.section.recentActivity' })}
              </h3>
            </div>
            <div className={css.activityList}>
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className={css.activityItem}>
                  <div className={css.activityDot} />
                  <span className={css.activityText}>
                    {activity.description || activity.message || 'Activity'}
                  </span>
                  <span className={css.activityTime}>
                    {activity.time || activity.createdAt || ''}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon="🎓"
            title={intl.formatMessage({ id: 'LandingPage.home.alumni.section.getStarted' })}
            description={intl.formatMessage({ id: 'LandingPage.home.alumni.section.getStartedDesc' })}
            primaryAction={{
              label: intl.formatMessage({ id: 'LandingPage.home.alumni.action.createProject' }),
              link: { name: 'NewListingPage' },
            }}
            size="large"
            variant="muted"
          />
        )}
      </div>
    </div>
  );
};

export default AlumniHome;
