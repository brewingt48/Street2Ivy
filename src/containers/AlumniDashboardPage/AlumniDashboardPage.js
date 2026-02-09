import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { fetchAlumniReferralLink, fetchAlumniReferrals, fetchAlumniReferralStats } from '../../util/api';
import { NamedRedirect, Page, DashboardErrorBoundary, HelpTip, EmptyState } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import css from './AlumniDashboardPage.module.css';

const TABS = ['overview', 'projects', 'referrals', 'messages', 'profile'];

const AlumniDashboardPageComponent = props => {
  const {
    scrollingDisabled,
    currentUser,
    stats,
    recentActivity,
    institutionDomain,
    profile,
    fetchInProgress,
    fetchError,
  } = props;

  const intl = useIntl();
  const history = useHistory();
  const { tab } = useParams();
  const activeTab = tab && TABS.includes(tab) ? tab : 'overview';

  // Route guard: only alumni users can access this page
  const currentUserType = currentUser?.attributes?.profile?.publicData?.userType;
  const currentUserLoaded = !!currentUser?.id;

  if (currentUserLoaded && currentUserType !== 'alumni') {
    return <NamedRedirect name="LandingPage" />;
  }

  const handleTabChange = newTab => {
    history.push(`/alumni/dashboard/${newTab}`);
  };

  const displayName = currentUser?.attributes?.profile?.displayName || 'Alumni';

  // ─── Overview Tab ─────────────────────────────────────────────
  const renderOverview = () => (
    <div className={css.tabContent}>
      <h2 className={css.welcomeMessage}>
        {intl.formatMessage({ id: 'AlumniDashboardPage.welcomeMessage' }, { displayName })}
        <HelpTip
          content={intl.formatMessage({ id: 'AlumniDashboardPage.helpOverview' })}
          position="right"
          size="large"
        />
      </h2>

      <div className={css.statsGrid}>
        <div className={css.statCard}>
          <div className={css.statValue}>{stats?.projectsCreated || 0}</div>
          <div className={css.statLabel}>
            {intl.formatMessage({ id: 'AlumniDashboardPage.projectsCreated' })}
            <HelpTip
              content={intl.formatMessage({ id: 'AlumniDashboardPage.helpProjectsCreated' })}
              position="top"
              size="small"
            />
          </div>
        </div>
        <div className={css.statCard}>
          <div className={css.statValue}>{stats?.activeProjects || 0}</div>
          <div className={css.statLabel}>
            {intl.formatMessage({ id: 'AlumniDashboardPage.activeProjects' })}
            <HelpTip
              content={intl.formatMessage({ id: 'AlumniDashboardPage.helpActiveProjects' })}
              position="top"
              size="small"
            />
          </div>
        </div>
        <div className={css.statCard}>
          <div className={css.statValue}>{stats?.totalApplications || 0}</div>
          <div className={css.statLabel}>
            {intl.formatMessage({ id: 'AlumniDashboardPage.totalApplications' })}
            <HelpTip
              content={intl.formatMessage({ id: 'AlumniDashboardPage.helpTotalApplications' })}
              position="top"
              size="small"
            />
          </div>
        </div>
      </div>

      {recentActivity && recentActivity.length > 0 ? (
        <div className={css.recentActivity}>
          <h3 className={css.sectionTitle}>
            {intl.formatMessage({ id: 'AlumniDashboardPage.recentActivity' })}
          </h3>
          <div className={css.activityList}>
            {recentActivity.map(item => (
              <div key={item.id} className={css.activityItem}>
                <span className={css.activityTitle}>{item.title}</span>
                <span className={css.activityDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="📋"
          title={intl.formatMessage({ id: 'AlumniDashboardPage.emptyActivityTitle' })}
          description={intl.formatMessage({ id: 'AlumniDashboardPage.emptyActivityDescription' })}
          size="small"
        />
      )}
    </div>
  );

  // ─── Projects Tab ────────────────────────────────────────────
  const renderProjects = () => (
    <div className={css.tabContent}>
      <div className={css.sectionHeader}>
        <h2 className={css.sectionTitle}>
          {intl.formatMessage({ id: 'AlumniDashboardPage.projectsTab' })}
        </h2>
        <a href="/l/new" className={css.createButton}>
          {intl.formatMessage({ id: 'AlumniDashboardPage.createProject' })}
        </a>
      </div>

      <EmptyState
        icon="💼"
        title={intl.formatMessage({ id: 'AlumniDashboardPage.emptyProjectsTitle' })}
        description={intl.formatMessage({ id: 'AlumniDashboardPage.emptyProjectsDescription' })}
        primaryAction={{
          label: intl.formatMessage({ id: 'AlumniDashboardPage.emptyProjectsAction' }),
          link: '/l/new',
        }}
        size="medium"
      />
    </div>
  );

  // ─── Referrals Tab ──────────────────────────────────────────
  const [referralData, setReferralData] = useState(null);
  const [referralStats, setReferralStats] = useState(null);
  const [referredStudents, setReferredStudents] = useState([]);
  const [referralLoading, setReferralLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (activeTab === 'referrals' && !referralData) {
      setReferralLoading(true);
      Promise.all([
        fetchAlumniReferralLink().catch(() => ({ data: null })),
        fetchAlumniReferralStats().catch(() => ({ data: null })),
        fetchAlumniReferrals().catch(() => ({ data: [], total: 0 })),
      ]).then(([linkRes, statsRes, referralsRes]) => {
        setReferralData(linkRes.data);
        setReferralStats(statsRes.data);
        setReferredStudents(referralsRes.data || []);
        setReferralLoading(false);
      });
    }
  }, [activeTab]);

  const handleCopyReferralLink = () => {
    if (referralData?.referralCode) {
      const link = `${window.location.origin}/signup/student?ref=${referralData.referralCode}`;
      navigator.clipboard.writeText(link).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  };

  const renderReferrals = () => {
    if (referralLoading) {
      return (
        <div className={css.tabContent}>
          <div className={css.loadingState}>
            <p>{intl.formatMessage({ id: 'AlumniDashboardPage.loading' })}</p>
          </div>
        </div>
      );
    }

    const referralLink = referralData?.referralCode
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup/student?ref=${referralData.referralCode}`
      : null;

    return (
      <div className={css.tabContent}>
        <h2 className={css.sectionTitle}>
          {intl.formatMessage({ id: 'AlumniDashboardPage.referralsTab' })}
        </h2>

        {/* Referral Link Card */}
        <div className={css.referralLinkCard}>
          <h3 className={css.referralLinkTitle}>
            {intl.formatMessage({ id: 'AlumniDashboardPage.referralLinkTitle' })}
          </h3>
          <p className={css.referralLinkDescription}>
            {intl.formatMessage({ id: 'AlumniDashboardPage.referralLinkDescription' })}
          </p>
          {referralLink ? (
            <div className={css.referralLinkRow}>
              <input
                className={css.referralLinkInput}
                type="text"
                value={referralLink}
                readOnly
              />
              <button className={css.copyButton} onClick={handleCopyReferralLink}>
                {linkCopied
                  ? intl.formatMessage({ id: 'AlumniDashboardPage.referralLinkCopied' })
                  : intl.formatMessage({ id: 'AlumniDashboardPage.referralLinkCopy' })}
              </button>
            </div>
          ) : null}
        </div>

        {/* Referral Stats */}
        {referralStats ? (
          <div className={css.statsGrid}>
            <div className={css.statCard}>
              <div className={css.statValue}>{referralStats.totalReferred || 0}</div>
              <div className={css.statLabel}>
                {intl.formatMessage({ id: 'AlumniDashboardPage.referralStatReferred' })}
              </div>
            </div>
            <div className={css.statCard}>
              <div className={css.statValue}>{referralStats.totalApplied || 0}</div>
              <div className={css.statLabel}>
                {intl.formatMessage({ id: 'AlumniDashboardPage.referralStatApplied' })}
              </div>
            </div>
            <div className={css.statCard}>
              <div className={css.statValue}>{referralStats.conversionRate || 0}%</div>
              <div className={css.statLabel}>
                {intl.formatMessage({ id: 'AlumniDashboardPage.referralStatConversion' })}
              </div>
            </div>
          </div>
        ) : null}

        {/* Referred Students List */}
        {referredStudents.length > 0 ? (
          <div className={css.recentActivity}>
            <h3 className={css.sectionTitle}>
              {intl.formatMessage({ id: 'AlumniDashboardPage.referralStudents' })}
            </h3>
            <div className={css.activityList}>
              {referredStudents.map((student, i) => (
                <div key={i} className={css.activityItem}>
                  <span className={css.activityTitle}>{student.studentName}</span>
                  <span className={css.activityDate}>
                    {new Date(student.signedUpAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon="🔗"
            title={intl.formatMessage({ id: 'AlumniDashboardPage.emptyReferralsTitle' })}
            description={intl.formatMessage({ id: 'AlumniDashboardPage.emptyReferralsDescription' })}
            size="small"
          />
        )}
      </div>
    );
  };

  // ─── Messages Tab ────────────────────────────────────────────
  const renderMessages = () => (
    <div className={css.tabContent}>
      <h2 className={css.sectionTitle}>
        {intl.formatMessage({ id: 'AlumniDashboardPage.messagesTab' })}
      </h2>
      <EmptyState
        icon="💬"
        title={intl.formatMessage({ id: 'AlumniDashboardPage.emptyMessagesTitle' })}
        description={intl.formatMessage({ id: 'AlumniDashboardPage.emptyMessagesDescription' })}
        size="medium"
      />
    </div>
  );

  // ─── Profile Tab ─────────────────────────────────────────────
  const renderProfile = () => (
    <div className={css.tabContent}>
      <h2 className={css.sectionTitle}>
        {intl.formatMessage({ id: 'AlumniDashboardPage.profileTab' })}
      </h2>
      <div className={css.profileCard}>
        <div className={css.profileField}>
          <span className={css.profileLabel}>Name</span>
          <span className={css.profileValue}>{displayName}</span>
        </div>
        {profile?.currentCompany && (
          <div className={css.profileField}>
            <span className={css.profileLabel}>Company</span>
            <span className={css.profileValue}>{profile.currentCompany}</span>
          </div>
        )}
        {profile?.currentRole && (
          <div className={css.profileField}>
            <span className={css.profileLabel}>Role</span>
            <span className={css.profileValue}>{profile.currentRole}</span>
          </div>
        )}
        {profile?.graduationYear && (
          <div className={css.profileField}>
            <span className={css.profileLabel}>Graduation Year</span>
            <span className={css.profileValue}>{profile.graduationYear}</span>
          </div>
        )}
        {institutionDomain && (
          <div className={css.profileField}>
            <span className={css.profileLabel}>Institution</span>
            <span className={css.profileValue}>{institutionDomain}</span>
          </div>
        )}
        <a href="/profile-settings" className={css.editProfileLink}>
          {intl.formatMessage({ id: 'AlumniDashboardPage.editProfile' })}
        </a>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'projects':
        return renderProjects();
      case 'referrals':
        return renderReferrals();
      case 'messages':
        return renderMessages();
      case 'profile':
        return renderProfile();
      default:
        return renderOverview();
    }
  };

  const title = intl.formatMessage({ id: 'AlumniDashboardPage.title' });

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <TopbarContainer />
      <div className={css.root}>
        <div className={css.content}>
          <div className={css.header}>
            <h1 className={css.pageTitle}>{title}</h1>
            {institutionDomain && (
              <span className={css.institutionBadge}>{institutionDomain}</span>
            )}
          </div>

          <div className={css.tabBar}>
            {TABS.map(t => (
              <button
                key={t}
                className={activeTab === t ? css.activeTab : css.tabButton}
                onClick={() => handleTabChange(t)}
              >
                {intl.formatMessage({ id: `AlumniDashboardPage.${t}Tab` })}
              </button>
            ))}
          </div>

          <DashboardErrorBoundary pageName="AlumniDashboard">
          {fetchInProgress ? (
            <div className={css.loadingState}>
              <p>{intl.formatMessage({ id: 'AlumniDashboardPage.loading' })}</p>
            </div>
          ) : fetchError ? (
            <div className={css.errorState}>
              <p>{intl.formatMessage({ id: 'AlumniDashboardPage.loadError' })}</p>
            </div>
          ) : (
            renderTabContent()
          )}
          </DashboardErrorBoundary>
        </div>
      </div>
      <FooterContainer />
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    stats,
    recentActivity,
    institutionDomain,
    profile,
    fetchInProgress,
    fetchError,
  } = state.AlumniDashboardPage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    stats,
    recentActivity,
    institutionDomain,
    profile,
    fetchInProgress,
    fetchError,
  };
};

const AlumniDashboardPage = compose(connect(mapStateToProps))(AlumniDashboardPageComponent);

export default AlumniDashboardPage;