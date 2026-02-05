import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import classNames from 'classnames';

import { Page, LayoutSingleColumn, NamedLink, Modal } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './StudentDashboardPage.module.css';

// ================ AI Coaching Warning Modal ================ //

const AICoachingWarningModal = ({ isOpen, onClose, onConfirm, coachingUrl }) => {
  const [isOver18, setIsOver18] = useState(false);
  const [acknowledgesConfidentiality, setAcknowledgesConfidentiality] = useState(false);

  const handleConfirm = () => {
    if (isOver18 && acknowledgesConfidentiality) {
      onConfirm(coachingUrl);
      onClose();
    }
  };

  const canProceed = isOver18 && acknowledgesConfidentiality;

  return (
    <Modal
      id="AICoachingWarningModal"
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={() => {}}
      usePortal
    >
      <div className={css.warningModal}>
        <div className={css.warningIcon}>⚠️</div>
        <h2 className={css.warningTitle}>AI Career Coaching Platform</h2>
        <p className={css.warningSubtitle}>Please read and acknowledge the following before proceeding:</p>

        <div className={css.warningContent}>
          <div className={css.warningSection}>
            <h3>Important Notice</h3>
            <p>
              You are about to access the AI Career Coaching platform. Before proceeding,
              you must certify the following:
            </p>
          </div>

          <div className={css.checkboxSection}>
            <label className={css.checkboxLabel}>
              <input
                type="checkbox"
                checked={isOver18}
                onChange={(e) => setIsOver18(e.target.checked)}
                className={css.checkbox}
              />
              <span className={css.checkboxText}>
                <strong>I certify that I am 18 years of age or older.</strong>
              </span>
            </label>
          </div>

          <div className={css.checkboxSection}>
            <label className={css.checkboxLabel}>
              <input
                type="checkbox"
                checked={acknowledgesConfidentiality}
                onChange={(e) => setAcknowledgesConfidentiality(e.target.checked)}
                className={css.checkbox}
              />
              <span className={css.checkboxText}>
                <strong>I understand and agree that:</strong>
                <ul className={css.warningList}>
                  <li>Uploading, mentioning, or inputting any confidential information into the AI coaching platform is <strong>strictly prohibited</strong>.</li>
                  <li>This includes but is not limited to: proprietary company information, NDAs, trade secrets, personal identifying information of others, or any sensitive project details.</li>
                  <li>I will only share general career advice questions and publicly available information.</li>
                  <li>Violation of these terms may result in suspension of my account.</li>
                </ul>
              </span>
            </label>
          </div>
        </div>

        <div className={css.warningActions}>
          <button className={css.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            className={classNames(css.confirmButton, { [css.confirmButtonDisabled]: !canProceed })}
            onClick={handleConfirm}
            disabled={!canProceed}
          >
            I Understand & Agree - Proceed to AI Coaching
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ================ Project Card Component ================ //

const ProjectCard = ({ project, type }) => {
  const history = useHistory();

  const getStatusBadge = () => {
    switch (project.status) {
      case 'active':
        return <span className={classNames(css.statusBadge, css.statusActive)}>Active</span>;
      case 'pending':
        return <span className={classNames(css.statusBadge, css.statusPending)}>Pending</span>;
      case 'completed':
        return <span className={classNames(css.statusBadge, css.statusCompleted)}>Completed</span>;
      case 'invited':
        return <span className={classNames(css.statusBadge, css.statusInvited)}>Invited</span>;
      default:
        return null;
    }
  };

  const handleViewProject = () => {
    if (project.transactionId) {
      history.push(`/project-workspace/${project.transactionId}`);
    }
  };

  return (
    <div className={css.projectCard}>
      <div className={css.projectHeader}>
        <h3 className={css.projectTitle}>{project.title}</h3>
        {getStatusBadge()}
      </div>
      <div className={css.projectCompany}>
        <span className={css.companyIcon}>🏢</span>
        {project.companyName}
      </div>
      {project.description && (
        <p className={css.projectDescription}>{project.description}</p>
      )}
      <div className={css.projectMeta}>
        {project.startDate && (
          <span className={css.metaItem}>
            <span className={css.metaIcon}>📅</span>
            {new Date(project.startDate).toLocaleDateString()}
          </span>
        )}
        {project.compensation && (
          <span className={css.metaItem}>
            <span className={css.metaIcon}>💰</span>
            {project.compensation}
          </span>
        )}
      </div>
      <div className={css.projectActions}>
        {type === 'invite' && (
          <>
            <button className={css.acceptButton}>Accept Invite</button>
            <button className={css.declineButton}>Decline</button>
          </>
        )}
        {type === 'active' && (
          <button className={css.viewButton} onClick={handleViewProject}>
            View Project Workspace
          </button>
        )}
        {type === 'history' && (
          <button className={css.viewButton} onClick={handleViewProject}>
            View Details
          </button>
        )}
      </div>
    </div>
  );
};

// ================ Message Card Component ================ //

const MessageCard = ({ message }) => {
  const isUnread = !message.read;

  return (
    <div className={classNames(css.messageCard, { [css.messageUnread]: isUnread })}>
      <div className={css.messageHeader}>
        <div className={css.messageSender}>
          <div className={css.senderAvatar}>
            {message.senderInitials || message.senderName?.charAt(0) || '?'}
          </div>
          <div className={css.senderInfo}>
            <span className={css.senderName}>{message.senderName}</span>
            <span className={css.senderCompany}>{message.companyName}</span>
          </div>
        </div>
        <span className={css.messageDate}>
          {new Date(message.createdAt).toLocaleDateString()}
        </span>
      </div>
      <div className={css.messageContent}>
        <p className={css.messagePreview}>{message.preview}</p>
      </div>
      <div className={css.messageActions}>
        <NamedLink
          name="OrderDetailsPage"
          params={{ id: message.transactionId }}
          className={css.viewMessageLink}
        >
          View Full Message
        </NamedLink>
        {isUnread && <span className={css.unreadBadge}>New</span>}
      </div>
    </div>
  );
};

// ================ Empty State Component ================ //

const EmptyState = ({ icon, title, description, action, actionLink, actionText }) => (
  <div className={css.emptyState}>
    <span className={css.emptyIcon}>{icon}</span>
    <h3 className={css.emptyTitle}>{title}</h3>
    <p className={css.emptyDescription}>{description}</p>
    {action && actionLink && actionText && (
      <NamedLink name={actionLink} className={css.emptyAction}>
        {actionText}
      </NamedLink>
    )}
  </div>
);

// ================ Main Component ================ //

const StudentDashboardPageComponent = props => {
  const {
    scrollingDisabled,
    currentUser,
  } = props;

  const intl = useIntl();
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('projects');
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [institutionInfo, setInstitutionInfo] = useState(null);
  const [isLoadingInstitution, setIsLoadingInstitution] = useState(true);

  // Mock data - in production, this would come from API
  const [projects, setProjects] = useState({
    active: [],
    invites: [],
    history: [],
  });
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch institution info to check AI coaching access
  useEffect(() => {
    const fetchInstitutionInfo = async () => {
      try {
        const response = await fetch('/api/institutions/my-institution', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setInstitutionInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch institution info:', error);
      } finally {
        setIsLoadingInstitution(false);
      }
    };

    if (currentUser) {
      fetchInstitutionInfo();
    }
  }, [currentUser]);

  // Fetch student's projects and messages
  useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoading(true);
      try {
        // In production, these would be real API calls
        // For now, using mock data structure

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data - replace with actual API calls
        setProjects({
          active: [
            // {
            //   id: '1',
            //   transactionId: 'tx-123',
            //   title: 'Market Research Project',
            //   companyName: 'Acme Corp',
            //   description: 'Conduct comprehensive market analysis...',
            //   status: 'active',
            //   startDate: '2024-01-15',
            //   compensation: '$2,500',
            // },
          ],
          invites: [
            // {
            //   id: '2',
            //   transactionId: 'tx-456',
            //   title: 'Data Analysis Internship',
            //   companyName: 'TechStart Inc',
            //   description: 'Join our team for a summer data analysis project...',
            //   status: 'invited',
            //   compensation: '$3,000',
            // },
          ],
          history: [
            // {
            //   id: '3',
            //   transactionId: 'tx-789',
            //   title: 'Brand Strategy Consultation',
            //   companyName: 'Global Brands LLC',
            //   description: 'Completed brand positioning project...',
            //   status: 'completed',
            //   startDate: '2023-09-01',
            //   compensation: '$1,800',
            // },
          ],
        });

        setMessages([
          // {
          //   id: 'm1',
          //   transactionId: 'tx-123',
          //   senderName: 'John Smith',
          //   senderInitials: 'JS',
          //   companyName: 'Acme Corp',
          //   preview: 'Hi! I wanted to follow up on your project submission...',
          //   createdAt: '2024-01-20T10:30:00Z',
          //   read: false,
          // },
        ]);
      } catch (error) {
        console.error('Failed to fetch student data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchStudentData();
    }
  }, [currentUser]);

  // Handle AI coaching access
  const handleAICoachingClick = () => {
    if (institutionInfo?.aiCoachingEnabled && institutionInfo?.aiCoachingUrl) {
      setShowCoachingModal(true);
    }
  };

  const handleCoachingConfirm = (url) => {
    // Open coaching platform in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const isStudent = publicData?.userType === 'student';
  const userName = currentUser?.attributes?.profile?.firstName || 'Student';

  const title = intl.formatMessage({ id: 'StudentDashboardPage.title' });

  // Access control
  if (currentUser && !isStudent) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.noAccess}>
            <h1>Access Denied</h1>
            <p>This dashboard is only available for students.</p>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  const totalActiveProjects = projects.active.length;
  const totalInvites = projects.invites.length;
  const unreadMessages = messages.filter(m => !m.read).length;

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.pageContent}>
          {/* Header Section */}
          <div className={css.header}>
            <div className={css.headerContent}>
              <h1 className={css.greeting}>
                Welcome back, {userName}! 👋
              </h1>
              <p className={css.subtitle}>
                Manage your projects, respond to invites, and connect with corporate partners.
              </p>
            </div>

            {/* AI Coaching Button */}
            {!isLoadingInstitution && institutionInfo?.aiCoachingEnabled && (
              <button
                className={css.aiCoachingButton}
                onClick={handleAICoachingClick}
              >
                <span className={css.aiIcon}>🤖</span>
                AI Career Coaching
              </button>
            )}
          </div>

          {/* Stats Cards */}
          <div className={css.statsGrid}>
            <div className={css.statCard}>
              <span className={css.statIcon}>📋</span>
              <div className={css.statContent}>
                <span className={css.statValue}>{totalActiveProjects}</span>
                <span className={css.statLabel}>Active Projects</span>
              </div>
            </div>
            <div className={css.statCard}>
              <span className={css.statIcon}>✉️</span>
              <div className={css.statContent}>
                <span className={css.statValue}>{totalInvites}</span>
                <span className={css.statLabel}>Pending Invites</span>
              </div>
            </div>
            <div className={css.statCard}>
              <span className={css.statIcon}>💬</span>
              <div className={css.statContent}>
                <span className={css.statValue}>{unreadMessages}</span>
                <span className={css.statLabel}>Unread Messages</span>
              </div>
            </div>
            <div className={css.statCard}>
              <span className={css.statIcon}>🏆</span>
              <div className={css.statContent}>
                <span className={css.statValue}>{projects.history.length}</span>
                <span className={css.statLabel}>Completed Projects</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={css.tabNavigation}>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'projects' })}
              onClick={() => setActiveTab('projects')}
            >
              <span className={css.tabIcon}>📋</span>
              Current Projects
              {totalActiveProjects > 0 && (
                <span className={css.tabBadge}>{totalActiveProjects}</span>
              )}
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'invites' })}
              onClick={() => setActiveTab('invites')}
            >
              <span className={css.tabIcon}>🎯</span>
              Invites
              {totalInvites > 0 && (
                <span className={css.tabBadge}>{totalInvites}</span>
              )}
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'history' })}
              onClick={() => setActiveTab('history')}
            >
              <span className={css.tabIcon}>📚</span>
              Project History
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'messages' })}
              onClick={() => setActiveTab('messages')}
            >
              <span className={css.tabIcon}>💬</span>
              Messages
              {unreadMessages > 0 && (
                <span className={css.tabBadge}>{unreadMessages}</span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className={css.tabContent}>
            {isLoading ? (
              <div className={css.loadingState}>
                <span className={css.spinner}></span>
                Loading your dashboard...
              </div>
            ) : (
              <>
                {/* Current Projects Tab */}
                {activeTab === 'projects' && (
                  <div className={css.projectsSection}>
                    {projects.active.length > 0 ? (
                      <div className={css.projectsGrid}>
                        {projects.active.map(project => (
                          <ProjectCard key={project.id} project={project} type="active" />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon="📋"
                        title="No Active Projects"
                        description="You don't have any active projects yet. Browse opportunities or wait for invitations from corporate partners."
                        actionLink="SearchPage"
                        actionText="Browse Opportunities"
                      />
                    )}
                  </div>
                )}

                {/* Invites Tab */}
                {activeTab === 'invites' && (
                  <div className={css.invitesSection}>
                    {projects.invites.length > 0 ? (
                      <div className={css.projectsGrid}>
                        {projects.invites.map(project => (
                          <ProjectCard key={project.id} project={project} type="invite" />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon="🎯"
                        title="No Pending Invites"
                        description="You don't have any pending invitations. Make sure your profile is complete to attract corporate partners!"
                        actionLink="ProfileSettingsPage"
                        actionText="Update Your Profile"
                      />
                    )}
                  </div>
                )}

                {/* Project History Tab */}
                {activeTab === 'history' && (
                  <div className={css.historySection}>
                    {projects.history.length > 0 ? (
                      <div className={css.projectsGrid}>
                        {projects.history.map(project => (
                          <ProjectCard key={project.id} project={project} type="history" />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon="📚"
                        title="No Project History"
                        description="You haven't completed any projects yet. Once you finish your first project, it will appear here."
                      />
                    )}
                  </div>
                )}

                {/* Messages Tab */}
                {activeTab === 'messages' && (
                  <div className={css.messagesSection}>
                    {messages.length > 0 ? (
                      <div className={css.messagesList}>
                        {messages.map(message => (
                          <MessageCard key={message.id} message={message} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon="💬"
                        title="No Messages"
                        description="You don't have any messages yet. Messages from corporate partners will appear here."
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* AI Coaching Banner (if available but not yet used) */}
          {!isLoadingInstitution && institutionInfo?.aiCoachingEnabled && (
            <div className={css.coachingBanner}>
              <div className={css.bannerContent}>
                <span className={css.bannerIcon}>🤖</span>
                <div className={css.bannerText}>
                  <h3>AI Career Coaching Available</h3>
                  <p>Your institution provides access to our AI-powered career coaching platform. Get personalized guidance on interviews, resumes, and career strategies.</p>
                </div>
              </div>
              <button className={css.bannerButton} onClick={handleAICoachingClick}>
                Start Coaching Session
              </button>
            </div>
          )}

          {/* Institution Not Active Warning */}
          {!isLoadingInstitution && institutionInfo && !institutionInfo.isMember && (
            <div className={css.warningBanner}>
              <span className={css.warningBannerIcon}>⚠️</span>
              <div className={css.warningBannerText}>
                <h3>Limited Access</h3>
                <p>Your institution's membership is currently not active. Some features may be limited. Please contact your school administrator for more information.</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Coaching Warning Modal */}
        {showCoachingModal && (
          <AICoachingWarningModal
            isOpen={showCoachingModal}
            onClose={() => setShowCoachingModal(false)}
            onConfirm={handleCoachingConfirm}
            coachingUrl={institutionInfo?.aiCoachingUrl}
          />
        )}
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
  };
};

const StudentDashboardPage = compose(
  connect(mapStateToProps)
)(StudentDashboardPageComponent);

export default StudentDashboardPage;
