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
    </div>
  );
};

// ================ Message Center Component ================ //

const MessageCenter = ({ transactions, isLoading, onSelectMessage, currentUserId, institutionInfo }) => {
  const history = useHistory();
  const [activeMessageTab, setActiveMessageTab] = useState('received');
  const [showNewMessageDropdown, setShowNewMessageDropdown] = useState(false);

  const formatDate = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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

  // Get unique corporate partners from transactions
  const getEngagedPartners = () => {
    if (!transactions || transactions.length === 0) return [];

    const partnersMap = new Map();
    transactions.forEach(tx => {
      const providerId = tx.provider?.id?.uuid;
      const providerName = tx.provider?.attributes?.profile?.displayName || 'Unknown Company';
      const transactionId = tx.id?.uuid || tx.id;

      if (providerId && !partnersMap.has(providerId)) {
        partnersMap.set(providerId, {
          id: providerId,
          name: providerName,
          transactionId, // Link to an existing transaction for messaging
        });
      }
    });

    return Array.from(partnersMap.values());
  };

  const engagedPartners = getEngagedPartners();

  // Handle clicking on a partner to message them
  const handleMessagePartner = (partner) => {
    setShowNewMessageDropdown(false);
    // Navigate to the transaction/order details page where they can send messages
    history.push(`/order/${partner.transactionId}/details`);
  };

  // Handle messaging school admin
  const handleMessageSchoolAdmin = () => {
    setShowNewMessageDropdown(false);
    // If institution has contact info, use mailto
    if (institutionInfo?.adminEmail) {
      window.location.href = `mailto:${institutionInfo.adminEmail}?subject=Student%20Inquiry%20from%20ProveGround`;
    } else {
      // Fallback to a generic career services email
      window.location.href = `mailto:careerservices@${institutionInfo?.domain || 'university.edu'}?subject=Student%20Inquiry%20from%20ProveGround`;
    }
  };

  // Categorize messages as sent (initiated by student) or received (initiated by company)
  const categorizeMessages = () => {
    if (!transactions || transactions.length === 0) {
      return { received: [], sent: [] };
    }

    const received = [];
    const sent = [];

    transactions.forEach(tx => {
      const lastTransition = tx.attributes?.lastTransition || '';
      const providerName = tx.provider?.attributes?.profile?.displayName || 'Unknown Company';
      const listingTitle = tx.listing?.attributes?.title || 'Unknown Project';
      const status = getTransactionStatus(tx);
      const lastUpdated = tx.attributes?.lastTransitionedAt;
      const createdAt = tx.attributes?.createdAt;

      const messageData = {
        ...tx,
        providerName,
        listingTitle,
        status,
        lastUpdated,
        createdAt,
      };

      // If the student applied or inquired, it's a sent message
      // If it was an invite from corporate partner, it's received
      if (lastTransition.includes('inquire') || lastTransition.includes('request-project-application')) {
        sent.push(messageData);
      } else if (lastTransition.includes('invite')) {
        received.push(messageData);
      } else {
        // For accept/decline/complete, check who initiated the transaction
        // Default to received since most actions come from corporate partners
        received.push(messageData);
      }
    });

    // Sort by date (most recent first)
    received.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    sent.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    return { received, sent };
  };

  const { received, sent } = categorizeMessages();
  const activeMessages = activeMessageTab === 'received' ? received : sent;

  if (isLoading) {
    return (
      <div className={css.messageCenterLoading}>
        <span className={css.spinner}></span>
        Loading messages...
      </div>
    );
  }

  const renderMessageTable = (messages, type) => {
    if (messages.length === 0) {
      return (
        <div className={css.noMessagesState}>
          <span className={css.noMessagesStateIcon}>{type === 'received' ? '📥' : '📤'}</span>
          <p className={css.noMessagesStateText}>
            {type === 'received'
              ? 'No messages received yet. Companies will contact you when they\'re interested in your profile.'
              : 'No messages sent yet. Apply to projects or send inquiries to get started.'}
          </p>
        </div>
      );
    }

    return (
      <div className={css.messageTableContainer}>
        <table className={css.messageTable}>
          <thead>
            <tr>
              <th className={css.messageTableHeader}>
                {type === 'received' ? 'From' : 'To'}
              </th>
              <th className={css.messageTableHeader}>Subject / Project</th>
              <th className={css.messageTableHeader}>Status</th>
              <th className={css.messageTableHeader}>Date</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(msg => (
              <tr
                key={msg.id?.uuid || msg.id}
                className={css.messageTableRow}
                onClick={() => onSelectMessage(msg)}
              >
                <td className={css.messageTableCell}>
                  <div className={css.messageRecipient}>
                    <span className={css.messageRecipientAvatar}>
                      {msg.providerName.charAt(0).toUpperCase()}
                    </span>
                    <span className={css.messageRecipientName}>{msg.providerName}</span>
                  </div>
                </td>
                <td className={css.messageTableCell}>
                  <span className={css.messageSubject}>{msg.listingTitle}</span>
                </td>
                <td className={css.messageTableCell}>
                  <span className={classNames(css.messageStatusBadge, {
                    [css.messageStatusAccepted]: msg.status === 'Accepted',
                    [css.messageStatusDeclined]: msg.status === 'Declined',
                    [css.messageStatusPending]: msg.status === 'Applied' || msg.status === 'Inquiry' || msg.status === 'Pending',
                    [css.messageStatusCompleted]: msg.status === 'Completed' || msg.status === 'Reviewed',
                  })}>
                    {msg.status}
                  </span>
                </td>
                <td className={css.messageTableCell}>
                  <span className={css.messageDate}>{formatDate(msg.lastUpdated)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={css.messageCenter}>
      {/* Message Center Header */}
      <div className={css.messageCenterHeader}>
        <h3 className={css.messageCenterTitle}>
          <span className={css.messageCenterIcon}>💬</span>
          Message Center
        </h3>
        <div className={css.newMessageWrapper}>
          <button
            className={css.composeMessageButton}
            onClick={() => setShowNewMessageDropdown(!showNewMessageDropdown)}
          >
            <span>✉️</span>
            New Message
            <span className={css.dropdownArrow}>{showNewMessageDropdown ? '▲' : '▼'}</span>
          </button>

          {showNewMessageDropdown && (
            <div className={css.newMessageDropdown}>
              <div className={css.dropdownSection}>
                <div className={css.dropdownSectionTitle}>Corporate Partners</div>
                {engagedPartners.length > 0 ? (
                  engagedPartners.map(partner => (
                    <button
                      key={partner.id}
                      className={css.dropdownItem}
                      onClick={() => handleMessagePartner(partner)}
                    >
                      <span className={css.dropdownItemAvatar}>
                        {partner.name.charAt(0).toUpperCase()}
                      </span>
                      <span className={css.dropdownItemName}>{partner.name}</span>
                    </button>
                  ))
                ) : (
                  <div className={css.dropdownEmpty}>
                    No corporate partners yet. Apply to projects to connect!
                  </div>
                )}
              </div>

              <div className={css.dropdownDivider}></div>

              <div className={css.dropdownSection}>
                <div className={css.dropdownSectionTitle}>School Administrator</div>
                <button
                  className={css.dropdownItem}
                  onClick={handleMessageSchoolAdmin}
                >
                  <span className={css.dropdownItemAvatar}>🎓</span>
                  <span className={css.dropdownItemName}>
                    {institutionInfo?.name || 'Career Services'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Tabs */}
      <div className={css.messageTabs}>
        <button
          className={classNames(css.messageTab, { [css.messageTabActive]: activeMessageTab === 'received' })}
          onClick={() => setActiveMessageTab('received')}
        >
          <span className={css.messageTabIcon}>📥</span>
          Received
          {received.length > 0 && (
            <span className={css.messageTabCount}>{received.length}</span>
          )}
        </button>
        <button
          className={classNames(css.messageTab, { [css.messageTabActive]: activeMessageTab === 'sent' })}
          onClick={() => setActiveMessageTab('sent')}
        >
          <span className={css.messageTabIcon}>📤</span>
          Sent
          {sent.length > 0 && (
            <span className={css.messageTabCount}>{sent.length}</span>
          )}
        </button>
      </div>

      {/* Message List */}
      <div className={css.messageListContainer}>
        {renderMessageTable(activeMessages, activeMessageTab)}
      </div>
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
              title="Get Started with ProveGround"
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
              onClick={() => setActiveTab('browse')}
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
            <NamedLink name="SearchCompaniesPage" className={css.tabLink}>
              <span className={css.tabIcon}>🏢</span>
              Search Companies
            </NamedLink>
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
                <MessageCenter
                  transactions={transactions}
                  isLoading={isLoading}
                  onSelectMessage={setSelectedMessage}
                  currentUserId={currentUser?.id?.uuid}
                  institutionInfo={institutionInfo}
                />

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
                          AI Career Coaching is available when your institution activates this feature. Encourage your school to partner with ProveGround to unlock personalized coaching.
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
                          href="mailto:careerservices@university.edu?subject=Request%20AI%20Career%20Coaching%20from%20ProveGround"
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
