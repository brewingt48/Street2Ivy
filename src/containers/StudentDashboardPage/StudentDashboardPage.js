import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { apiBaseUrl, transitionTransaction } from '../../util/api';
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

// ================ Browse Projects Panel Component ================ //

const BrowseProjectsPanel = ({ projects, isLoading }) => {
  if (isLoading) {
    return <div className={css.loadingState}><span className={css.spinner}></span> Loading projects...</div>;
  }

  return (
    <div className={css.browseProjectsPanel}>
      {/* Browse Projects CTA Card */}
      <div className={css.browseProjectsCTA}>
        <div className={css.browseProjectsCTAContent}>
          <div className={css.browseProjectsCTAIcon}>🔍</div>
          <div className={css.browseProjectsCTAInfo}>
            <h3 className={css.browseProjectsCTATitle}>Find Your Next Opportunity</h3>
            <p className={css.browseProjectsCTADescription}>
              Explore available projects from top corporate partners. Search by industry,
              filter by skills, and find the perfect match for your interests and experience.
            </p>
            <div className={css.browseProjectsCTAFeatures}>
              <span className={css.featureItem}>🏢 Top Companies</span>
              <span className={css.featureItem}>💼 Real Projects</span>
              <span className={css.featureItem}>🎯 Skill Matching</span>
              <span className={css.featureItem}>💰 Paid Opportunities</span>
            </div>
          </div>
        </div>
        <div className={css.browseProjectsCTAActions}>
          <NamedLink name="SearchPage" className={css.browseAllButton}>
            <span>🔍</span>
            Browse All Projects
          </NamedLink>
        </div>
      </div>

      {/* Quick Tips Card */}
      <div className={css.quickTipsCard}>
        <h4 className={css.quickTipsTitle}>💡 Tips for Finding Projects</h4>
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

      {/* Quick Links */}
      <div className={css.quickLinksGrid}>
        <NamedLink name="ProfileSettingsPage" className={css.quickLinkCard}>
          <span className={css.quickLinkIcon}>👤</span>
          <span className={css.quickLinkText}>Update Profile</span>
          <span className={css.quickLinkArrow}>→</span>
        </NamedLink>
        <NamedLink name="SearchCompaniesPage" className={css.quickLinkCard}>
          <span className={css.quickLinkIcon}>🏢</span>
          <span className={css.quickLinkText}>View Companies</span>
          <span className={css.quickLinkArrow}>→</span>
        </NamedLink>
        <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.quickLinkCard}>
          <span className={css.quickLinkIcon}>📬</span>
          <span className={css.quickLinkText}>My Messages</span>
          <span className={css.quickLinkArrow}>→</span>
        </NamedLink>
      </div>
    </div>
  );
};

// ================ Messages Panel Component (Corporate Style) ================ //

const MessagesPanel = ({ transactions, isLoading, onSelectMessage }) => {
  const formatDate = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTransactionStatus = tx => {
    const lastTransition = tx.attributes?.lastTransition;
    const statusMap = {
      'transition/inquire': 'Inquiry',
      'transition/request-project-application': 'Applied',
      'transition/accept': 'Accepted',
      'transition/decline': 'Declined',
      'transition/complete': 'Completed',
      'transition/review-1-by-provider': 'Reviewed',
      'transition/review-1-by-customer': 'Reviewed',
      'transition/review-2-by-provider': 'Reviewed',
      'transition/review-2-by-customer': 'Reviewed',
    };
    return statusMap[lastTransition] || lastTransition?.replace('transition/', '').replace(/-/g, ' ') || 'Pending';
  };

  if (isLoading) {
    return <div className={css.noMessages}>Loading messages...</div>;
  }

  if (!transactions || transactions.length === 0) {
    return null;
  }

  return (
    <div className={css.emailList}>
      <table className={css.emailTable}>
        <thead>
          <tr>
            <th className={css.emailTableHeader}>From</th>
            <th className={css.emailTableHeader}>Project</th>
            <th className={css.emailTableHeader}>Status</th>
            <th className={css.emailTableHeader}>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => {
            const providerName = tx.provider?.attributes?.profile?.displayName || 'Unknown Company';
            const listingTitle = tx.listing?.attributes?.title || 'Unknown Project';
            const status = getTransactionStatus(tx);
            const lastUpdated = tx.attributes?.lastTransitionedAt;

            return (
              <tr
                key={tx.id?.uuid || tx.id}
                className={css.emailRow}
                onClick={() => onSelectMessage({ ...tx, providerName, listingTitle, status })}
              >
                <td className={css.emailFrom}>{providerName}</td>
                <td className={css.emailSubject}>{listingTitle}</td>
                <td className={css.emailStatus}>
                  <span className={classNames(css.statusBadgeSmall, {
                    [css.statusBadgeAccepted]: status === 'Accepted',
                    [css.statusBadgeDeclined]: status === 'Declined',
                    [css.statusBadgePending]: status === 'Applied' || status === 'Inquiry' || status === 'Pending',
                    [css.statusBadgeCompleted]: status === 'Completed',
                  })}>
                    {status}
                  </span>
                </td>
                <td className={css.emailDate}>{formatDate(lastUpdated)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ================ Message Detail Modal ================ //

const MessageDetailModal = ({ message, onClose }) => {
  if (!message) return null;

  const formatFullDate = dateString => {
    return new Date(dateString).toLocaleString();
  };

  // Handle both old message format and new transaction format
  const isTransaction = message.attributes !== undefined;

  if (isTransaction) {
    return (
      <div className={css.messageDetailOverlay} onClick={onClose}>
        <div className={css.messageDetailPanel} onClick={e => e.stopPropagation()}>
          <div className={css.messageDetailHeader}>
            <button className={css.messageDetailClose} onClick={onClose}>
              ← Back
            </button>
          </div>
          <div className={css.messageDetailContent}>
            <h3 className={css.messageDetailSubject}>{message.listingTitle}</h3>
            <div className={css.messageDetailMeta}>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>Company:</span>
                <span>{message.providerName}</span>
              </div>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>Status:</span>
                <span className={classNames(css.statusBadgeSmall, {
                  [css.statusBadgeAccepted]: message.status === 'Accepted',
                  [css.statusBadgeDeclined]: message.status === 'Declined',
                  [css.statusBadgePending]: message.status === 'Applied' || message.status === 'Inquiry' || message.status === 'Pending',
                  [css.statusBadgeCompleted]: message.status === 'Completed',
                })}>
                  {message.status}
                </span>
              </div>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>Last Updated:</span>
                <span>{formatFullDate(message.attributes?.lastTransitionedAt)}</span>
              </div>
            </div>
            <div className={css.messageDetailActions}>
              <NamedLink
                name="OrderDetailsPage"
                params={{ id: message.id?.uuid || message.id }}
                className={css.viewDetailsLink}
              >
                View Full Details →
              </NamedLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Legacy message format support
  return (
    <div className={css.messageDetailOverlay} onClick={onClose}>
      <div className={css.messageDetailPanel} onClick={e => e.stopPropagation()}>
        <div className={css.messageDetailHeader}>
          <button className={css.messageDetailClose} onClick={onClose}>
            ← Back to Messages
          </button>
        </div>
        <div className={css.messageDetailContent}>
          <h3 className={css.messageDetailSubject}>{message.subject || 'Message'}</h3>
          <div className={css.messageDetailMeta}>
            <div className={css.messageDetailMetaRow}>
              <span className={css.messageDetailLabel}>From:</span>
              <span>{message.senderName}{message.companyName ? ` (${message.companyName})` : ''}</span>
            </div>
            <div className={css.messageDetailMetaRow}>
              <span className={css.messageDetailLabel}>Date:</span>
              <span>{formatFullDate(message.createdAt)}</span>
            </div>
          </div>
          <div className={css.messageDetailBody}>
            {message.preview || message.content}
          </div>
          {message.transactionId && (
            <div className={css.messageDetailActions}>
              <NamedLink
                name="OrderDetailsPage"
                params={{ id: message.transactionId }}
                className={css.viewDetailsLink}
              >
                View Full Conversation
              </NamedLink>
            </div>
          )}
        </div>
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
  const [activeTab, setActiveTab] = useState('browse');
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [institutionInfo, setInstitutionInfo] = useState(null);
  const [isLoadingInstitution, setIsLoadingInstitution] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [statDetailModal, setStatDetailModal] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

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

  // Note: Available projects are fetched from the SearchPage via SDK
  // For the dashboard, we'll show a simplified browse experience with a link to full search
  useEffect(() => {
    // For now, set loading to false since we'll link to the full search page
    // In a future iteration, we could fetch featured/recent listings via an API endpoint
    setIsLoadingProjects(false);
    setAvailableProjects([]);
  }, []);

  // Fetch student's transactions (applications/orders)
  useEffect(() => {
    const fetchStudentTransactions = async () => {
      setIsLoading(true);
      try {
        const baseUrl = apiBaseUrl();
        // Fetch student's transactions (as customer)
        const response = await fetch(`${baseUrl}/api/transactions/query?only=order&perPage=50`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const txList = data.data || [];
          setTransactions(txList);

          // Process transactions into active, invites, and history
          const active = [];
          const invites = [];
          const completed = [];

          txList.forEach(tx => {
            const lastTransition = tx.attributes?.lastTransition || '';
            const projectData = {
              id: tx.id?.uuid || tx.id,
              transactionId: tx.id?.uuid || tx.id,
              title: tx.listing?.attributes?.title || 'Unknown Project',
              companyName: tx.provider?.attributes?.profile?.displayName || 'Unknown Company',
              description: tx.listing?.attributes?.description || '',
              status: lastTransition.includes('accept') ? 'active' :
                      lastTransition.includes('complete') ? 'completed' :
                      lastTransition.includes('invite') ? 'invited' : 'pending',
              startDate: tx.attributes?.createdAt,
              compensation: tx.listing?.attributes?.publicData?.compensation || '',
            };

            if (lastTransition.includes('complete') || lastTransition.includes('review')) {
              completed.push({ ...projectData, status: 'completed' });
            } else if (lastTransition.includes('accept')) {
              active.push({ ...projectData, status: 'active' });
            } else if (lastTransition.includes('invite')) {
              invites.push({ ...projectData, status: 'invited' });
            } else if (lastTransition.includes('request-project-application') || lastTransition.includes('inquire')) {
              active.push({ ...projectData, status: 'pending' });
              setHasAppliedToProject(true);
            }
          });

          setProjects({ active, invites, history: completed });
          setMessages(txList); // Use transactions as messages for the messages tab
        }
      } catch (error) {
        console.error('Failed to fetch student transactions:', error);
        setProjects({ active: [], invites: [], history: [] });
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchStudentTransactions();
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

  // Handle accepting an invite
  const handleAcceptInvite = async (project) => {
    try {
      // Use the transitionTransaction API to accept the invite
      const response = await transitionTransaction({
        transactionId: project.transactionId,
        transition: 'transition/accept',
      });

      if (response) {
        // Move the project from invites to active
        setProjects(prev => ({
          ...prev,
          invites: prev.invites.filter(p => p.id !== project.id),
          active: [...prev.active, { ...project, status: 'active' }],
        }));
        // Redirect to project workspace
        history.push(`/project-workspace/${project.transactionId}`);
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
      throw error;
    }
  };

  // Handle declining an invite
  const handleDeclineInvite = async (project) => {
    try {
      // Use the transitionTransaction API to decline the invite
      const response = await transitionTransaction({
        transactionId: project.transactionId,
        transition: 'transition/decline',
      });

      if (response) {
        // Remove the project from invites
        setProjects(prev => ({
          ...prev,
          invites: prev.invites.filter(p => p.id !== project.id),
        }));
      }
    } catch (error) {
      console.error('Failed to decline invite:', error);
      throw error;
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
        onKeyPress={(e) => e.key === 'Enter' && handleClick()}
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
      label: 'Complete your profile',
      description: 'Add your university, major, skills, and bio',
      completed: hasProfileComplete,
      link: { name: 'ProfileSettingsPage' },
    },
    {
      id: 'photo',
      label: 'Upload a profile photo',
      description: 'Help corporate partners put a face to your name',
      completed: !!profilePicture,
      link: { name: 'ProfileSettingsPage' },
    },
    {
      id: 'skills',
      label: 'Add your skills',
      description: 'Highlight what makes you unique',
      completed: hasSkills,
      link: { name: 'ProfileSettingsPage' },
    },
    {
      id: 'browse',
      label: 'Browse available projects',
      description: 'Discover opportunities that match your interests',
      completed: hasAppliedToProject || totalActiveProjects > 0 || totalInvites > 0,
      link: { name: 'SearchPage' },
    },
    {
      id: 'apply',
      label: 'Apply to your first project',
      description: 'Take the first step towards real-world experience',
      completed: hasAppliedToProject || totalActiveProjects > 0 || hasCompletedProject,
      link: { name: 'SearchPage' },
    },
  ];

  const showOnboarding = !onboardingDismissed && !isLoading;

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

          {/* Onboarding Checklist */}
          {showOnboarding && (
            <OnboardingChecklist
              title="Get Started with Street2Ivy"
              subtitle="Complete these steps to make the most of your experience"
              items={onboardingItems}
              variant="student"
              onDismiss={() => setOnboardingDismissed(true)}
            />
          )}

          {/* Stats Cards - Clickable to show detail modal */}
          <div className={css.statsGrid}>
            <div
              className={classNames(css.statCard, css.statCardClickable)}
              onClick={() => handleStatClick('activeProjects')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleStatClick('activeProjects')}
            >
              <span className={css.statIcon}>📋</span>
              <div className={css.statContent}>
                <span className={css.statValue}>{totalActiveProjects}</span>
                <span className={css.statLabel}>Active Projects</span>
              </div>
              <span className={css.statArrow}>→</span>
            </div>
            <div
              className={classNames(css.statCard, css.statCardClickable)}
              onClick={() => handleStatClick('invites')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleStatClick('invites')}
            >
              <span className={css.statIcon}>✉️</span>
              <div className={css.statContent}>
                <span className={css.statValue}>{totalInvites}</span>
                <span className={css.statLabel}>Pending Invites</span>
              </div>
              <span className={css.statArrow}>→</span>
            </div>
            <div
              className={classNames(css.statCard, css.statCardClickable)}
              onClick={() => handleStatClick('messages')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleStatClick('messages')}
            >
              <span className={css.statIcon}>💬</span>
              <div className={css.statContent}>
                <span className={css.statValue}>{unreadMessages}</span>
                <span className={css.statLabel}>Unread Messages</span>
              </div>
              <span className={css.statArrow}>→</span>
            </div>
            <div
              className={classNames(css.statCard, css.statCardClickable)}
              onClick={() => handleStatClick('history')}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleStatClick('history')}
            >
              <span className={css.statIcon}>🏆</span>
              <div className={css.statContent}>
                <span className={css.statValue}>{projects.history.length}</span>
                <span className={css.statLabel}>Completed Projects</span>
              </div>
              <span className={css.statArrow}>→</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={css.tabNavigation}>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'browse' })}
              onClick={() => setActiveTab('browse')}
            >
              <span className={css.tabIcon}>🔍</span>
              Browse Projects
              {availableProjects.length > 0 && (
                <span className={css.tabBadge}>{availableProjects.length}</span>
              )}
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'projects' })}
              onClick={() => setActiveTab('projects')}
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
              Completed
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
            {/* Browse Projects Tab */}
            {activeTab === 'browse' && (
              <BrowseProjectsPanel
                projects={availableProjects}
                isLoading={isLoadingProjects}
              />
            )}

            {/* My Applications Tab */}
            {activeTab === 'projects' && (
              <div className={css.projectsSection}>
                {isLoading ? (
                  <div className={css.loadingState}>
                    <span className={css.spinner}></span>
                    Loading your applications...
                  </div>
                ) : projects.active.length > 0 ? (
                  <div className={css.projectsGrid}>
                    {projects.active.map(project => (
                      <ProjectCard key={project.id} project={project} type="active" />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="📋"
                    title="No Applications Yet"
                    description="You haven't applied to any projects yet. Browse available opportunities and apply to get started!"
                    actionLink="SearchPage"
                    actionText="Browse Opportunities"
                  />
                )}
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

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className={css.messagesSection}>
                <div className={css.messagesSectionHeader}>
                  <h3 className={css.messagesSectionTitle}>Your Messages & Applications</h3>
                  <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.viewAllMessagesLink}>
                    View All in Inbox →
                  </NamedLink>
                </div>

                {/* Messages CTA Card */}
                <div className={css.messagesCTACard}>
                  <div className={css.messagesCTAContent}>
                    <div className={css.messagesCTAIcon}>💬</div>
                    <div className={css.messagesCTAInfo}>
                      <h4 className={css.messagesCTATitle}>Message Center</h4>
                      <p className={css.messagesCTADescription}>
                        View and manage all your conversations with corporate partners.
                        Track application status, respond to inquiries, and stay connected.
                      </p>
                    </div>
                  </div>
                  <div className={css.messagesCTAActions}>
                    <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.viewInboxButton}>
                      <span>📥</span>
                      Open Inbox
                    </NamedLink>
                  </div>
                </div>

                {/* Transaction Summary */}
                {transactions.length > 0 ? (
                  <div className={css.transactionSummary}>
                    <h4 className={css.transactionSummaryTitle}>Recent Activity</h4>
                    <MessagesPanel
                      transactions={transactions.slice(0, 5)}
                      isLoading={isLoading}
                      onSelectMessage={setSelectedMessage}
                    />
                    {transactions.length > 5 && (
                      <div className={css.viewMoreLink}>
                        <NamedLink name="InboxPage" params={{ tab: 'orders' }}>
                          View all {transactions.length} conversations →
                        </NamedLink>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={css.noMessagesCard}>
                    <span className={css.noMessagesIcon}>📭</span>
                    <h4 className={css.noMessagesTitle}>No Messages Yet</h4>
                    <p className={css.noMessagesText}>
                      When you apply to projects or receive invitations,
                      your conversations will appear here.
                    </p>
                    <NamedLink name="SearchPage" className={css.browseProjectsLink}>
                      Browse Projects to Get Started
                    </NamedLink>
                  </div>
                )}

                {/* Message Detail Modal */}
                {selectedMessage && (
                  <MessageDetailModal
                    message={selectedMessage}
                    onClose={() => setSelectedMessage(null)}
                  />
                )}
              </div>
            )}
          </div>

          {/* AI Coaching Premium Section */}
          {!isLoadingInstitution && (
            <div className={css.aiCoachingSection}>
              {institutionInfo?.aiCoachingEnabled ? (
                // Active AI Coaching Card
                <div className={css.aiCoachingCard}>
                  <div className={css.aiCoachingContent}>
                    <div className={css.aiCoachingInfo}>
                      <div className={css.aiCoachingHeader}>
                        <span className={css.aiCoachingIcon}>🤖</span>
                        <h2 className={css.aiCoachingTitle}>Your AI Career Coach</h2>
                      </div>
                      <p className={css.aiCoachingDescription}>
                        Get personalized career guidance powered by AI. Practice interviews, refine your resume, explore career paths, and develop professional skills.
                      </p>
                      <div className={css.aiCoachingFeatures}>
                        <span className={css.aiCoachingFeature}><span>📝</span> Resume Review</span>
                        <span className={css.aiCoachingFeature}><span>🎯</span> Interview Prep</span>
                        <span className={css.aiCoachingFeature}><span>🚀</span> Career Pathing</span>
                        <span className={css.aiCoachingFeature}><span>💡</span> Skill Development</span>
                      </div>

                      {/* Confidentiality Warning Banner */}
                      <div className={css.confidentialityBanner}>
                        <span className={css.bannerIcon}>⚠️</span>
                        <div className={css.bannerContent}>
                          <p className={css.bannerTitle}>Confidentiality Notice</p>
                          <p className={css.bannerText}>
                            Do not share proprietary, confidential, or trade secret information from any project or company engagement in AI coaching sessions. Violations may result in removal from the platform.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={css.aiCoachingActions}>
                      <button className={css.launchCoachingButton} onClick={handleAICoachingClick}>
                        <span>✨</span>
                        Start Coaching Session
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Locked AI Coaching Card
                <div className={classNames(css.aiCoachingCard, css.aiCoachingCardLocked)}>
                  <div className={css.aiCoachingContent}>
                    <div className={css.aiCoachingInfo}>
                      <div className={css.aiCoachingHeader}>
                        <span className={css.aiCoachingIcon}>🔒</span>
                        <h2 className={css.aiCoachingTitle}>AI Career Coaching</h2>
                      </div>
                      <p className={css.aiCoachingDescription}>
                        AI Career Coaching is available when your institution activates this feature. Encourage your school to partner with Street2Ivy to unlock personalized coaching.
                      </p>
                      <p className={css.lockedMessage}>
                        When activated, you'll get access to resume reviews, interview practice, career path exploration, and skill development — all powered by AI.
                      </p>
                    </div>

                    <div className={css.aiCoachingActions}>
                      <a
                        href="mailto:careerservices@university.edu?subject=Request%20AI%20Career%20Coaching%20from%20Street2Ivy&body=Dear%20Career%20Services%2C%0A%0AI%20recently%20discovered%20that%20Street2Ivy%20offers%20AI-powered%20career%20coaching%20for%20students%2C%20including%20resume%20reviews%2C%20interview%20practice%2C%20and%20career%20path%20guidance.%0A%0AI%20believe%20this%20would%20be%20a%20valuable%20resource%20for%20our%20student%20body.%20Could%20you%20please%20look%20into%20partnering%20with%20Street2Ivy%20to%20make%20this%20feature%20available%20to%20us%3F%0A%0AThank%20you%20for%20your%20consideration.%0A%0ABest%20regards"
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
