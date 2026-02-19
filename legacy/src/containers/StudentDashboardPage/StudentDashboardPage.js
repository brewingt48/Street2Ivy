import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { apiBaseUrl, transitionTransaction, fetchStudentInvites, acceptStudentInvite, declineStudentInvite } from '../../util/api';
import { createSlug } from '../../util/urlHelpers';
import { types as sdkTypes } from '../../util/sdkLoader';
import classNames from 'classnames';

import { Page, LayoutSingleColumn, NamedLink, Modal, OnboardingChecklist, EmptyState as EmptyStateComponent } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './StudentDashboardPage.module.css';

const { UUID } = sdkTypes;

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

// ================ Stat Detail Modal ================ //

const StatDetailModal = ({ title, items, onClose, renderItem, emptyMessage }) => {
  if (!items) return null;

  return (
    <div className={css.statDetailOverlay} onClick={onClose}>
      <div className={css.statDetailModal} onClick={e => e.stopPropagation()}>
        <div className={css.statDetailHeader}>
          <h3 className={css.statDetailTitle}>{title}</h3>
          <button className={css.statDetailClose} onClick={onClose}>×</button>
        </div>
        <div className={css.statDetailContent}>
          {items.length === 0 ? (
            <p className={css.statDetailEmpty}>{emptyMessage || 'No items to display'}</p>
          ) : (
            <ul className={css.statDetailList}>
              {items.map((item, index) => (
                <li key={item.id || item.transactionId || index} className={css.statDetailItem}>
                  {renderItem(item)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ================ Project Card Component ================ //

const ProjectCard = ({ project, type, onAccept, onDecline }) => {
  const history = useHistory();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [actionError, setActionError] = useState(null);

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

  const handleAccept = async () => {
    if (isAccepting || isDeclining) return;
    setIsAccepting(true);
    setActionError(null);

    try {
      if (onAccept) {
        await onAccept(project);
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
      setActionError('Failed to accept invite. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (isAccepting || isDeclining) return;
    setIsDeclining(true);
    setActionError(null);

    try {
      if (onDecline) {
        await onDecline(project);
      }
    } catch (error) {
      console.error('Failed to decline invite:', error);
      setActionError('Failed to decline invite. Please try again.');
    } finally {
      setIsDeclining(false);
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
      {actionError && (
        <div className={css.actionError}>{actionError}</div>
      )}
      <div className={css.projectActions}>
        {type === 'invite' && (
          <>
            <button
              className={classNames(css.acceptButton, { [css.buttonLoading]: isAccepting })}
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? 'Accepting...' : 'Accept Invite'}
            </button>
            <button
              className={classNames(css.declineButton, { [css.buttonLoading]: isDeclining })}
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? 'Declining...' : 'Decline'}
            </button>
          </>
        )}
        {type === 'active' && (
          <button className={css.viewButton} onClick={handleViewProject}>
            View Project Details
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

// ================ No Projects Warning Modal ================ //

const NoProjectsWarningModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={css.noProjectsOverlay} onClick={onClose}>
      <div className={css.noProjectsModal} onClick={e => e.stopPropagation()}>
        <div className={css.noProjectsModalHeader}>
          <h3 className={css.noProjectsModalTitle}>No Projects Available</h3>
          <button className={css.noProjectsModalClose} onClick={onClose}>x</button>
        </div>
        <div className={css.noProjectsModalBody}>
          <div className={css.noProjectsModalIcon}>📋</div>
          <p className={css.noProjectsModalText}>
            There are no projects posted yet. Corporate partners have not listed any opportunities at this time.
          </p>
          <p className={css.noProjectsModalSubtext}>
            This is normal — new projects are added regularly. Here is what you can do in the meantime:
          </p>
          <ul className={css.noProjectsModalList}>
            <li>Complete your profile so you are ready when projects are posted</li>
            <li>Add your skills and interests to get better matches</li>
            <li>Check back soon — new opportunities are added frequently</li>
          </ul>
        </div>
        <div className={css.noProjectsModalActions}>
          <NamedLink
            name="ProfileSettingsPage"
            className={css.noProjectsModalProfileLink}
          >
            Update Your Profile
          </NamedLink>
          <button className={css.noProjectsModalDismiss} onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

// ================ Browse Projects Panel Component ================ //

const BrowseProjectsPanel = ({ projects, isLoading, onNoBrowseProjects }) => {
  if (isLoading) {
    return <div className={css.loadingState}><span className={css.spinner}></span> Loading projects...</div>;
  }

  const hasProjects = projects && projects.length > 0;

  return (
    <div className={css.browseProjectsPanel}>
      {/* Browse All Projects CTA */}
      <div className={css.browseProjectsCTA}>
        <div className={css.browseProjectsCTAContent}>
          <div className={css.browseProjectsCTAIcon}>🔍</div>
          <div className={css.browseProjectsCTAInfo}>
            <h3 className={css.browseProjectsCTATitle}>Find Your Next Opportunity</h3>
            <p className={css.browseProjectsCTADescription}>
              Search and filter through available projects from corporate partners.
              Find opportunities that match your skills and career goals.
            </p>
          </div>
        </div>
        <div className={css.browseProjectsCTAActions}>
          {hasProjects ? (
            <NamedLink
              name="SearchPageWithListingType"
              params={{ listingType: 'project' }}
              className={css.browseAllButton}
            >
              Browse All Projects
            </NamedLink>
          ) : (
            <button
              className={css.browseAllButton}
              onClick={onNoBrowseProjects}
            >
              Browse All Projects
            </button>
          )}
        </div>
      </div>

      {/* No Projects Notice (inline) */}
      {!hasProjects && (
        <div className={css.noProjectsInlineBanner}>
          <span className={css.noProjectsInlineIcon}>📋</span>
          <div className={css.noProjectsInlineContent}>
            <strong className={css.noProjectsInlineTitle}>No projects posted yet</strong>
            <p className={css.noProjectsInlineText}>
              Corporate partners have not listed any opportunities at this time.
              New projects are added regularly — check back soon!
            </p>
          </div>
        </div>
      )}

      {/* Quick Tips Card */}
      <div className={css.quickTipsCard}>
        <h4 className={css.quickTipsTitle}>Tips for Finding Projects</h4>
        <div className={css.quickTipsList}>
          <div className={css.quickTip}>
            <span className={css.tipIcon}>✅</span>
            <div className={css.tipContent}>
              <strong>Complete Your Profile</strong>
              <p>Make sure your skills and experience are up to date to get matched with relevant projects.</p>
            </div>
          </div>
          <div className={css.quickTip}>
            <span className={css.tipIcon}>🎯</span>
            <div className={css.tipContent}>
              <strong>Use Filters</strong>
              <p>Filter by industry, project type, and compensation to find opportunities that fit your goals.</p>
            </div>
          </div>
          <div className={css.quickTip}>
            <span className={css.tipIcon}>📝</span>
            <div className={css.tipContent}>
              <strong>Personalize Applications</strong>
              <p>Tailor each application to highlight relevant experience and show genuine interest.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================ Message Center Component ================ //

// MessageCenter and MessageDetailModal removed in v53 — messages are now handled via TransactionPage/Inbox

// StudentReviewsPanel removed in v53 — reviews are now handled via TransactionPage/Inbox

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
  const [activeTab, setActiveTab] = useState('browse');
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [institutionInfo, setInstitutionInfo] = useState(null);
  const [isLoadingInstitution, setIsLoadingInstitution] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [statDetailModal, setStatDetailModal] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [showNoProjectsWarning, setShowNoProjectsWarning] = useState(false);

  // State for projects and messages
  const [projects, setProjects] = useState({
    active: [],
    invites: [],
    history: [],
  });
  const [availableProjects, setAvailableProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [hasAppliedToProject, setHasAppliedToProject] = useState(false);
  const [error, setError] = useState(null);

  // Fetch institution info to check AI coaching access
  useEffect(() => {
    const fetchInstitutionInfo = async () => {
      try {
        const baseUrl = apiBaseUrl();
        const response = await fetch(`${baseUrl}/api/institutions/my-institution`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setInstitutionInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch institution info:', err);
        setError('Unable to load your institution information. Some features may be unavailable.');
      } finally {
        setIsLoadingInstitution(false);
      }
    };

    if (currentUser) {
      fetchInstitutionInfo();
    }
  }, [currentUser]);

  // Fetch available project listings to check if any exist
  useEffect(() => {
    const fetchAvailableProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const baseUrl = apiBaseUrl();
        // Query listings API to check if any project listings are available
        const response = await fetch(
          `${baseUrl}/api/listings/query?pub_listingType=project&perPage=1`,
          { credentials: 'include' }
        );
        if (response.ok) {
          const data = await response.json();
          const listings = data.data || [];
          setAvailableProjects(listings);
        } else {
          // If the API call fails, default to empty but do not block the user
          setAvailableProjects([]);
        }
      } catch (err) {
        console.error('Failed to fetch available projects:', err);
        setError('Unable to load available projects. Please try refreshing the page.');
        setAvailableProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchAvailableProjects();
  }, []);

  // Fetch student's transactions (applications/orders) and invites
  useEffect(() => {
    const fetchStudentData = async () => {
      setIsLoading(true);
      try {
        const baseUrl = apiBaseUrl();

        // Fetch transactions and invites in parallel
        const [txResponse, invitesData] = await Promise.all([
          fetch(`${baseUrl}/api/transactions/query?only=order&perPage=50`, {
            credentials: 'include',
          }),
          fetchStudentInvites({ status: 'pending' }).catch(err => {
            console.error('Failed to fetch invites:', err);
            return { data: { invites: [] } };
          }),
        ]);

        // Process transactions
        const active = [];
        const completed = [];

        if (txResponse.ok) {
          const data = await txResponse.json();
          const txList = data.data || [];
          setTransactions(txList);

          txList.forEach(tx => {
            const lastTransition = tx.attributes?.lastTransition || '';
            const projectData = {
              id: tx.id?.uuid || tx.id,
              transactionId: tx.id?.uuid || tx.id,
              title: tx.listing?.attributes?.title || 'Unknown Project',
              companyName: tx.provider?.attributes?.profile?.displayName || 'Unknown Company',
              description: tx.listing?.attributes?.description || '',
              status: lastTransition.includes('accept') ? 'active' :
                      lastTransition.includes('complete') ? 'completed' : 'pending',
              startDate: tx.attributes?.createdAt,
              compensation: tx.listing?.attributes?.publicData?.compensation || '',
            };

            if (lastTransition.includes('complete') || lastTransition.includes('review')) {
              completed.push({ ...projectData, status: 'completed' });
            } else if (lastTransition.includes('accept')) {
              active.push({ ...projectData, status: 'active' });
            } else if (lastTransition.includes('decline')) {
              // Declined applications go to history
              completed.push({ ...projectData, status: 'declined' });
            } else if (
              lastTransition.includes('request-project-application') ||
              lastTransition.includes('inquire') ||
              lastTransition.includes('apply')
            ) {
              active.push({ ...projectData, status: 'pending' });
              setHasAppliedToProject(true);
            }
          });

          setMessages(txList);
        }

        // Process invites from the corporate_invites table
        const rawInvites = invitesData?.data?.invites || invitesData?.invites || [];
        const invites = rawInvites.map(inv => ({
          id: inv.id,
          inviteId: inv.id,
          listingId: inv.listingId,
          title: inv.projectTitle || 'Project Invitation',
          companyName: inv.corporatePartnerId ? 'Company' : 'Unknown Company',
          description: inv.message || '',
          status: 'invited',
          startDate: inv.sentAt,
          compensation: '',
        }));

        setProjects({ active, invites, history: completed });
      } catch (err) {
        console.error('Failed to fetch student data:', err);
        setError('Unable to load your projects and messages. Please try refreshing the page.');
        setProjects({ active: [], invites: [], history: [] });
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchStudentData();
    }
  }, [currentUser]);

  // Handle "Browse Projects" click when no projects are available
  const handleNoProjectsClick = () => {
    setShowNoProjectsWarning(true);
  };

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

  // Handle accepting an invite
  const handleAcceptInvite = async (project) => {
    try {
      const inviteId = project.inviteId || project.id;
      const response = await acceptStudentInvite(inviteId);

      if (response) {
        // Move the project from invites to active
        setProjects(prev => ({
          ...prev,
          invites: prev.invites.filter(p => p.id !== project.id),
          active: [...prev.active, { ...project, status: 'active' }],
        }));
        // Redirect to the listing page so the student can submit their application
        const listingId = response?.data?.listingId || project.listingId;
        if (listingId) {
          const slug = createSlug(project.title || 'project');
          const inviteId = project.inviteId || project.id;
          history.push(`/l/${slug}/${listingId}?invite=${inviteId}`);
        }
      }
    } catch (err) {
      console.error('Failed to accept invite:', err);
      setError('Failed to accept the invite. Please try again.');
      throw err;
    }
  };

  // Handle declining an invite
  const handleDeclineInvite = async (project) => {
    try {
      const inviteId = project.inviteId || project.id;
      await declineStudentInvite(inviteId);

      // Remove the project from invites
      setProjects(prev => ({
        ...prev,
        invites: prev.invites.filter(p => p.id !== project.id),
      }));
    } catch (err) {
      console.error('Failed to decline invite:', err);
      setError('Failed to decline the invite. Please try again.');
      throw err;
    }
  };

  // Render project item in modal
  const renderProjectItem = (project) => {
    const handleClick = () => {
      if (project.transactionId) {
        history.push(`/order/${project.transactionId}/details`);
      }
    };

    return (
      <div
        className={css.statDetailProjectRow}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <div className={css.statDetailProjectInfo}>
          <span className={css.statDetailProjectTitle}>{project.title}</span>
          <span className={css.statDetailProjectCompany}>
            <span className={css.companyIconSmall}>🏢</span>
            {project.companyName}
          </span>
        </div>
        <div className={css.statDetailProjectRight}>
          <span className={classNames(css.statDetailProjectStatus, {
            [css.statusActive]: project.status === 'active',
            [css.statusPending]: project.status === 'pending',
            [css.statusCompleted]: project.status === 'completed',
            [css.statusInvited]: project.status === 'invited',
          })}>
            {project.status}
          </span>
          <span className={css.statDetailArrow}>→</span>
        </div>
      </div>
    );
  };

  // Handle stat card clicks - show detail modal
  const handleStatClick = (modalType) => {
    let modalData = null;

    switch (modalType) {
      case 'activeProjects':
        modalData = {
          title: 'Active Projects',
          items: projects.active,
          renderItem: renderProjectItem,
          emptyMessage: 'You have no active projects. Browse opportunities to find your next project!'
        };
        break;
      case 'invites':
        modalData = {
          title: 'Pending Invites',
          items: projects.invites,
          renderItem: renderProjectItem,
          emptyMessage: 'You have no pending invites. Keep your profile updated to attract corporate partners!'
        };
        break;
      case 'history':
        modalData = {
          title: 'Completed Projects',
          items: projects.history,
          renderItem: renderProjectItem,
          emptyMessage: 'You haven\'t completed any projects yet. Your completed projects will appear here.'
        };
        break;
      case 'messages':
        // For messages, just switch to the messages tab
        setActiveTab('messages');
        return;
      default:
        break;
    }

    setStatDetailModal(modalData);
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

  // Compute onboarding checklist items
  const profilePicture = currentUser?.profileImage?.id;
  const hasSkills = publicData?.skills && publicData.skills.length > 0;
  const hasUniversity = publicData?.university;
  const hasMajor = publicData?.major;
  const hasProfileComplete = profilePicture && hasSkills && hasUniversity && hasMajor;
  const hasCompletedProject = projects.history.length > 0;

  const onboardingItems = [
    {
      id: 'profile',
      label: 'Complete your profile & upload a photo',
      description: 'Add your university, major, bio, and a profile photo so corporate partners can get to know you',
      completed: hasProfileComplete && !!profilePicture,
      link: { name: 'ProfileSettingsPage' },
    },
    {
      id: 'skills',
      label: 'Add your skills & interests',
      description: 'Highlight your expertise and career interests',
      completed: hasSkills,
      link: { name: 'ProfileSettingsPage' },
    },
    {
      id: 'browse-apply',
      label: 'Browse & apply to projects',
      description: 'Search projects by company, use filters to find the right fit, and start your application',
      completed: hasAppliedToProject || totalActiveProjects > 0 || hasCompletedProject,
      link: { name: 'SearchPageWithListingType', params: { listingType: 'project' } },
    },
  ];

  const showOnboarding = !onboardingDismissed && !isLoading;

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.pageContent}>
          {/* Error Banner */}
          {error && (
            <div className={css.errorBanner}>
              <div className={css.errorBannerContent}>
                <span className={css.errorBannerIcon}>!</span>
                <p className={css.errorBannerText}>{error}</p>
              </div>
              <button
                className={css.errorBannerDismiss}
                onClick={() => setError(null)}
                aria-label="Dismiss error"
              >
                &times;
              </button>
            </div>
          )}

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

          {/* Onboarding Checklist */}
          {showOnboarding && (
            <OnboardingChecklist
              title="Get Started with Campus2Career"
              subtitle="Complete these steps to make the most of your experience"
              items={onboardingItems}
              variant="student"
              onDismiss={() => setOnboardingDismissed(true)}
            />
          )}

          {/* Tab Navigation */}
          <div className={css.tabNavigation}>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'browse' })}
              onClick={() => {
                setActiveTab('browse');
                if (!isLoadingProjects && availableProjects.length === 0) {
                  setShowNoProjectsWarning(true);
                }
              }}
              title="Discover available projects from corporate partners and apply"
            >
              <span className={css.tabIcon}>🔍</span>
              Browse Projects
              {availableProjects.length > 0 && (
                <span className={css.tabBadge}>{availableProjects.length}</span>
              )}
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'activeProjects' })}
              onClick={() => setActiveTab('activeProjects')}
              title="View projects you've been accepted to and are currently working on"
            >
              <span className={css.tabIcon}>🚀</span>
              Active Projects
              {projects.active.filter(p => p.status === 'accepted' || p.status === 'in-progress').length > 0 && (
                <span className={css.tabBadge}>{projects.active.filter(p => p.status === 'accepted' || p.status === 'in-progress').length}</span>
              )}
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'projects' })}
              onClick={() => setActiveTab('projects')}
              title="Track the status of all your submitted project applications"
            >
              <span className={css.tabIcon}>📋</span>
              My Applications
              {totalActiveProjects > 0 && (
                <span className={css.tabBadge}>{totalActiveProjects}</span>
              )}
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'invites' })}
              onClick={() => setActiveTab('invites')}
              title="Review invitations from corporate partners who want you on their projects"
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
              title="View your completed projects and past work history"
            >
              <span className={css.tabIcon}>📚</span>
              Completed
            </button>
            <NamedLink name="InboxPage" params={{ tab: 'applications' }} className={css.tabLink} title="View your messages, reviews, and application conversations">
              <span className={css.tabIcon}>💬</span>
              My Inbox
            </NamedLink>
            <NamedLink name="SearchCompaniesPage" className={css.tabLink} title="Find and explore corporate partner profiles">
              <span className={css.tabIcon}>🏢</span>
              Search Companies
            </NamedLink>
          </div>

          {/* Tab Description */}
          <div className={css.tabDescription}>
            {activeTab === 'browse' && 'Discover available projects posted by corporate partners. Use filters to find projects that match your skills and interests, then apply directly.'}
            {activeTab === 'activeProjects' && 'Projects you have been accepted to and are currently working on. Click a project to view details or access the project workspace.'}
            {activeTab === 'projects' && 'Track all your submitted applications. See which are pending review, accepted, or declined by corporate partners.'}
            {activeTab === 'invites' && 'Corporate partners can invite you to apply for their projects. Review invitations here and decide which opportunities interest you.'}
            {activeTab === 'history' && 'Your completed project history. Review past work, feedback received, and build your professional portfolio.'}
          </div>

          {/* Tab Content */}
          <div className={css.tabContent}>
            {/* Browse Projects Tab */}
            {activeTab === 'browse' && (
              <BrowseProjectsPanel
                projects={availableProjects}
                isLoading={isLoadingProjects}
                onNoBrowseProjects={handleNoProjectsClick}
              />
            )}

            {/* Active Projects Tab */}
            {activeTab === 'activeProjects' && (
              <div className={css.projectsSection}>
                {isLoading ? (
                  <div className={css.loadingState}>
                    <span className={css.spinner}></span>
                    Loading active projects...
                  </div>
                ) : projects.active.filter(p => p.status === 'accepted' || p.status === 'in-progress').length > 0 ? (
                  <div className={css.projectsGrid}>
                    {projects.active
                      .filter(p => p.status === 'accepted' || p.status === 'in-progress')
                      .map(project => (
                        <ProjectCard key={project.id} project={project} type="active" />
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="🚀"
                    title="No Active Projects"
                    description="You don't have any active projects yet. Apply to projects or accept invites to get started!"
                    actionLink="SearchPage"
                    actionText="Browse Projects"
                  />
                )}
              </div>
            )}

            {/* My Applications Tab */}
            {activeTab === 'projects' && (
              <div className={css.projectsSection}>
                <div className={css.inboxLinkCard}>
                  <h3 className={css.inboxLinkTitle}>My Applications</h3>
                  <p className={css.inboxLinkDescription}>
                    View your submitted applications, messages with corporate partners, and reviews — all in your Inbox.
                  </p>
                  <NamedLink name="InboxPage" params={{ tab: 'applications' }} className={css.inboxLinkButton}>
                    Open My Inbox →
                  </NamedLink>
                </div>
              </div>
            )}

            {/* Invites Tab */}
            {activeTab === 'invites' && (
              <div className={css.invitesSection}>
                {isLoading ? (
                  <div className={css.loadingState}>
                    <span className={css.spinner}></span>
                    Loading invites...
                  </div>
                ) : projects.invites.length > 0 ? (
                  <div className={css.projectsGrid}>
                    {projects.invites.map(project => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        type="invite"
                        onAccept={handleAcceptInvite}
                        onDecline={handleDeclineInvite}
                      />
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

            {/* Completed Projects Tab */}
            {activeTab === 'history' && (
              <div className={css.historySection}>
                {isLoading ? (
                  <div className={css.loadingState}>
                    <span className={css.spinner}></span>
                    Loading completed projects...
                  </div>
                ) : projects.history.length > 0 ? (
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

            {/* Reviews and Messages tabs removed in v53 — handled via Inbox/TransactionPage */}
          </div>

          {/* AI Coaching Premium Section */}
          {!isLoadingInstitution && (
            <div className={css.aiCoachingSectionWrapper}>
              <div className={css.aiCoachingSection}>
                {institutionInfo?.aiCoachingEnabled ? (
                  // Active AI Coaching Card
                  <div className={css.aiCoachingCard}>
                    {/* Decorative Elements */}
                    <div className={css.aiCoachingDecor}>
                      <div className={css.decorCircle1}></div>
                      <div className={css.decorCircle2}></div>
                      <div className={css.decorGrid}></div>
                    </div>

                    <div className={css.aiCoachingContent}>
                      {/* Left Side - Main Content */}
                      <div className={css.aiCoachingMain}>
                        <div className={css.aiCoachingBadge}>
                          <span className={css.badgeIcon}>✨</span>
                          <span className={css.badgeText}>Premium Feature</span>
                        </div>

                        <div className={css.aiCoachingHeader}>
                          <div className={css.aiCoachingIconWrapper}>
                            <span className={css.aiCoachingIcon}>🤖</span>
                          </div>
                          <div className={css.aiCoachingTitleGroup}>
                            <h2 className={css.aiCoachingTitle}>AI Career Coach</h2>
                            <p className={css.aiCoachingSubtitle}>Powered by Advanced AI</p>
                          </div>
                        </div>

                        <p className={css.aiCoachingDescription}>
                          Get personalized career guidance powered by AI. Practice interviews, refine your resume, explore career paths, and develop professional skills.
                        </p>

                        <div className={css.aiCoachingFeatures}>
                          <div className={css.aiCoachingFeature}>
                            <span className={css.featureIcon}>📝</span>
                            <div className={css.featureContent}>
                              <span className={css.featureTitle}>Resume Review</span>
                              <span className={css.featureDesc}>Get actionable feedback</span>
                            </div>
                          </div>
                          <div className={css.aiCoachingFeature}>
                            <span className={css.featureIcon}>🎯</span>
                            <div className={css.featureContent}>
                              <span className={css.featureTitle}>Interview Prep</span>
                              <span className={css.featureDesc}>Practice with AI</span>
                            </div>
                          </div>
                          <div className={css.aiCoachingFeature}>
                            <span className={css.featureIcon}>🚀</span>
                            <div className={css.featureContent}>
                              <span className={css.featureTitle}>Career Pathing</span>
                              <span className={css.featureDesc}>Explore opportunities</span>
                            </div>
                          </div>
                          <div className={css.aiCoachingFeature}>
                            <span className={css.featureIcon}>💡</span>
                            <div className={css.featureContent}>
                              <span className={css.featureTitle}>Skill Development</span>
                              <span className={css.featureDesc}>Grow your abilities</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Side - CTA */}
                      <div className={css.aiCoachingCTA}>
                        <button className={css.launchCoachingButton} onClick={handleAICoachingClick}>
                          <span className={css.buttonIcon}>✨</span>
                          <span className={css.buttonText}>Start Coaching Session</span>
                        </button>
                        <p className={css.ctaHint}>Unlimited sessions available</p>
                      </div>
                    </div>

                    {/* Confidentiality Notice - Bottom */}
                    <div className={css.confidentialityBanner}>
                      <span className={css.bannerIcon}>⚠️</span>
                      <p className={css.bannerText}>
                        <strong>Confidentiality Notice:</strong> Do not share proprietary, confidential, or trade secret information from any project or company engagement in AI coaching sessions.
                      </p>
                    </div>
                  </div>
                ) : (
                  // Locked AI Coaching Card
                  <div className={classNames(css.aiCoachingCard, css.aiCoachingCardLocked)}>
                    <div className={css.aiCoachingContent}>
                      <div className={css.aiCoachingMain}>
                        <div className={css.aiCoachingHeader}>
                          <div className={css.aiCoachingIconWrapper}>
                            <span className={css.aiCoachingIcon}>🔒</span>
                          </div>
                          <div className={css.aiCoachingTitleGroup}>
                            <h2 className={css.aiCoachingTitle}>AI Career Coaching</h2>
                            <p className={css.aiCoachingSubtitle}>Coming Soon to Your Institution</p>
                          </div>
                        </div>

                        <p className={css.aiCoachingDescription}>
                          AI Career Coaching is available when your institution activates this feature. Encourage your school to partner with Campus2Career to unlock personalized coaching.
                        </p>

                        <div className={css.lockedFeaturesList}>
                          <span className={css.lockedFeature}>📝 Resume Review</span>
                          <span className={css.lockedFeature}>🎯 Interview Prep</span>
                          <span className={css.lockedFeature}>🚀 Career Pathing</span>
                          <span className={css.lockedFeature}>💡 Skill Development</span>
                        </div>
                      </div>

                      <div className={css.aiCoachingCTA}>
                        <a
                          href="mailto:careerservices@university.edu?subject=Request%20AI%20Career%20Coaching%20from%20Campus2Career"
                          className={css.requestAccessButton}
                        >
                          <span>📧</span>
                          Let Your School Know
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

        {/* No Projects Warning Modal */}
        <NoProjectsWarningModal
          isOpen={showNoProjectsWarning}
          onClose={() => setShowNoProjectsWarning(false)}
        />

        {/* AI Coaching Warning Modal */}
        {showCoachingModal && (
          <AICoachingWarningModal
            isOpen={showCoachingModal}
            onClose={() => setShowCoachingModal(false)}
            onConfirm={handleCoachingConfirm}
            coachingUrl={institutionInfo?.aiCoachingUrl}
          />
        )}

        {/* Stat Detail Modal */}
        {statDetailModal && (
          <StatDetailModal
            title={statDetailModal.title}
            items={statDetailModal.items}
            onClose={() => setStatDetailModal(null)}
            renderItem={statDetailModal.renderItem}
            emptyMessage={statDetailModal.emptyMessage}
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
