import React from 'react';
import { useIntl } from '../../../util/reactIntl';
import { StatCard, ActionCard, GreetingHeader, EmptyState } from '../../../components';

import css from './AuthenticatedHome.module.css';

const EducationalAdminHome = props => {
  const { firstName, data } = props;
  const intl = useIntl();

  const eduData = data?.data || data || {};
  const stats = eduData.stats || {};
  const institutionName = eduData.institutionName || '';

  const subtitle = institutionName
    ? intl.formatMessage(
        { id: 'LandingPage.home.eduAdmin.subtitle' },
        { institutionName }
      )
    : intl.formatMessage({ id: 'LandingPage.home.eduAdmin.subtitleDefault' });

  return (
    <div className={css.homeContainer}>
      {/* Greeting */}
      <GreetingHeader firstName={firstName} subtitle={subtitle} />

      {/* Stats */}
      <div className={css.statsGridFive}>
        <StatCard
          icon="👩‍🎓"
          value={stats.totalStudents || stats.registeredStudents || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.stat.registeredStudents' })}
          colorScheme="teal"
          animationDelay={0}
        />
        <StatCard
          icon="🚀"
          value={stats.activeProjects || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.stat.activeProjects' })}
          colorScheme="emerald"
          animationDelay={50}
        />
        <StatCard
          icon="📈"
          value={stats.placementRate ? `${stats.placementRate}%` : '0%'}
          label={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.stat.placementRate' })}
          colorScheme="amber"
          animationDelay={100}
        />
        <StatCard
          icon="🎓"
          value={stats.alumniCount || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.stat.alumniCount' })}
          colorScheme="navy"
          animationDelay={150}
        />
        <StatCard
          icon="🤖"
          value={stats.aiCoachUsage || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.stat.aiCoachUsage' })}
          colorScheme="coral"
          animationDelay={200}
        />
      </div>

      {/* Quick Actions */}
      <div className={css.actionsGrid}>
        <ActionCard
          icon="👥"
          title={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.viewStudents' })}
          description={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.viewStudentsDesc' })}
          linkProps={{ name: 'EducationDashboardTabPage', params: { tab: 'students' } }}
          colorScheme="teal"
          animationDelay={0}
        />
        <ActionCard
          icon="🎓"
          title={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.manageAlumni' })}
          description={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.manageAlumniDesc' })}
          linkProps={{ name: 'EducationDashboardTabPage', params: { tab: 'alumni' } }}
          colorScheme="emerald"
          animationDelay={50}
        />
        <ActionCard
          icon="📊"
          title={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.reports' })}
          description={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.reportsDesc' })}
          linkProps={{ name: 'EducationDashboardTabPage', params: { tab: 'reports' } }}
          colorScheme="amber"
          animationDelay={100}
        />
        <ActionCard
          icon="⚙️"
          title={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.settings' })}
          description={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.settingsDesc' })}
          linkProps={{ name: 'EducationDashboardTabPage', params: { tab: 'branding' } }}
          colorScheme="navy"
          animationDelay={150}
        />
        <ActionCard
          icon="💬"
          title={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.messages' })}
          description={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.messagesDesc' })}
          linkProps={{ name: 'EducationDashboardTabPage', params: { tab: 'messages' } }}
          colorScheme="coral"
          animationDelay={200}
        />
        <ActionCard
          icon="✏️"
          title={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.profileSettings' })}
          description={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.profileSettingsDesc' })}
          linkProps={{ name: 'ProfileSettingsPage' }}
          colorScheme="teal"
          animationDelay={250}
        />
      </div>

      {/* Engagement Overview or Welcome */}
      <div className={css.contentSection}>
        <EmptyState
          icon="🏛️"
          title={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.section.getStarted' })}
          description={intl.formatMessage({ id: 'LandingPage.home.eduAdmin.section.getStartedDesc' })}
          primaryAction={{
            label: intl.formatMessage({ id: 'LandingPage.home.eduAdmin.action.viewStudents' }),
            link: { name: 'EducationDashboardTabPage', params: { tab: 'students' } },
          }}
          size="large"
          variant="muted"
        />
      </div>
    </div>
  );
};

export default EducationalAdminHome;
