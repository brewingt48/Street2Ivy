import React from 'react';
import { useIntl, FormattedMessage } from '../../../util/reactIntl';
import { StatCard, ActionCard, GreetingHeader, EmptyState, NamedLink, RecommendedProjects } from '../../../components';

import css from './AuthenticatedHome.module.css';

// Pipeline steps for the application status tracker
const PIPELINE_STEPS = [
  { id: 'applied', label: 'Applied' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'handed-off', label: 'Handed Off' },
  { id: 'completed', label: 'Completed' },
  { id: 'reviewed', label: 'Reviewed' },
];

const TERMINAL_STATES = ['declined', 'withdrawn', 'cancelled'];

const STEP_INDEX = { applied: 0, accepted: 1, 'handed-off': 2, completed: 3, reviewed: 4 };

const STATE_LABELS = {
  applied: 'Pending Review',
  accepted: 'Accepted',
  'handed-off': 'In Progress',
  completed: 'Completed',
  reviewed: 'Reviewed',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  cancelled: 'Cancelled',
};

const STATE_COLORS = {
  applied: 'amber',
  accepted: 'teal',
  'handed-off': 'emerald',
  completed: 'navy',
  reviewed: 'teal',
  declined: 'coral',
  withdrawn: 'slate',
  cancelled: 'coral',
};

const ApplicationCard = ({ app, intl }) => {
  const isTerminal = TERMINAL_STATES.includes(app.state);
  const currentStepIndex = STEP_INDEX[app.state] ?? 0;
  const color = STATE_COLORS[app.state] || 'slate';
  const stateLabel = STATE_LABELS[app.state] || app.state;

  const timeAgo = app.lastTransitionedAt
    ? intl.formatRelativeTime(
        Math.round((new Date(app.lastTransitionedAt) - Date.now()) / (1000 * 60 * 60 * 24)),
        'day'
      )
    : '';

  return (
    <div className={css.appCard}>
      <div className={css.appCardHeader}>
        <div className={css.appCardInfo}>
          <h4 className={css.appCardTitle}>{app.projectTitle}</h4>
          <p className={css.appCardCompany}>{app.companyName}</p>
        </div>
        <span className={`${css.appCardBadge} ${css[`appCardBadge_${color}`] || ''}`}>
          {stateLabel}
        </span>
      </div>

      {/* Pipeline visualization */}
      {!isTerminal ? (
        <div className={css.pipeline}>
          <div className={css.pipelineTrack}>
            <div
              className={css.pipelineFill}
              style={{ width: `${(currentStepIndex / (PIPELINE_STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <div className={css.pipelineSteps}>
            {PIPELINE_STEPS.map((step, i) => {
              const isDone = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step.id} className={css.pipelineStep}>
                  <div
                    className={`${css.pipelineDot} ${
                      isDone ? css.pipelineDotDone : isCurrent ? css.pipelineDotCurrent : css.pipelineDotUpcoming
                    }`}
                  >
                    {isDone ? '\u2713' : ''}
                  </div>
                  <span
                    className={`${css.pipelineLabel} ${
                      isCurrent || isDone ? css.pipelineLabelActive : ''
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={css.terminalState}>
          <span className={css.terminalIcon}>
            {app.state === 'declined' ? '\u2715' : app.state === 'withdrawn' ? '\u21A9' : '\u2298'}
          </span>
          <span className={css.terminalText}>
            {stateLabel} {timeAgo ? `\u00B7 ${timeAgo}` : ''}
          </span>
        </div>
      )}

      {/* Footer with time and action */}
      <div className={css.appCardFooter}>
        {timeAgo && <span className={css.appCardTime}>{timeAgo}</span>}
        <NamedLink
          className={css.appCardLink}
          name="InboxPage"
          params={{ tab: 'orders' }}
        >
          <FormattedMessage id="LandingPage.home.student.viewDetails" defaultMessage="View Details" />
        </NamedLink>
      </div>
    </div>
  );
};

const StudentHome = props => {
  const { currentUser, firstName, data, loading, coachingConfig, institutionInfo, isLoadingInstitution } = props;
  const intl = useIntl();

  const profileCompletion = data?.profileCompletion || 0;
  const applications = data?.applications || [];
  const recommendedListings = data?.recommendedListings || [];

  // AI Coaching access logic
  const canAccessCoaching = institutionInfo?.aiCoachingEnabled && institutionInfo?.aiCoachingUrl;
  const coachingUrl = canAccessCoaching
    ? institutionInfo.aiCoachingUrl
    : coachingConfig?.platformUrl;
  const coachingName = coachingConfig?.platformName || 'AI Career Coach';

  // Separate active and terminal applications
  const activeApps = applications.filter(a => !TERMINAL_STATES.includes(a.state));
  const terminalApps = applications.filter(a => TERMINAL_STATES.includes(a.state));

  return (
    <div className={css.homeContainer}>
      {/* Greeting */}
      <GreetingHeader
        firstName={firstName}
        subtitle={intl.formatMessage({ id: 'LandingPage.home.student.subtitle' })}
      />

      {/* Stats */}
      <div className={css.statsGrid}>
        <StatCard
          icon="📝"
          value={data?.applicationsCount || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.student.stat.applications' })}
          colorScheme="teal"
          animationDelay={0}
        />
        <StatCard
          icon="🚀"
          value={data?.activeProjectsCount || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.student.stat.activeProjects' })}
          colorScheme="emerald"
          animationDelay={50}
        />
        <StatCard
          icon="👤"
          value={`${profileCompletion}%`}
          label={intl.formatMessage({ id: 'LandingPage.home.student.stat.profileCompletion' })}
          colorScheme="amber"
          animationDelay={100}
        />
        <StatCard
          icon="🤖"
          value={data?.coachSessions || 0}
          label={intl.formatMessage({ id: 'LandingPage.home.student.stat.coachSessions' })}
          colorScheme="navy"
          animationDelay={150}
        />
      </div>

      {/* Application Pipeline - show when there are applications */}
      {applications.length > 0 && (
        <div className={css.contentSection}>
          <div className={css.sectionHeader}>
            <h3 className={css.sectionTitle}>
              <FormattedMessage
                id="LandingPage.home.student.section.applicationPipeline"
                defaultMessage="Application Pipeline"
              />
            </h3>
            <NamedLink
              name="InboxPage"
              params={{ tab: 'orders' }}
              className={css.sectionLink}
            >
              <FormattedMessage
                id="LandingPage.home.student.viewAll"
                defaultMessage="View All"
              />
            </NamedLink>
          </div>

          <div className={css.appCardList}>
            {activeApps.map(app => (
              <ApplicationCard key={app.id} app={app} intl={intl} />
            ))}
            {terminalApps.slice(0, 3).map(app => (
              <ApplicationCard key={app.id} app={app} intl={intl} />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Projects */}
      {(recommendedListings.length > 0 || loading) && (
        <div className={css.contentSection}>
          <div className={css.sectionHeader}>
            <h3 className={css.sectionTitle}>
              <FormattedMessage
                id="LandingPage.home.student.section.recommended"
                defaultMessage="Recommended For You"
              />
            </h3>
            <NamedLink name="SearchPage" className={css.sectionLink}>
              <FormattedMessage
                id="LandingPage.home.student.viewAll"
                defaultMessage="View All"
              />
            </NamedLink>
          </div>
          <RecommendedProjects
            currentUser={currentUser}
            listings={recommendedListings}
            isLoading={loading}
            maxItems={4}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className={css.actionsGrid}>
        <ActionCard
          icon="🔍"
          title={intl.formatMessage({ id: 'LandingPage.home.student.action.browseProjects' })}
          description={intl.formatMessage({ id: 'LandingPage.home.student.action.browseProjectsDesc' })}
          linkProps={{ name: 'SearchPage' }}
          colorScheme="teal"
          animationDelay={0}
        />
        <ActionCard
          icon="✏️"
          title={intl.formatMessage({ id: 'LandingPage.home.student.action.updateProfile' })}
          description={intl.formatMessage({ id: 'LandingPage.home.student.action.updateProfileDesc' })}
          linkProps={{ name: 'ProfileSettingsPage' }}
          colorScheme="amber"
          animationDelay={50}
        />
        <ActionCard
          icon="💬"
          title={intl.formatMessage({ id: 'LandingPage.home.student.action.messages' })}
          description={intl.formatMessage({ id: 'LandingPage.home.student.action.messagesDesc' })}
          linkProps={{ name: 'InboxPage', params: { tab: 'orders' } }}
          colorScheme="emerald"
          animationDelay={100}
        />
        <ActionCard
          icon="🏢"
          title={intl.formatMessage({ id: 'LandingPage.home.student.action.findCompanies' })}
          description={intl.formatMessage({ id: 'LandingPage.home.student.action.findCompaniesDesc' })}
          linkProps={{ name: 'SearchCompaniesPage' }}
          colorScheme="navy"
          animationDelay={150}
        />
      </div>

      {/* AI Career Coaching Card */}
      {!isLoadingInstitution && (
        <div className={css.contentSection}>
          <div className={css.sectionHeader}>
            <h3 className={css.sectionTitle}>
              <FormattedMessage
                id="LandingPage.home.student.section.aiCoaching"
                defaultMessage="AI Career Coaching"
              />
            </h3>
          </div>
          {canAccessCoaching ? (
            <div className={css.coachingCard}>
              <div className={css.coachingCardGlow} />
              <div className={css.coachingCardContent}>
                <div className={css.coachingCardIcon}>
                  <span role="img" aria-label="robot">&#x1F916;</span>
                </div>
                <div className={css.coachingCardText}>
                  <h4 className={css.coachingCardTitle}>
                    <FormattedMessage
                      id="LandingPage.home.student.coaching.title"
                      defaultMessage="{name} is Ready"
                      values={{ name: coachingName }}
                    />
                  </h4>
                  <p className={css.coachingCardDescription}>
                    <FormattedMessage
                      id="LandingPage.home.student.coaching.description"
                      defaultMessage="Get personalized help with resumes, interview prep, career strategy, and more — available 24/7."
                    />
                  </p>
                  {coachingConfig?.confidentialityWarning && (
                    <p className={css.coachingCardDisclaimer}>
                      {coachingConfig.confidentialityWarning}
                    </p>
                  )}
                </div>
                <a
                  href={coachingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css.coachingCardButton}
                >
                  <FormattedMessage
                    id="LandingPage.home.student.coaching.launch"
                    defaultMessage="Launch AI Coach"
                  />
                  <span className={css.coachingCardButtonArrow}>&rarr;</span>
                </a>
              </div>
              <div className={css.coachingCardFeatures}>
                <div className={css.coachingFeature}>
                  <span className={css.coachingFeatureIcon}>&#x1F4DD;</span>
                  <span>
                    <FormattedMessage
                      id="LandingPage.home.student.coaching.feature.resume"
                      defaultMessage="Resume Review"
                    />
                  </span>
                </div>
                <div className={css.coachingFeature}>
                  <span className={css.coachingFeatureIcon}>&#x1F3A4;</span>
                  <span>
                    <FormattedMessage
                      id="LandingPage.home.student.coaching.feature.interview"
                      defaultMessage="Interview Prep"
                    />
                  </span>
                </div>
                <div className={css.coachingFeature}>
                  <span className={css.coachingFeatureIcon}>&#x1F5FA;&#xFE0F;</span>
                  <span>
                    <FormattedMessage
                      id="LandingPage.home.student.coaching.feature.career"
                      defaultMessage="Career Planning"
                    />
                  </span>
                </div>
                <div className={css.coachingFeature}>
                  <span className={css.coachingFeatureIcon}>&#x1F4A1;</span>
                  <span>
                    <FormattedMessage
                      id="LandingPage.home.student.coaching.feature.strategy"
                      defaultMessage="Job Strategy"
                    />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={css.coachingCardLocked}>
              <div className={css.coachingCardLockedIcon}>
                <span role="img" aria-label="locked">&#x1F512;</span>
              </div>
              <div className={css.coachingCardLockedContent}>
                <h4 className={css.coachingCardLockedTitle}>
                  <FormattedMessage
                    id="LandingPage.home.student.coaching.locked.title"
                    defaultMessage="AI Career Coaching Coming Soon"
                  />
                </h4>
                <p className={css.coachingCardLockedDescription}>
                  <FormattedMessage
                    id="LandingPage.home.student.coaching.locked.description"
                    defaultMessage="AI-powered career coaching will be available when your institution enables this feature. Contact your career services office for more information."
                  />
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Completion Card */}
      {profileCompletion < 100 && (
        <div className={css.contentSection}>
          <h3 className={css.sectionTitle}>
            {intl.formatMessage({ id: 'LandingPage.home.student.section.profileCompletion' })}
          </h3>
          <div className={css.profileCard}>
            <div className={css.profileCardContent}>
              <h4 className={css.profileCardTitle}>
                {intl.formatMessage({ id: 'LandingPage.home.student.section.completeProfile' })}
              </h4>
              <div className={css.progressBarWrapper}>
                <div className={css.progressBar}>
                  <div
                    className={css.progressBarFill}
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <div className={css.progressLabel}>{profileCompletion}%</div>
              </div>
            </div>
            <NamedLink name="ProfileSettingsPage" className={css.sectionLink}>
              Complete Profile &rarr;
            </NamedLink>
          </div>
        </div>
      )}

      {/* Get Started / Recommended Section - only show if no applications */}
      {applications.length === 0 && (
        <div className={css.contentSection}>
          <EmptyState
            icon="🎓"
            title={intl.formatMessage({ id: 'LandingPage.home.student.section.getStarted' })}
            description={intl.formatMessage({ id: 'LandingPage.home.student.section.getStartedDesc' })}
            primaryAction={{
              label: intl.formatMessage({ id: 'LandingPage.home.student.action.browseProjects' }),
              link: { name: 'SearchPage' },
            }}
            size="large"
            variant="muted"
          />
        </div>
      )}
    </div>
  );
};

export default StudentHome;
